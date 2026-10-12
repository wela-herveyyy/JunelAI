import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadCredentialsIntoEnv } from "./config/credentials.js";
import {
  createMcpServer,
  createMinimalContext,
  createServerContext,
  logToolCount,
} from "./create-server.js";
import {
  isHttpTransportRequested,
  resolveHttpOptions,
  startHttpTransport,
} from "./transport/http.js";

export async function startServer(): Promise<void> {
  if (isHttpTransportRequested()) {
    // Load saved defaults only for local binds; hosted sessions use client headers.
    const initialOptions = resolveHttpOptions();
    if (!initialOptions.requireSidAuth) await loadCredentialsIntoEnv();
    const { logger } = await createMinimalContext();
    await startHttpTransport({ logger }, resolveHttpOptions());
    return;
  }

  const ctx = await createServerContext();
  const server = createMcpServer(ctx);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logToolCount(ctx.logger, "stdio");
}
