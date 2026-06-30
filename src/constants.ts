/** MCP implementation name reported in initialize (Antigravity SDK requires lowercase alphanumeric). */
export const SERVER_NAME =
  process.env.MCP_SERVER_NAME?.replace(/[^a-z0-9]/g, "") || "erpnext";

export const AUTH_SETUP_HINT =
  "Session expired. Run: npm run refresh-auth (paste sid in chat for the agent to run refresh-auth -- --sid YOUR_SID --json). Full setup: npm run setup-sid";

export const CREDENTIAL_ENV_KEYS = [
  "X_ERPNEXT_URL",
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
