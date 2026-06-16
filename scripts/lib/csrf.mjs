import axios from 'axios';

const CSRF_PATTERNS = [
  /csrf_token['"]?\s*[:=]\s*['"]([^'"]+)/,
  /"csrf_token"\s*:\s*"([^"]+)"/,
  /data-csrf-token="([^"]+)"/,
];

export async function resolveCsrfToken(client, env = process.env) {
  if (env.ERPNEXT_CSRF_TOKEN) {
    return env.ERPNEXT_CSRF_TOKEN;
  }

  try {
    const csrfRes = await client.get('/api/method/frappe.sessions.get_csrf_token');
    if (csrfRes.data?.message) {
      return csrfRes.data.message;
    }
  } catch {
    // Livro often blocks this method for API clients — fall back to desk HTML.
  }

  const deskRes = await client.get('/app', { maxRedirects: 5 });
  const html = typeof deskRes.data === 'string' ? deskRes.data : '';
  for (const pattern of CSRF_PATTERNS) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  throw new Error(
    'Could not resolve CSRF token. Re-run setup-sid or add ERPNEXT_CSRF_TOKEN to MCP config.'
  );
}

export async function applyWriteAuth(client, env = process.env) {
  const csrf = await resolveCsrfToken(client, env);
  client.defaults.headers['X-Frappe-CSRF-Token'] = csrf;
  return csrf;
}
