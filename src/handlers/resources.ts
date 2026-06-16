import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ERPNextClient } from "../client/erpnext-client.js";
import { AUTH_SETUP_HINT } from "../constants.js";

export function registerResourceHandlers(
  server: Server,
  erpnext: ERPNextClient
): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "erpnext://DocTypes",
        name: "All DocTypes",
        mimeType: "application/json",
        description:
          "List of all available DocTypes in the ERPNext instance",
      },
    ],
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
      {
        uriTemplate: "erpnext://{doctype}/{name}",
        name: "ERPNext Document",
        mimeType: "application/json",
        description: "Fetch an ERPNext document by doctype and name",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (!erpnext.isAuthenticated()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Not authenticated with ERPNext. ${AUTH_SETUP_HINT} Or configure API keys / ERPNEXT_CREDENTIALS_FILE.`
      );
    }

    const uri = request.params.uri;
    let result: unknown;

    if (uri === "erpnext://DocTypes") {
      try {
        const doctypes = await erpnext.getAllDocTypes();
        result = { doctypes };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to fetch DocTypes: ${message}`
        );
      }
    } else {
      const documentMatch = uri.match(/^erpnext:\/\/([^/]+)\/(.+)$/);
      if (documentMatch) {
        const doctype = decodeURIComponent(documentMatch[1]);
        const name = decodeURIComponent(documentMatch[2]);

        try {
          result = await erpnext.getDocument(doctype, name);
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Failed to fetch ${doctype} ${name}: ${message}`
          );
        }
      }
    }

    if (!result) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid ERPNext resource URI: ${uri}`
      );
    }

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });
}
