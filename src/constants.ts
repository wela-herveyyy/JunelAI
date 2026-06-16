export const SERVER_NAME = "erpnext-mcp-server";

export const AUTH_SETUP_HINT =
  "Run setup-sid to refresh your ERPNext browser session (npm run setup-sid from source).";

export const CREDENTIAL_ENV_KEYS = [
  "ERPNEXT_URL",
  "ERPNEXT_SID",
  "ERPNEXT_CSRF_TOKEN",
  "ERPNEXT_COOKIE",
  "ERPNEXT_API_KEY",
  "ERPNEXT_API_SECRET",
  "ERPNEXT_USERNAME",
  "ERPNEXT_PASSWORD",
] as const;

export const FALLBACK_DOCTYPES = [
  "Customer",
  "Supplier",
  "Item",
  "Sales Order",
  "Purchase Order",
  "Sales Invoice",
  "Purchase Invoice",
  "Employee",
  "Lead",
  "Opportunity",
  "Quotation",
  "Payment Entry",
  "Journal Entry",
  "Stock Entry",
] as const;
