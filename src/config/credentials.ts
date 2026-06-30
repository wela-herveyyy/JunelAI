import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CREDENTIAL_ENV_KEYS } from "../constants.js";
import { ERPNEXT_URL_MCP_ENV } from "./erpnext-url.js";

const SESSION_KEYS = ["ERPNEXT_SID", "ERPNEXT_CSRF_TOKEN", "ERPNEXT_COOKIE"] as const;

export async function loadCredentialsIntoEnv(
  options: { refreshSession?: boolean } = {}
): Promise<string | null> {
  const credentialsPath =
    process.env.ERPNEXT_CREDENTIALS_FILE ||
    join(homedir(), ".erpnext-mcp", "credentials.json");

  try {
    const raw = await readFile(credentialsPath, "utf8");
    const data = JSON.parse(raw) as Record<string, string>;

    for (const key of CREDENTIAL_ENV_KEYS) {
      const value = data[key];
      if (typeof value !== "string" || !value) {
        continue;
      }

      const isSessionKey = SESSION_KEYS.includes(
        key as (typeof SESSION_KEYS)[number]
      );
      if (options.refreshSession && isSessionKey) {
        process.env[key] = value;
      } else if (!process.env[key]) {
        process.env[key] = value;
      }
    }

    return credentialsPath;
  } catch {
    return null;
  } finally {
    if (process.env.ERPNEXT_URL && !process.env[ERPNEXT_URL_MCP_ENV]) {
      process.env[ERPNEXT_URL_MCP_ENV] = process.env.ERPNEXT_URL;
    }
  }
}

export function detectAuthMethod(): string {
  const apiKey = process.env.ERPNEXT_API_KEY;
  const apiSecret = process.env.ERPNEXT_API_SECRET;
  if (apiKey && apiSecret) {
    return "api_key";
  }
  if (process.env.ERPNEXT_SID) {
    return "sid";
  }
  if (process.env.ERPNEXT_COOKIE) {
    return "cookie";
  }
  if (
    (process.env.ERPNEXT_USERNAME || process.env.ERPNEXT_USER) &&
    (process.env.ERPNEXT_PASSWORD || process.env.ERPNEXT_PWD)
  ) {
    return "password";
  }
  return "none";
}
