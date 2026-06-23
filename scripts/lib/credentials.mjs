import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CREDENTIALS_DIR = join(homedir(), '.erpnext-mcp');
export const DEFAULT_CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

export function resolveCredentialsPath(explicitPath) {
  return explicitPath || process.env.ERPNEXT_CREDENTIALS_FILE || DEFAULT_CREDENTIALS_FILE;
}

export async function saveCredentials(credentials, explicitPath) {
  const path = resolveCredentialsPath(explicitPath);
  await mkdir(CREDENTIALS_DIR, { recursive: true });
  const payload = {
    ...credentials,
    _meta: {
      ...credentials._meta,
      savedAt: new Date().toISOString(),
      setupVersion: 1,
    },
  };
  await writeFile(path, JSON.stringify(payload, null, 2), { mode: 0o600 });
  return path;
}

export async function loadCredentials(explicitPath) {
  const path = resolveCredentialsPath(explicitPath);
  try {
    const raw = await readFile(path, 'utf8');
    return { path, data: JSON.parse(raw) };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { path, data: null };
    }
    throw error;
  }
}

export function credentialsToEnv(data) {
  if (!data) return {};
  const env = {};
  const keys = [
    'ERPNEXT_URL',
    'ERPNEXT_SID',
    'ERPNEXT_CSRF_TOKEN',
    'ERPNEXT_COOKIE',
    'ERPNEXT_API_KEY',
    'ERPNEXT_API_SECRET',
    'ERPNEXT_USERNAME',
    'ERPNEXT_PASSWORD',
  ];
  for (const key of keys) {
    if (typeof data[key] === 'string' && data[key]) {
      env[key] = data[key];
    }
  }
  return env;
}

export function buildMcpConfig({ serverPath, credentialsPath, baseUrl, env = {} }) {
  const mergedEnv = {
    ERPNEXT_URL: baseUrl,
    ERPNEXT_CREDENTIALS_FILE: credentialsPath,
    ...env,
  };

  // Keep MCP config minimal: prefer credentials file over inline secrets.
  if (credentialsPath) {
    delete mergedEnv.ERPNEXT_SID;
    delete mergedEnv.ERPNEXT_CSRF_TOKEN;
    delete mergedEnv.ERPNEXT_PASSWORD;
    delete mergedEnv.ERPNEXT_API_SECRET;
  }

  return {
    mcpServers: {
      erpnext: {
        command: 'node',
        args: [serverPath.replace(/\\/g, '/')],
        env: mergedEnv,
      },
    },
  };
}

export function buildMcpUrlConfig({
  url,
  authToken,
  toolExclude,
  toolInclude,
  serverName = 'erpnext',
}) {
  const entry = { url };

  if (authToken) {
    entry.headers = {
      Authorization: `Bearer ${authToken}`,
    };
  }

  const env = {};
  if (toolExclude) env.ERPNEXT_MCP_TOOL_EXCLUDE = toolExclude;
  if (toolInclude) env.ERPNEXT_MCP_TOOL_INCLUDE = toolInclude;

  return {
    mcpServers: {
      [serverName]: entry,
    },
    _httpServer: {
      url,
      authToken: authToken || null,
      env,
      note: 'Start the HTTP server separately: npm run start:http',
    },
  };
}
