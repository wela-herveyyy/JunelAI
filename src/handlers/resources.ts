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
import type { DocTypeCacheManager } from "../doctype-cache/index.js";
import type { UserProfileManager } from "../profile/index.js";

export function registerResourceHandlers(
  server: Server,
  erpnext: ERPNextClient,
  profile: UserProfileManager,
  doctypeCache: DocTypeCacheManager
): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "erpnext://user-profile",
        name: "User Profile",
        mimeType: "application/json",
        description:
          "Logged-in user profile (name, position, email, employee) — synced from ERPNext and local overrides",
      },
      {
        uri: "erpnext://doctype-schemas",
        name: "Cached DocType Schemas",
        mimeType: "application/json",
        description: "List of DocTypes with cached field schemas",
      },
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
        uriTemplate: "erpnext://doctype-schema/{doctype}",
        name: "DocType Schema",
        mimeType: "application/json",
        description: "Cached field schema for an ERPNext DocType",
      },
      {
        uriTemplate: "erpnext://{doctype}/{name}",
        name: "ERPNext Document",
        mimeType: "application/json",
        description: "Fetch an ERPNext document by doctype and name",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === "erpnext://user-profile") {
      const result = await profile.get(erpnext.isAuthenticated());
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (uri === "erpnext://doctype-schemas") {
      const result = { doctypes: await doctypeCache.list() };
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    const schemaMatch = uri.match(/^erpnext:\/\/doctype-schema\/(.+)$/);
    if (schemaMatch) {
      const doctype = decodeURIComponent(schemaMatch[1]);
      const result = await doctypeCache.get(doctype, false);
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (!erpnext.isAuthenticated()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Not authenticated with ERPNext. ${AUTH_SETUP_HINT} Or configure API keys / ERPNEXT_CREDENTIALS_FILE.`
      );
    }

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
