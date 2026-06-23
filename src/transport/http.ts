import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Logger } from "../utils/logger.js";
import { createMcpServer } from "../create-server.js";
import type { ServerContext } from "../create-server.js";

export interface HttpTransportOptions {
  host: string;
  port: number;
  path: string;
  authToken?: string;
}

function readBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length).trim();
}

function unauthorized(res: Response): void {
  res.status(401).json({
    jsonrpc: "2.0",
    error: { code: -32001, message: "Unauthorized" },
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

export async function startHttpTransport(
  ctx: ServerContext,
  options: HttpTransportOptions
): Promise<void> {
  const { host, port, path, authToken } = options;
  const { logger } = ctx;
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const requireAuth = (req: Request, res: Response): boolean => {
    if (!authToken) return true;
    if (readBearerToken(req) === authToken) return true;
    unauthorized(res);
    return false;
  };

  const connectServer = async (
    transport: StreamableHTTPServerTransport
  ): Promise<Server> => {
    const server = createMcpServer(ctx);
    await server.connect(transport);
    return server;
  };

  const handlePost = async (req: Request, res: Response): Promise<void> => {
    if (!requireAuth(req, res)) return;

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const body = req.body;

    try {
      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, body);
        return;
      }

      if (!sessionId && isInitializeRequest(body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport);
          },
        });

        transport.onclose = () => {
          const id = transport.sessionId;
          if (id) transports.delete(id);
        };

        await connectServer(transport);
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
    if (!requireAuth(req, res)) return;

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).send("Missing session ID");
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).send("Session not found");
      return;
    }

    await transport.handleRequest(req, res);
  };

  const handleDelete = async (req: Request, res: Response): Promise<void> => {
    if (!requireAuth(req, res)) return;

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).send("Missing session ID");
      return;
    }

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

  const url = `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}${path}`;
  logger.info(`ERPNext MCP server running on ${url}`);
  if (authToken) {
    logger.info("HTTP auth enabled (Bearer token required)");
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
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT", logger));
  process.on("SIGTERM", () => void shutdown("SIGTERM", logger));
}

export function resolveHttpOptions(argv: string[] = process.argv): HttpTransportOptions {
  let host = process.env.MCP_HOST || "127.0.0.1";
  let port = Number.parseInt(process.env.MCP_PORT || "3100", 10);
  let path = process.env.MCP_PATH || "/mcp";
  const authToken = process.env.MCP_AUTH_TOKEN?.trim() || undefined;

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

  return { host, port, path, authToken };
}

export function isHttpTransportRequested(argv: string[] = process.argv): boolean {
  if (process.env.MCP_TRANSPORT === "http") return true;
  return argv.includes("--http");
}
