import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CREDENTIAL_ENV_KEYS } from "../constants.js";

export async function loadCredentialsIntoEnv(): Promise<string | null> {
  const credentialsPath =
    process.env.ERPNEXT_CREDENTIALS_FILE ||
    join(homedir(), ".erpnext-mcp", "credentials.json");

  try {
    const raw = await readFile(credentialsPath, "utf8");
    const data = JSON.parse(raw) as Record<string, string>;

    for (const key of CREDENTIAL_ENV_KEYS) {
      if (!process.env[key] && typeof data[key] === "string" && data[key]) {
        process.env[key] = data[key];
      }
    }

    return credentialsPath;
  } catch {
    return null;
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
