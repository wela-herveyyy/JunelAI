import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { validateSidSession } from "../auth/sid-session.js";
import {
  ERPNEXT_URL_SETUP_HINT,
  readErpnextUrlHeader,
  resolveErpnextUrlFromProcessEnv,
} from "../config/erpnext-url.js";
import {
  createMcpServer,
  createSessionContext,
} from "../create-server.js";
import { loadCredentialsIntoEnv } from "../config/credentials.js";
import type { Logger } from "../utils/logger.js";

export interface HttpGatewayContext {
  logger: Logger;
}

export interface HttpTransportOptions {
  host: string;
  port: number;
  path: string;
  requireSidAuth: boolean;
  /** Optional server default when clients omit X-ERPNext-URL (legacy / single-tenant). */
  defaultErpnextUrl: string;
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
  ctx: HttpGatewayContext,
  options: HttpTransportOptions
): Promise<void> {
  const { host, port, path, requireSidAuth, defaultErpnextUrl } = options;
  const { logger } = ctx;
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sessionSids = new Map<string, string>();
  const sessionBaseUrls = new Map<string, string>();

  const resolveBaseUrl = (
    req: Request,
    mcpSessionId?: string
  ): string | undefined => {
    const fromHeader = readErpnextUrlHeader(req.headers);
    if (fromHeader) return fromHeader;
    if (mcpSessionId) {
      const bound = sessionBaseUrls.get(mcpSessionId);
      if (bound) return bound;
    }
    return defaultErpnextUrl || undefined;
  };

  const authenticateBearer = async (
    req: Request,
    res: Response,
    mcpSessionId?: string
  ): Promise<{ sid: string; baseUrl: string } | null> => {
    const baseUrl = resolveBaseUrl(req, mcpSessionId);
    if (!baseUrl) {
      unauthorized(res, ERPNEXT_URL_SETUP_HINT);
      return null;
    }

    if (!requireSidAuth) {
      const sid = readBearerToken(req) || process.env.ERPNEXT_SID || "";
      return sid ? { sid, baseUrl } : { sid: "", baseUrl };
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
      const boundUrl = sessionBaseUrls.get(mcpSessionId);
      if (boundSid === bearerSid && boundUrl === baseUrl) {
        return { sid: bearerSid, baseUrl };
      }
    }

    try {
      const session = await validateSidSession(baseUrl, bearerSid);
      return { sid: session.sid, baseUrl };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid ERPNext session";
      unauthorized(res, message);
      return null;
    }
  };

  const connectServer = async (
    sessionCtx: Awaited<ReturnType<typeof createSessionContext>>,
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
        const auth = await authenticateBearer(req, res, sessionId);
        if (!auth) return;
        if (requireSidAuth && !auth.sid) return;

        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, body);
        return;
      }

      if (!sessionId && isInitializeRequest(body)) {
        const auth = await authenticateBearer(req, res);
        if (!auth) return;
        if (requireSidAuth && !auth.sid) return;

        const { sid, baseUrl } = auth;
        let sessionCtx: Awaited<ReturnType<typeof createSessionContext>> | null =
          null;

        let effectiveSid = sid;
        let effectiveBaseUrl = baseUrl;

        if (!effectiveSid && !requireSidAuth) {
          await loadCredentialsIntoEnv();
          effectiveSid = process.env.ERPNEXT_SID || "";
          if (!effectiveBaseUrl) {
            effectiveBaseUrl = resolveErpnextUrlFromProcessEnv() || "";
          }
        }

        if (effectiveSid && effectiveBaseUrl) {
          const validated = await validateSidSession(
            effectiveBaseUrl,
            effectiveSid
          );
          sessionCtx = await createSessionContext(
            ctx.logger,
            validated,
            effectiveBaseUrl
          );
        } else {
          unauthorized(res, ERPNEXT_URL_SETUP_HINT);
          return;
        }

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport);
            if (effectiveSid) {
              sessionSids.set(id, effectiveSid);
              sessionBaseUrls.set(id, effectiveBaseUrl);
            }
          },
        });

        transport.onclose = () => {
          const id = transport.sessionId;
          if (id) {
            transports.delete(id);
            sessionSids.delete(id);
            sessionBaseUrls.delete(id);
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

    const auth = await authenticateBearer(req, res, sessionId);
    if (requireSidAuth && !auth?.sid) return;

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

    const auth = await authenticateBearer(req, res, sessionId);
    if (requireSidAuth && !auth?.sid) return;

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
    logger.info(
      "HTTP auth: Authorization Bearer <ERPNEXT_SID> + X-ERPNext-URL header required"
    );
  } else {
    logger.info(
      "HTTP: set X-ERPNext-URL header per school (optional default from X_ERPNEXT_URL env)"
    );
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
    sessionBaseUrls.clear();
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
  const defaultErpnextUrl = resolveErpnextUrlFromProcessEnv() || "";

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

  return { host, port, path, requireSidAuth, defaultErpnextUrl };
}

export function isHttpTransportRequested(argv: string[] = process.argv): boolean {
  if (process.env.MCP_TRANSPORT === "http") return true;
  return argv.includes("--http");
}
