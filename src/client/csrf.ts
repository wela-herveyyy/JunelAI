import type { AxiosInstance } from "axios";

const CSRF_PATTERNS = [
  /csrf_token['"]?\s*[:=]\s*['"]([^'"]+)/,
  /"csrf_token"\s*:\s*"([^"]+)"/,
  /data-csrf-token="([^"]+)"/,
];

export async function resolveCsrfToken(
  axiosInstance: AxiosInstance,
  envCsrf?: string
): Promise<string | null> {
  try {
    const response = await axiosInstance.get(
      "/api/method/frappe.sessions.get_csrf_token"
    );
    const token = response.data?.message;
    if (typeof token === "string" && token) {
      return token;
    }
  } catch {
    // Livro often blocks this method — fall back to desk HTML.
  }

  try {
    const deskRes = await axiosInstance.get("/app", { maxRedirects: 5 });
    const html = typeof deskRes.data === "string" ? deskRes.data : "";
    for (const pattern of CSRF_PATTERNS) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }
  } catch {
    // fall through
  }

  return envCsrf || null;
}
