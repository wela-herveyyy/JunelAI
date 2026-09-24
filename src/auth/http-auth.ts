import type { IncomingHttpHeaders } from "node:http";

export type HttpClientAuth =
  | { kind: "sid"; sid: string }
  | { kind: "api_key"; apiKey: string; apiSecret: string };

export const HTTP_AUTH_SETUP_HINT =
  "Set Authorization: Bearer <ERPNEXT_SID> (default), or Authorization: token <API_KEY>:<API_SECRET>, plus X-ERPNext-URL.";

function readHeader(
  headers: IncomingHttpHeaders,
  name: string
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim()) {
    return raw[0].trim();
  }
  return undefined;
}

function splitApiToken(value: string): { apiKey: string; apiSecret: string } | undefined {
  const colon = value.indexOf(":");
  if (colon <= 0 || colon === value.length - 1) return undefined;
  return {
    apiKey: value.slice(0, colon),
    apiSecret: value.slice(colon + 1),
  };
}

/** API key wins when sent; otherwise Bearer SID (default). */
export function readHttpClientAuth(
  headers: IncomingHttpHeaders
): HttpClientAuth | undefined {
  const authorization = readHeader(headers, "authorization");
  if (authorization) {
    const tokenMatch = /^token\s+(\S+)$/i.exec(authorization);
    if (tokenMatch) {
      const parsed = splitApiToken(tokenMatch[1]);
      if (parsed) return { kind: "api_key", ...parsed };
    }
  }

  const headerKey = readHeader(headers, "x-erpnext-api-key");
  const headerSecret = readHeader(headers, "x-erpnext-api-secret");
  if (headerKey && headerSecret) {
    return { kind: "api_key", apiKey: headerKey, apiSecret: headerSecret };
  }

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const sid = authorization.slice("Bearer ".length).trim();
    if (sid) return { kind: "sid", sid };
  }

  return undefined;
}

export function httpAuthFingerprint(auth: HttpClientAuth): string {
  return auth.kind === "sid"
    ? `sid:${auth.sid}`
    : `token:${auth.apiKey}:${auth.apiSecret}`;
}
