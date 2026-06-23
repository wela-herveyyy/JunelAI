import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { validateSidSession } from "../auth/sid-session.js";
import {
  createMcpServer,
  createSessionContext,
  type ServerContext,
} from "../create-server.js";
import type { Logger } from "../utils/logger.js";

export interface HttpTransportOptions {
  host: string;
  port: number;
  path: string;
  requireSidAuth: boolean;
  erpnextUrl: string;
}

const LOCALHOST_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function readBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length).trim();
}

function unauthorized(res: Response, message = "Unauthorized"): void {
  res.status(401).json({
    jsonrpc: "2.0",
    error: { code: -32001, message },
    id: null,
  });
}

function rejectJsonRpc(
  res: Response,
  status: number,
  code: number,
  message: string
): void {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
}

export function isPublicHttpBind(host: string): boolean {
  return !LOCALHOST_HOSTS.has(host);
}

export async function startHttpTransport(
  ctx: ServerContext,
  options: HttpTransportOptions
): Promise<void> {
  const { host, port, path, requireSidAuth, erpnextUrl } = options;
  const { logger } = ctx;
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sessionSids = new Map<string, string>();

  const authenticateBearer = async (
    req: Request,
    res: Response,
    mcpSessionId?: string
  ): Promise<string | null> => {
    if (!requireSidAuth) {
      return readBearerToken(req) || process.env.ERPNEXT_SID || null;
    }

    const bearerSid = readBearerToken(req);
    if (!bearerSid) {
      unauthorized(
        res,
        "Missing Authorization: Bearer <ERPNEXT_SID>. Get sid from npm run setup-sid"
      );
      return null;
    }

    if (mcpSessionId) {
      const boundSid = sessionSids.get(mcpSessionId);
      if (boundSid && boundSid === bearerSid) {
        return bearerSid;
      }
    }

    try {
      const session = await validateSidSession(erpnextUrl, bearerSid);
      return session.sid;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid ERPNext session";
      unauthorized(res, message);
      return null;
    }
  };

  const connectServer = async (
    sessionCtx: ServerContext,
    transport: StreamableHTTPServerTransport
  ): Promise<Server> => {
    const server = createMcpServer(sessionCtx);
    await server.connect(transport);
    return server;
  };

  const handlePost = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const body = req.body;

    try {
      if (sessionId && transports.has(sessionId)) {
        const sid = await authenticateBearer(req, res, sessionId);
        if (!sid) return;

        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, body);
        return;
      }

      if (!sessionId && isInitializeRequest(body)) {
        const bearerSid = await authenticateBearer(req, res);
        if (requireSidAuth && !bearerSid) return;

        let sessionCtx = ctx;
        if (bearerSid) {
          const validated = await validateSidSession(erpnextUrl, bearerSid);
          sessionCtx = await createSessionContext(ctx.logger, validated);
        }

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport);
            if (bearerSid) {
              sessionSids.set(id, bearerSid);
            }
          },
        });

        transport.onclose = () => {
          const id = transport.sessionId;
          if (id) {
            transports.delete(id);
            sessionSids.delete(id);
          }
        };

        await connectServer(sessionCtx, transport);
        await transport.handleRequest(req, res, body);
        return;
      }

      if (sessionId) {
        rejectJsonRpc(res, 404, -32001, "Session not found");
        return;
      }

      rejectJsonRpc(res, 400, -32000, "Bad Request: invalid session");
    } catch (error) {
      logger.error("HTTP MCP request failed", error);
      if (!res.headersSent) {
        rejectJsonRpc(res, 500, -32603, "Internal server error");
      }
    }
  };

  const handleGet = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).send("Missing session ID");
      return;
    }

    const sid = await authenticateBearer(req, res, sessionId);
    if (requireSidAuth && !sid) return;

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).send("Session not found");
      return;
    }

    await transport.handleRequest(req, res);
  };

  const handleDelete = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).send("Missing session ID");
      return;
    }

    const sid = await authenticateBearer(req, res, sessionId);
    if (requireSidAuth && !sid) return;

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).send("Session not found");
      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      logger.error("HTTP MCP session termination failed", error);
      if (!res.headersSent) {
        res.status(500).send("Error processing session termination");
      }
    }
  };

  const app = createMcpExpressApp({ host });
  app.post(path, handlePost);
  app.get(path, handleGet);
  app.delete(path, handleDelete);

  await new Promise<void>((resolve, reject) => {
    app.listen(port, host, (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  const url = `http://${displayHost}:${port}${path}`;
  logger.info(`ERPNext MCP server running on ${url}`);
  if (requireSidAuth) {
    logger.info("HTTP auth: Authorization Bearer <ERPNEXT_SID> required");
  }

  const shutdown = async (signal: string, log: Logger) => {
    log.info(`Shutting down (${signal})...`);
    for (const [sessionId, transport] of transports) {
      try {
        await transport.close();
      } catch (error) {
        log.error(`Failed to close session ${sessionId}`, error);
      }
    }
    transports.clear();
    sessionSids.clear();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT", logger));
  process.on("SIGTERM", () => void shutdown("SIGTERM", logger));
}

export function resolveHttpOptions(argv: string[] = process.argv): HttpTransportOptions {
  let host = process.env.MCP_HOST || "127.0.0.1";
  let port = Number.parseInt(
    process.env.MCP_PORT || process.env.PORT || "3100",
    10
  );
  let path = process.env.MCP_PATH || "/mcp";
  const erpnextUrl = process.env.ERPNEXT_URL || "";

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--host" && argv[i + 1]) {
      host = argv[++i];
    } else if (arg === "--port" && argv[i + 1]) {
      port = Number.parseInt(argv[++i], 10);
    } else if (arg === "--path" && argv[i + 1]) {
      path = argv[++i];
    }
  }

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  const requireSidAuth =
    process.env.MCP_REQUIRE_SID_AUTH === "1" ||
    process.env.MCP_REQUIRE_SID_AUTH === "true" ||
    isPublicHttpBind(host);

  return { host, port, path, requireSidAuth, erpnextUrl };
}

export function isHttpTransportRequested(argv: string[] = process.argv): boolean {
  if (process.env.MCP_TRANSPORT === "http") return true;
  return argv.includes("--http");
}
