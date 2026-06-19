import {
  ErrorCode,
  McpError,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { ERPNextClient } from "../../client/erpnext-client.js";
import { AUTH_SETUP_HINT } from "../../constants.js";
import type { DocTypeCacheManager } from "../../doctype-cache/index.js";
import type { UserProfileManager } from "../../profile/index.js";

type ToolArgs = Record<string, unknown> | undefined;

function textResult(text: string, isError = false): CallToolResult {
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

function successDocResult(
  doctype: string,
  result: Record<string, unknown>,
  verbose: boolean
): CallToolResult {
  if (verbose) {
    return textResult(JSON.stringify(result, null, 2));
  }
  return textResult(
    JSON.stringify({
      status: "success",
      doctype,
      name: result.name,
      docstatus: result.docstatus,
    })
  );
}

export async function handleToolCall(
  name: string,
  args: ToolArgs,
  erpnext: ERPNextClient,
  profile: UserProfileManager,
  doctypeCache: DocTypeCacheManager
): Promise<CallToolResult> {
  if (name === "get_user_profile") {
    const sync = args?.sync !== false;
    try {
      const data = await profile.get(sync && erpnext.isAuthenticated());
      return textResult(JSON.stringify(data, null, 2));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return textResult(`Failed to get user profile: ${message}`, true);
    }
  }

  if (name === "update_user_profile") {
    if (!args || Object.keys(args).length === 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "At least one profile field is required"
      );
    }
    try {
      const result = await profile.update(args);
      return textResult(
        JSON.stringify(
          {
            status: "success",
            path: result.path,
            profile: result.profile,
          },
          null,
          2
        )
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return textResult(`Failed to update user profile: ${message}`, true);
    }
  }

  if (name === "check_auth") {
    try {
      const verify = args?.verify !== false;
      const status = await erpnext.getAuthStatus({ verify });
      return textResult(JSON.stringify(status, null, 2), !status.authenticated);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : AUTH_SETUP_HINT;
      return textResult(
        JSON.stringify({ authenticated: false, message }, null, 2),
        true
      );
    }
  }

  if (!erpnext.hasCredentialsConfigured()) {
    return textResult(
      `No ERPNext credentials configured. ${AUTH_SETUP_HINT}`,
      true
    );
  }

  switch (name) {
    case "get_documents": {
      const doctype = String(args?.doctype);
      const fields = args?.fields as string[] | undefined;
      const filters = args?.filters as Record<string, unknown> | undefined;
      const limit = args?.limit as number | undefined;

      if (!doctype) {
        throw new McpError(ErrorCode.InvalidParams, "Doctype is required");
      }

      try {
        const documents = await erpnext.getDocList(
          doctype,
          filters,
          fields,
          limit
        );
        return textResult(JSON.stringify(documents, null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(
          `Failed to get ${doctype} documents: ${message}`,
          true
        );
      }
    }

    case "create_document": {
      const doctype = String(args?.doctype);
      const data = args?.data as Record<string, unknown> | undefined;
      const verbose = args?.verbose === true;

      if (!doctype || !data) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Doctype and data are required"
        );
      }

      try {
        const result = await erpnext.createDocument(doctype, data);
        return successDocResult(doctype, result, verbose);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(`Failed to create ${doctype}: ${message}`, true);
      }
    }

    case "update_document": {
      const doctype = String(args?.doctype);
      const docName = String(args?.name);
      const data = args?.data as Record<string, unknown> | undefined;
      const verbose = args?.verbose === true;

      if (!doctype || !docName || !data) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Doctype, name, and data are required"
        );
      }

      try {
        const result = await erpnext.updateDocument(doctype, docName, data);
        return successDocResult(doctype, result, verbose);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(
          `Failed to update ${doctype} ${docName}: ${message}`,
          true
        );
      }
    }

    case "run_report": {
      const reportName = String(args?.report_name);
      const filters = args?.filters as Record<string, unknown> | undefined;

      if (!reportName) {
        throw new McpError(ErrorCode.InvalidParams, "Report name is required");
      }

      try {
        const result = await erpnext.runReport(reportName, filters);
        return textResult(JSON.stringify(result, null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(
          `Failed to run report ${reportName}: ${message}`,
          true
        );
      }
    }

    case "get_document": {
      const doctype = String(args?.doctype);
      const docName = String(args?.name);

      if (!doctype || !docName) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Doctype and name are required"
        );
      }

      try {
        const document = await erpnext.getDocument(doctype, docName);
        return textResult(JSON.stringify(document, null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(
          `Failed to get ${doctype} ${docName}: ${message}`,
          true
        );
      }
    }

    case "call_method": {
      const method = String(args?.method);
      const methodArgs = args?.args as Record<string, unknown> | undefined;
      const httpMethod = (args?.http_method as "GET" | "POST") || "POST";

      if (!method) {
        throw new McpError(ErrorCode.InvalidParams, "Method is required");
      }

      if (method === "frappe.desk.form.utils.add_comment") {
        if (methodArgs?.doc) {
          return textResult(
            "Invalid add_comment args: do not pass a nested `doc` object (causes socket hang up). Use note_document with doctype, name, and data: { message, author_name?, author_email? }.",
            true
          );
        }

        const referenceDoctype = String(methodArgs?.reference_doctype ?? "");
        const referenceName = String(methodArgs?.reference_name ?? "");
        const content = String(methodArgs?.content ?? "");
        const commentEmail = String(methodArgs?.comment_email ?? "");
        const commentBy = String(methodArgs?.comment_by ?? "");

        if (
          referenceDoctype &&
          referenceName &&
          content &&
          commentEmail &&
          commentBy
        ) {
          try {
            const result = await erpnext.addDocumentComment({
              reference_doctype: referenceDoctype,
              reference_name: referenceName,
              content,
              comment_email: commentEmail,
              comment_by: commentBy,
            });
            return textResult(JSON.stringify(result, null, 2));
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return textResult(`Failed to add document comment: ${message}`, true);
          }
        }
      }

      try {
        const result = await erpnext.callMethod(method, methodArgs, httpMethod);
        return textResult(JSON.stringify(result, null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(`Failed to call method ${method}: ${message}`, true);
      }
    }

    case "note_document":
    case "post_timeline":
    case "comment_document": {
      const doctype = String(args?.doctype ?? "");
      const docName = String(args?.name ?? "");
      const data = args?.data as Record<string, unknown> | undefined;
      const content = String(
        data?.message ??
          args?.message ??
          args?.text ??
          args?.content ??
          data?.body ??
          args?.body ??
          ""
      );
      let commentEmail = String(
        data?.author_email ??
          args?.author_email ??
          args?.comment_email ??
          ""
      );
      let commentBy = String(
        data?.author_name ?? args?.author_name ?? args?.comment_by ?? ""
      );

      if (!doctype || !docName || !content.trim()) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Doctype, name, and data.message are required"
        );
      }

      if (!commentEmail || !commentBy) {
        const userProfile = await profile.get(false);
        commentEmail = commentEmail || userProfile.erpnextUser || userProfile.workEmail;
        commentBy = commentBy || userProfile.fullName || userProfile.employeeName;
      }

      if (!commentEmail || !commentBy) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "comment_email and comment_by are required (or load profile via get_user_profile first)"
        );
      }

      try {
        const result = await erpnext.addDocumentComment({
          reference_doctype: doctype,
          reference_name: docName,
          content,
          comment_email: commentEmail,
          comment_by: commentBy,
        });
        return textResult(JSON.stringify(result, null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(`Failed to add document comment: ${message}`, true);
      }
    }

    case "submit_document": {
      const doctype = String(args?.doctype);
      const docName = String(args?.name);
      const verbose = args?.verbose === true;

      if (!doctype || !docName) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Doctype and name are required"
        );
      }

      try {
        const fullDoc = await erpnext.getDocument(doctype, docName);
        const result = (await erpnext.callMethod("frappe.client.submit", {
          doc: fullDoc,
        })) as Record<string, unknown>;

        if (verbose) {
          return textResult(JSON.stringify(result, null, 2));
        }

        if (
          !result ||
          typeof result !== "object" ||
          result.name == null ||
          result.docstatus == null
        ) {
          throw new McpError(
            ErrorCode.InternalError,
            `Unexpected response from ERPNext while submitting ${doctype} ${docName}`
          );
        }

        return successDocResult(doctype, result, false);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(
          `Failed to submit ${doctype} ${docName}: ${message}`,
          true
        );
      }
    }

    case "cancel_document": {
      const doctype = String(args?.doctype);
      const docName = String(args?.name);
      const verbose = args?.verbose === true;

      if (!doctype || !docName) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Doctype and name are required"
        );
      }

      try {
        const result = (await erpnext.callMethod("frappe.client.cancel", {
          doctype,
          name: docName,
        })) as Record<string, unknown>;

        if (verbose) {
          return textResult(JSON.stringify(result, null, 2));
        }

        if (
          !result ||
          typeof result !== "object" ||
          result.name == null ||
          result.docstatus == null
        ) {
          throw new McpError(
            ErrorCode.InternalError,
            `Unexpected response from ERPNext while cancelling ${doctype} ${docName}`
          );
        }

        return successDocResult(doctype, result, false);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(
          `Failed to cancel ${doctype} ${docName}: ${message}`,
          true
        );
      }
    }

    case "delete_document": {
      const doctype = String(args?.doctype);
      const docName = String(args?.name);

      if (!doctype || !docName) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Doctype and name are required"
        );
      }

      try {
        await erpnext.deleteDocument(doctype, docName);
        return textResult(
          JSON.stringify({
            status: "success",
            action: "deleted",
            doctype,
            name: docName,
          })
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(
          `Failed to delete ${doctype} ${docName}: ${message}`,
          true
        );
      }
    }

    case "get_doctype_schema": {
      const doctype = String(args?.doctype);
      const refresh = args?.refresh === true;

      if (!doctype) {
        throw new McpError(ErrorCode.InvalidParams, "Doctype is required");
      }

      try {
        const schema = await doctypeCache.get(
          doctype,
          refresh && erpnext.isAuthenticated()
        );
        return textResult(JSON.stringify(schema, null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(`Failed to get schema for ${doctype}: ${message}`, true);
      }
    }

    case "list_doctype_schemas": {
      try {
        const doctypes = await doctypeCache.list();
        return textResult(JSON.stringify({ doctypes }, null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(`Failed to list cached schemas: ${message}`, true);
      }
    }

    case "get_doctype_fields": {
      const doctype = String(args?.doctype);

      if (!doctype) {
        throw new McpError(ErrorCode.InvalidParams, "Doctype is required");
      }

      try {
        const documents = await erpnext.getDocList(doctype, {}, ["*"], 1);

        if (!documents?.length) {
          return textResult(
            `No documents found for ${doctype}. Cannot determine fields.`,
            true
          );
        }

        const sampleDoc = documents[0];
        const fields = Object.keys(sampleDoc).map((field) => ({
          fieldname: field,
          value: typeof sampleDoc[field],
          sample:
            sampleDoc[field]?.toString()?.substring(0, 50) || null,
        }));

        return textResult(JSON.stringify(fields, null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(
          `Failed to get fields for ${doctype}: ${message}`,
          true
        );
      }
    }

    case "get_doctypes": {
      try {
        const doctypes = await erpnext.getAllDocTypes();
        return textResult(JSON.stringify(doctypes, null, 2));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return textResult(`Failed to get DocTypes: ${message}`, true);
      }
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
}
