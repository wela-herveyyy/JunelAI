export const TOOL_DEFINITIONS = [
  {
    name: "get_doctypes",
    description: "Get a list of all available DocTypes",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_doctype_schema",
    description:
      "Get cached DocType schema (fields, types, sample). Fetches from ERPNext on first access or when refresh=true, then stores in ~/.erpnext-mcp/doctypes/ for reuse. Prefer this over get_doctype_fields for query building.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: {
          type: "string",
          description: "ERPNext DocType (e.g., Livro Task, Leave Application)",
        },
        refresh: {
          type: "boolean",
          description:
            "If true, re-fetch from ERPNext and update cache (default: false)",
        },
      },
      required: ["doctype"],
    },
  },
  {
    name: "list_doctype_schemas",
    description:
      "List DocTypes that have a cached schema in ~/.erpnext-mcp/doctypes/",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_doctype_fields",
    description:
      "Get fields list for a DocType from a sample document. Prefer get_doctype_schema for cached/reusable structure.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: {
          type: "string",
          description: "ERPNext DocType (e.g., Customer, Item)",
        },
      },
      required: ["doctype"],
    },
  },
  {
    name: "get_documents",
    description: "Get a list of documents for a specific doctype",
    inputSchema: {
      type: "object",
      properties: {
        doctype: {
          type: "string",
          description: "ERPNext DocType (e.g., Customer, Item)",
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Fields to include (optional)",
        },
        filters: {
          type: "object",
          additionalProperties: true,
          description: "Filters in the format {field: value} (optional)",
        },
        limit: {
          type: "number",
          description: "Maximum number of documents to return (optional)",
        },
      },
      required: ["doctype"],
    },
  },
  {
    name: "create_document",
    description: "Create a new document in ERPNext",
    inputSchema: {
      type: "object",
      properties: {
        doctype: {
          type: "string",
          description: "ERPNext DocType (e.g., Customer, Item)",
        },
        data: {
          type: "object",
          additionalProperties: true,
          description: "Document data",
        },
        verbose: {
          type: "boolean",
          description:
            "If true, return the full document in the response. Default is false (returns minimal confirmation only).",
        },
      },
      required: ["doctype", "data"],
    },
  },
  {
    name: "update_document",
    description: "Update an existing document in ERPNext",
    inputSchema: {
      type: "object",
      properties: {
        doctype: {
          type: "string",
          description: "ERPNext DocType (e.g., Customer, Item)",
        },
        name: {
          type: "string",
          description: "Document name/ID",
        },
        data: {
          type: "object",
          additionalProperties: true,
          description: "Document data to update",
        },
        verbose: {
          type: "boolean",
          description:
            "If true, return the full document in the response. Default is false (returns minimal confirmation only).",
        },
      },
      required: ["doctype", "name", "data"],
    },
  },
  {
    name: "run_report",
    description: "Run an ERPNext report",
    inputSchema: {
      type: "object",
      properties: {
        report_name: {
          type: "string",
          description: "Name of the report",
        },
        filters: {
          type: "object",
          additionalProperties: true,
          description: "Report filters (optional)",
        },
      },
      required: ["report_name"],
    },
  },
  {
    name: "get_document",
    description:
      "Get a single document by DocType and name, including all child tables and linked data",
    inputSchema: {
      type: "object",
      properties: {
        doctype: {
          type: "string",
          description: "ERPNext DocType (e.g., Customer, Sales Order, BOM)",
        },
        name: {
          type: "string",
          description: "Document name/ID",
        },
      },
      required: ["doctype", "name"],
    },
  },
  {
    name: "call_method",
    description:
      "Call an ERPNext/Frappe whitelisted server-side API method. Can invoke any whitelisted method — use with caution. Args are passed as JSON body (POST) or query params (GET).",
    inputSchema: {
      type: "object",
      properties: {
        method: {
          type: "string",
          description:
            "Dotted method path (e.g., frappe.client.get_count, erpnext.manufacturing.doctype.work_order.work_order.make_stock_entry)",
        },
        args: {
          type: "object",
          additionalProperties: true,
          description: "Method arguments as key-value pairs (optional)",
        },
        http_method: {
          type: "string",
          enum: ["GET", "POST"],
          description:
            "HTTP method to use (default: POST). Use GET for read-only methods.",
        },
      },
      required: ["method"],
    },
  },
  {
    name: "submit_document",
    description:
      "Submit a document (set docstatus to 1). Only works on submittable doctypes. Submitted documents can only be cancelled, not reverted to draft.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: {
          type: "string",
          description: "ERPNext DocType (e.g., Sales Invoice, Journal Entry)",
        },
        name: {
          type: "string",
          description: "Document name/ID",
        },
        verbose: {
          type: "boolean",
          description:
            "If true, return the full document in the response. Default is false (returns minimal confirmation only).",
        },
      },
      required: ["doctype", "name"],
    },
  },
  {
    name: "cancel_document",
    description:
      "Cancel a submitted document (set docstatus to 2). Cancelled documents cannot be modified — use amend workflow to create a corrected copy.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: {
          type: "string",
          description: "ERPNext DocType",
        },
        name: {
          type: "string",
          description: "Document name/ID",
        },
        verbose: {
          type: "boolean",
          description:
            "If true, return the full document in the response. Default is false (returns minimal confirmation only).",
        },
      },
      required: ["doctype", "name"],
    },
  },
  {
    name: "get_user_profile",
    description:
      "Get the logged-in user profile (full name, position, work email, company, department, ERPNext user, employee). Syncs from ERPNext Employee/User records when authenticated. Call this first before other ERPNext workflows.",
    inputSchema: {
      type: "object",
      properties: {
        sync: {
          type: "boolean",
          description:
            "If true (default), refresh profile from ERPNext before returning",
        },
      },
    },
  },
  {
    name: "update_user_profile",
    description:
      "Update local user profile fields. ERPNext-synced fields can be overridden here. Accepts fullName, position, workEmail, company, department, timezone, dateFormat, notes (snake_case aliases also accepted).",
    inputSchema: {
      type: "object",
      properties: {
        fullName: { type: "string", description: "Full name" },
        position: { type: "string", description: "Job title / designation" },
        workEmail: { type: "string", description: "Work email address" },
        company: { type: "string", description: "Company name" },
        department: { type: "string", description: "Department" },
        timezone: { type: "string", description: "IANA timezone" },
        dateFormat: { type: "string", description: "Preferred date format" },
        notes: { type: "string", description: "Free-form notes" },
      },
    },
  },
  {
    name: "check_auth",
    description:
      "Check ERPNext MCP authentication status (session validity, logged-in user, auth method)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "delete_document",
    description:
      "Permanently delete a document from ERPNext. This action cannot be undone. Submitted documents must be cancelled before deletion.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: {
          type: "string",
          description: "ERPNext DocType",
        },
        name: {
          type: "string",
          description: "Document name/ID",
        },
      },
      required: ["doctype", "name"],
    },
  },
] as const;
