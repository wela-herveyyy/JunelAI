import axios from 'axios';

export const DEFAULT_ERP_URL = 'https://erp.livro.systems';

export function normalizeUrl(url) {
  return url.replace(/\/$/, '');
}

export function looksLikeSid(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 16 || trimmed.length > 256) return false;
  return /^[A-Za-z0-9%._-]+$/.test(trimmed);
}

export function extractSidFromText(text) {
  if (!text) return '';
  const trimmed = text.trim();

  if (looksLikeSid(trimmed)) {
    return trimmed;
  }

  const sidPair = trimmed.match(/(?:^|[;\s])sid=([A-Za-z0-9%._-]+)/i);
  if (sidPair?.[1] && looksLikeSid(sidPair[1])) {
    return sidPair[1];
  }

  return '';
}

export async function validateSidSession(baseUrl, sid) {
  const client = axios.create({
    baseURL: normalizeUrl(baseUrl),
    headers: {
      Accept: 'application/json',
      Cookie: `sid=${sid}`,
    },
    validateStatus: () => true,
  });

  const userRes = await client.get('/api/method/frappe.auth.get_logged_user');
  if (userRes.status === 401 || userRes.status === 403) {
    throw new Error('SID is invalid or expired. Log in to ERPNext again and copy a fresh sid.');
  }
  if (userRes.status >= 400) {
    throw new Error(`Session check failed (${userRes.status})`);
  }

  const user = userRes.data?.message;
  if (!user || user === 'Guest') {
    throw new Error('SID is not linked to a logged-in user. Log in to ERPNext first.');
  }

  let csrfToken = '';
  try {
    const csrfRes = await client.get('/api/method/frappe.sessions.get_csrf_token');
    csrfToken = csrfRes.data?.message || '';
  } catch {
    // writes may fail until CSRF is refreshed by the MCP server
  }

  return { user, sid, csrfToken };
}
