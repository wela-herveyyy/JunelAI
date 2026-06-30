/** HTTP header set in MCP client config (`headers` in mcp.json / mcp_config.json). */
export const ERPNEXT_URL_HEADER = "x-erpnext-url";

/** Stdio fallback: set in mcp.json `env` (MCP client config, not server deploy env). */
export const ERPNEXT_URL_MCP_ENV = "X_ERPNEXT_URL";

export function normalizeErpnextUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    throw new Error(
      `Invalid ERPNext URL "${url}". Must start with http:// or https://`
    );
  }
  return trimmed;
}

export function readErpnextUrlHeader(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  const raw =
    headers[ERPNEXT_URL_HEADER] ??
    headers[ERPNEXT_URL_HEADER.toLowerCase()] ??
    headers["ERPNext-URL"];

  if (typeof raw === "string" && raw.trim()) {
    return normalizeErpnextUrl(raw);
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim()) {
    return normalizeErpnextUrl(raw[0]);
  }
  return undefined;
}

export function resolveErpnextUrlFromProcessEnv(): string | undefined {
  const fromMcp =
    process.env[ERPNEXT_URL_MCP_ENV]?.trim() ||
    process.env.ERPNEXT_URL?.trim();
  return fromMcp ? normalizeErpnextUrl(fromMcp) : undefined;
}

export const ERPNEXT_URL_SETUP_HINT =
  "Set the school ERPNext URL in MCP config: HTTP headers X-ERPNext-URL, or stdio env X_ERPNEXT_URL in mcp.json.";
