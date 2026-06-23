import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  createMcpServer,
  createServerContext,
  logToolCount,
} from "./create-server.js";
import {
  isHttpTransportRequested,
  resolveHttpOptions,
  startHttpTransport,
} from "./transport/http.js";

export async function startServer(): Promise<void> {
  const ctx = await createServerContext();

  if (isHttpTransportRequested()) {
    await startHttpTransport(ctx, resolveHttpOptions());
    return;
  }

  const server = createMcpServer(ctx);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logToolCount(ctx.logger, "stdio");
}
