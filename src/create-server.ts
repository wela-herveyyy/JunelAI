import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ERPNextClient } from "./client/erpnext-client.js";
import { loadCredentialsIntoEnv } from "./config/credentials.js";
import { AUTH_SETUP_HINT, SERVER_NAME } from "./constants.js";
import { ERPNEXT_URL_SETUP_HINT } from "./config/erpnext-url.js";
import { registerResourceHandlers } from "./handlers/resources.js";
import { registerToolHandlers } from "./handlers/tools/index.js";
import { getActiveToolDefinitions } from "./handlers/tools/filter.js";
import { UserProfileManager } from "./profile/index.js";
import { DocTypeCacheManager } from "./doctype-cache/index.js";
import { createLogger, type Logger } from "./utils/logger.js";
import type { ValidatedSidSession } from "./auth/sid-session.js";

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

export interface ServerContext {
  logger: Logger;
  erpnext: ERPNextClient;
  profile: UserProfileManager;
  doctypeCache: DocTypeCacheManager;
}

export async function createMinimalContext(): Promise<{ logger: Logger }> {
  return { logger: createLogger() };
}

export async function createServerContext(): Promise<ServerContext> {
  const logger = createLogger();
  const credentialsFile = await loadCredentialsIntoEnv();
  let erpnext: ERPNextClient;
  try {
    erpnext = new ERPNextClient(logger);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ERPNEXT_URL_SETUP_HINT;
    throw new Error(message);
  }

  erpnext.setCredentialsFile(credentialsFile);
  await erpnext.initializeAuth();

  const profile = new UserProfileManager(erpnext);
  await profile.initialize();

  const doctypeCache = new DocTypeCacheManager(erpnext);

  if (!erpnext.isAuthenticated()) {
    const authStatus = await erpnext.getAuthStatus();
    logger.warn(
      typeof authStatus.message === "string"
        ? authStatus.message
        : `No auth configured. ${AUTH_SETUP_HINT}`
    );
  }

  return { logger, erpnext, profile, doctypeCache };
}

export async function createSessionContext(
  logger: Logger,
  session: ValidatedSidSession,
  baseUrl: string
): Promise<ServerContext> {
  const erpnext = new ERPNextClient(logger, baseUrl);
  await erpnext.authenticateWithSid(session.sid, session.csrfToken);

  const profile = new UserProfileManager(erpnext);
  await profile.initialize();

  const doctypeCache = new DocTypeCacheManager(erpnext);

  return { logger, erpnext, profile, doctypeCache };
}

export function createMcpServer(ctx: ServerContext): Server {
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

  registerResourceHandlers(server, ctx.erpnext, ctx.profile, ctx.doctypeCache);
  registerToolHandlers(server, ctx.erpnext, ctx.profile, ctx.doctypeCache);

  return server;
}

export function logToolCount(logger: Logger, transportLabel: string): void {
  logger.info(
    `ERPNext MCP server running on ${transportLabel} (${getActiveToolDefinitions().length} tools)`
  );
}
