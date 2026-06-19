import { TOOL_DEFINITIONS } from "./definitions.js";

function parseToolList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Tools exposed on this MCP process (optional include/exclude via env). */
export function getActiveToolDefinitions() {
  const include = parseToolList(process.env.ERPNEXT_MCP_TOOL_INCLUDE);
  const exclude = parseToolList(process.env.ERPNEXT_MCP_TOOL_EXCLUDE);

  if (include.length > 0) {
    const allowed = new Set(include);
    return TOOL_DEFINITIONS.filter((tool) => allowed.has(tool.name));
  }

  if (exclude.length > 0) {
    const blocked = new Set(exclude);
    return TOOL_DEFINITIONS.filter((tool) => !blocked.has(tool.name));
  }

  return TOOL_DEFINITIONS.map((tool) => ({ ...tool }));
}
