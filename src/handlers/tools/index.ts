import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ERPNextClient } from "../../client/erpnext-client.js";
import type { DocTypeCacheManager } from "../../doctype-cache/index.js";
import type { UserProfileManager } from "../../profile/index.js";
import { TOOL_DEFINITIONS } from "./definitions.js";
import { handleToolCall } from "./handlers.js";

export function registerToolHandlers(
  server: Server,
  erpnext: ERPNextClient,
  profile: UserProfileManager,
  doctypeCache: DocTypeCacheManager
): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS.map((tool) => ({ ...tool })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    handleToolCall(
      request.params.name,
      request.params.arguments as Record<string, unknown> | undefined,
      erpnext,
      profile,
      doctypeCache
    )
  );
}
