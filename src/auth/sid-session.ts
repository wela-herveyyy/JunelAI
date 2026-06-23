import axios from "axios";

export function normalizeErpUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function looksLikeSid(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 16 || trimmed.length > 256) return false;
  return /^[A-Za-z0-9%._-]+$/.test(trimmed);
}

export interface ValidatedSidSession {
  user: string;
  sid: string;
  csrfToken: string;
}

export async function validateSidSession(
  baseUrl: string,
  sid: string
): Promise<ValidatedSidSession> {
  if (!looksLikeSid(sid)) {
    throw new Error("Invalid ERPNext session id format");
  }

  const client = axios.create({
    baseURL: normalizeErpUrl(baseUrl),
    headers: {
      Accept: "application/json",
      Cookie: `sid=${sid}`,
    },
    validateStatus: () => true,
  });

  const userRes = await client.get("/api/method/frappe.auth.get_logged_user");
  if (userRes.status === 401 || userRes.status === 403) {
    throw new Error("SID is invalid or expired");
  }
  if (userRes.status >= 400) {
    throw new Error(`Session check failed (${userRes.status})`);
  }

  const user = userRes.data?.message;
  if (!user || user === "Guest") {
    throw new Error("SID is not linked to a logged-in user");
  }

  let csrfToken = "";
  try {
    const csrfRes = await client.get("/api/method/frappe.sessions.get_csrf_token");
    csrfToken = csrfRes.data?.message || "";
  } catch {
    // CSRF may be resolved on first write
  }

  return { user, sid, csrfToken };
}
