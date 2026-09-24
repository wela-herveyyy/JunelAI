import axios from "axios";
import { normalizeErpUrl } from "./sid-session.js";

export interface ValidatedApiKeySession {
  user: string;
  apiKey: string;
  apiSecret: string;
}

export async function validateApiKeySession(
  baseUrl: string,
  apiKey: string,
  apiSecret: string
): Promise<ValidatedApiKeySession> {
  if (!apiKey.trim() || !apiSecret.trim()) {
    throw new Error("API key and secret are required");
  }

  const client = axios.create({
    baseURL: normalizeErpUrl(baseUrl),
    headers: {
      Accept: "application/json",
      Authorization: `token ${apiKey}:${apiSecret}`,
    },
    validateStatus: () => true,
  });

  const userRes = await client.get("/api/method/frappe.auth.get_logged_user");
  if (userRes.status === 401 || userRes.status === 403) {
    throw new Error("API key or secret is invalid");
  }
  if (userRes.status >= 400) {
    throw new Error(`API key check failed (${userRes.status})`);
  }

  const user = userRes.data?.message;
  if (!user || user === "Guest") {
    throw new Error("API key is not linked to a logged-in user");
  }

  return { user, apiKey, apiSecret };
}
