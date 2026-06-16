import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ERPNextClient } from "./client/erpnext-client.js";
import { loadCredentialsIntoEnv } from "./config/credentials.js";
import { AUTH_SETUP_HINT, SERVER_NAME } from "./constants.js";
import { registerResourceHandlers } from "./handlers/resources.js";
import { registerToolHandlers } from "./handlers/tools/index.js";
import { createLogger } from "./utils/logger.js";

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export async function startServer(): Promise<void> {
  const logger = createLogger();
  const credentialsFile = await loadCredentialsIntoEnv();
  const erpnext = new ERPNextClient(logger);

  erpnext.setCredentialsFile(credentialsFile);
  await erpnext.initializeAuth();

  if (!erpnext.isAuthenticated()) {
    logger.warn(
      `No auth configured. ${AUTH_SETUP_HINT} Or set API keys / ERPNEXT_CREDENTIALS_FILE.`
    );
  }

  const server = new Server(
    {
      name: SERVER_NAME,
      version: readPackageVersion(),
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  registerResourceHandlers(server, erpnext);
  registerToolHandlers(server, erpnext);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("ERPNext MCP server running on stdio");
}
