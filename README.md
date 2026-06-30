# ERPNext MCP Server

MCP server for ERPNext / Frappe — query documents, create records, run reports, and call whitelisted API methods from **Cursor**, **Antigravity IDE**, and other MCP clients.

**Author:** [Hervey Geralph Mapano](https://github.com/herveyyy)

## Requirements

- Node.js 18+
- ERPNext / Frappe instance
- ERPNext credentials (SID recommended)

## Setup

### 1. Install

```bash
git clone <your-repo-url>
cd erpnext-mcp-server
npm install
npm run build
```

### 2. User profile

```bash
npm run setup-profile
```

Or non-interactive:

```bash
npm run setup-profile -- \
  --full-name "Your Name" \
  --work-email "you@example.com" \
  --position "Your Role" \
  --company "Your Company" \
  --department "Your Department"
```

### 3. ERPNext auth

```bash
npm run setup-sid
```

Saves credentials to `~/.erpnext-mcp/credentials.json`. Re-run when the session expires.

Other commands: `npm run setup-auth`, `npm run verify-auth`, `npm run export-mcp-config`

### School ERPNext URL (MCP config, not server env)

Each school has its own ERPNext instance. Set the URL in **your MCP client config** — not on the hosted server.

| Transport | Where to set the school URL |
| --- | --- |
| **HTTP** (`url` / `serverUrl`) | `headers.X-ERPNext-URL` |
| **Stdio** (`command` / `args`) | `env.X_ERPNEXT_URL` in `mcp.json` |

Example schools: `https://erp.livro.systems`, `https://school-a.example.com`.

Credentials file (`~/.erpnext-mcp/credentials.json`) still stores `ERPNEXT_URL` for setup scripts; `export-mcp-config` maps it to `X_ERPNEXT_URL` / `X-ERPNext-URL` in client config.

### 4. Cursor

Edit `~/.cursor/mcp.json` (Windows: `%APPDATA%\Cursor\User\globalStorage\cursor.mcp\mcp.json`):

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": [
        "C:/Users/hmapa/Documents/PROJECTS/MCPs/erpnext-mcp-server/build/index.js"
      ],
      "env": {
        "X_ERPNEXT_URL": "https://erp.livro.systems",
        "ERPNEXT_SID": "your-session-id-from-browser-cookies"
      }
    }
  }
}
```

- Replace `args` with the absolute path to your clone.
- Get `ERPNEXT_SID` from `npm run setup-sid`, or use `ERPNEXT_CREDENTIALS_FILE` instead:

```json
"env": {
  "X_ERPNEXT_URL": "https://erp.livro.systems",
  "ERPNEXT_CREDENTIALS_FILE": "C:/Users/hmapa/.erpnext-mcp/credentials.json"
}
```

Reload Cursor (**Developer: Reload Window**), then confirm **erpnext** is connected under MCP.

### 5. Antigravity IDE

[Antigravity IDE](https://antigravity.google/docs/mcp) uses **`serverUrl`** (not `url`) for remote MCP servers.

**Config file:**

| OS | Path |
| --- | --- |
| macOS / Linux | `~/.gemini/config/mcp_config.json` |
| Windows | `%USERPROFILE%\.gemini\config\mcp_config.json` |

Workspace override: `.agents/mcp_config.json` in your project root.

**Setup in the IDE:** Agent panel → `...` → **MCP Servers** → **Manage MCP Servers** → **View raw config** → save → refresh MCP servers.

#### Local stdio (recommended for dev)

Credentials stay on your machine (`~/.erpnext-mcp/credentials.json`):

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": [
        "C:/Users/hmapa/Documents/PROJECTS/MCPs/erpnext-mcp-server/build/index.js"
      ],
      "env": {
        "X_ERPNEXT_URL": "https://erp.livro.systems",
        "ERPNEXT_CREDENTIALS_FILE": "C:/Users/hmapa/.erpnext-mcp/credentials.json"
      }
    }
  }
}
```

#### Remote Streamable HTTP (Coolify / hosted)

Start the server with `MCP_TRANSPORT=http` (see [URL transport](#url-transport-streamable-http) below). Point Antigravity at the public URL:

```json
{
  "mcpServers": {
    "erpnext": {
      "serverUrl": "https://mcp.yourdomain.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ERPNEXT_SID",
        "X-ERPNext-URL": "https://erp.livro.systems"
      }
    }
  }
}
```

Local HTTP test (`npm run start:http`):

```json
{
  "mcpServers": {
    "erpnext": {
      "serverUrl": "http://127.0.0.1:3100/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ERPNEXT_SID",
        "X-ERPNext-URL": "https://erp.livro.systems"
      }
    }
  }
}
```

#### Antigravity IDE vs Cursor

| | Cursor | Antigravity IDE |
| --- | --- | --- |
| Config file | `~/.cursor/mcp.json` | `~/.gemini/config/mcp_config.json` |
| Remote URL key | `url` | **`serverUrl`** |
| Transport | Streamable HTTP | Streamable HTTP only — **not** legacy SSE-only |
| Server key | e.g. `erpnext` | Lowercase alphanumeric (`erpnext`) |
| Tool limit | ~16 per server in UI | ~50 total recommended |

Do **not** use `"url"` or `"transport": { "type": "sse" }` in Antigravity — use `serverUrl` with a Streamable HTTP endpoint.

When `ERPNEXT_SID` expires, run `npm run setup-sid` and update the `Authorization` header.

#### Antigravity SDK (Gemini API)

For code (not the IDE), register the server in `interactions.create` with `environment: "remote"`:

```python
interaction = client.interactions.create(
    agent="antigravity-preview-05-2026",
    input="get my open sprint backlog items",
    environment="remote",
    tools=[{
        "type": "mcp_server",
        "name": "erpnext",
        "url": "https://mcp.yourdomain.com/mcp",
        "headers": {"Authorization": "Bearer YOUR_ERPNEXT_SID", "X-ERPNext-URL": "https://erp.livro.systems"},
    }],
)
```

See [Antigravity agent docs](https://ai.google.dev/gemini-api/docs/antigravity-agent). Tool `name` must be lowercase alphanumeric. Optional: `allowed_tools` to limit exposed tools.

### URL transport (Streamable HTTP)

This server exposes **Streamable HTTP** at `/mcp` (`POST` / `GET` / `DELETE`). Use it for Cursor URL config, Coolify, or any remote MCP client.

Run the MCP server as a local HTTP endpoint and connect with a `url` instead of `command`/`args`:

**1. Start the HTTP server** (no school URL on the server — clients send `X-ERPNext-URL`):

```bash
npm run start:http
```

Defaults: `http://127.0.0.1:3100/mcp`. Override with env or flags:

```bash
npm run start:http -- --host 127.0.0.1 --port 3100 --path /mcp
```

On **localhost**, auth is optional. On **public binds** (`0.0.0.0`, Coolify, etc.) the server requires your ERPNext session id as a Bearer token.

**2. Point Cursor at the URL** in `mcp.json` (use your `ERPNEXT_SID` from `npm run setup-sid`):

```json
{
  "mcpServers": {
    "erpnext": {
      "url": "http://127.0.0.1:3100/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ERPNEXT_SID",
        "X-ERPNext-URL": "https://erp.livro.systems"
      }
    }
  }
}
```

Or use env interpolation so the sid is not stored in the file:

```json
"headers": {
  "Authorization": "Bearer ${env:ERPNEXT_SID}"
}
```

Generate a URL config snippet (pulls sid from credentials file):

```bash
npm run export-mcp-config -- --http
npm run export-mcp-config -- --http --port 3100
```

#### Coolify / public deploy

Server env (Coolify → Environment Variables):

| Variable | Example | Notes |
| -------- | ------- | ----- |
| `MCP_TRANSPORT` | `http` | Required |
| `MCP_HOST` | `0.0.0.0` | Bind inside container |
| `MCP_PORT` | `3000` | Match exposed port (or use Coolify `PORT`) |

You do **not** need a school ERPNext URL or `ERPNEXT_SID` on the server — each client sends `X-ERPNext-URL` and their own sid in `Authorization`.

Start command: `node build/index.js` (after `npm install && npm run build`).

Client `mcp.json`:

```json
{
  "mcpServers": {
    "erpnext": {
      "url": "https://mcp.yourdomain.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ERPNEXT_SID",
        "X-ERPNext-URL": "https://erp.livro.systems"
      }
    }
  }
}
```

When the sid expires, refresh with `npm run setup-sid` and update the header.

For **Antigravity IDE**, use `serverUrl` instead of `url` — see [Antigravity IDE](#5-antigravity-ide) above.

If a tool is missing (Cursor shows ~16 tools max), run:

```bash
npm run fix-cursor-mcp
```

That adds an `erpnext-fields` entry for `get_doctype_fields`. Reload Cursor again.

### 6. Domain skills (Cursor, Claude, Gemini, OpenCode)

```bash
npm run install-skills
```

Copies `.cursor/skills/` and `.cursor/memory-lane/` into each client’s project folder:


| Client          | Skills path         |
| --------------- | ------------------- |
| Cursor          | `.cursor/skills/`   |
| Antigravity IDE | `.agents/skills/` or `.gemini/skills/` (via `install-skills`) |
| Claude          | `.claude/skills/`   |
| Gemini CLI      | `.gemini/skills/`   |
| OpenCode        | `.opencode/skills/` |


Options:

```bash
npm run install-skills -- --clients cursor,claude
npm run install-skills -- --scope user
```

Reload the AI client after installing.

### Verify

In chat:

```
Call check_auth on erpnext, then get_user_profile with sync true.
```

Or:

```bash
npm run verify-auth
```

## Usage

Typical flow in chat:

1. `**get_user_profile**` (`sync: true`) — who you are in ERPNext (employee, email, department).
2. `**get_doctype_schema**` — field names for the DocType you need (cached after first fetch).
3. `**get_documents**` / `**get_document**` — read records.
4. `**create_document**` / `**update_document**` — write changes.
5. `**note_document**` — add a timeline comment on a task, leave, sprint backlog, etc.
6. `**submit_document**` / `**cancel_document**` — workflow actions on submittable DocTypes.

Auth is lazy — you do not need `**check_auth**` before every call. Use it only when the session fails or you want to confirm login.

### Example prompts

```
get_user_profile with sync true, then get_doctype_schema for Sprint Backlogs
```

```
get_documents for Sprint Backlogs with filters dev_assignee = me, limit 10
```

```
get_document for Leave Application HR-LAP-2026-00547
```

```
note_document on Sprint Backlogs SPB-01010 with message "Ready for QA"
```

```
create_document Leave Application with data for vacation leave next Monday
```

Domain-specific workflows live in `.cursor/skills/` (leave, tasks, comments, salary, etc.). Install them for all supported clients with `npm run install-skills`.

## Tools


| Tool                   | Description                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `get_user_profile`     | Logged-in profile (name, email, employee). **Call first** in most workflows.        |
| `update_user_profile`  | Update local profile overrides (`fullName`, `workEmail`, `department`, …).          |
| `check_auth`           | Verify ERPNext session (optional; auth retries automatically on errors).            |
| `get_doctypes`         | List all DocTypes on the site.                                                      |
| `get_doctype_schema`   | Cached DocType fields/types/sample. Use before building queries.                    |
| `list_doctype_schemas` | List DocTypes already cached under `~/.erpnext-mcp/doctypes/`.                      |
| `get_doctype_fields`   | Infer fields from one sample document (prefer `get_doctype_schema`).                |
| `get_documents`        | Query documents: `doctype`, optional `filters`, `fields`, `limit`.                  |
| `get_document`         | Fetch one document by `doctype` + `name` (includes child tables).                   |
| `create_document`      | Create a draft: `doctype` + `data`.                                                 |
| `update_document`      | Update a document: `doctype`, `name`, `data`.                                       |
| `note_document`        | Timeline note: `doctype`, `name`, `data: { message, author_name?, author_email? }`. |
| `submit_document`      | Submit a submittable document (`docstatus` → 1).                                    |
| `cancel_document`      | Cancel a submitted document (`docstatus` → 2).                                      |
| `delete_document`      | Permanently delete a document (cancel submitted docs first).                        |
| `call_method`          | Call any whitelisted Frappe method (`method`, optional `args`, `http_method`).      |
| `run_report`           | Run an ERPNext report by `report_name` with optional `filters`.                     |


Set `verbose: true` on create/update/submit/cancel/note tools to get the full document in the response.

## Resources


| URI                                  | Description                    |
| ------------------------------------ | ------------------------------ |
| `erpnext://user-profile`             | User profile JSON              |
| `erpnext://doctype-schemas`          | List of cached DocType schemas |
| `erpnext://doctype-schema/{doctype}` | Schema for one DocType         |
| `erpnext://DocTypes`                 | All DocTypes                   |
| `erpnext://{doctype}/{name}`         | Single document JSON           |


## License

MIT — see [LICENSE](./LICENSE).