import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
