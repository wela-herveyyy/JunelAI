# ERPNext MCP Server

MCP server for ERPNext / Frappe — query documents, create records, run reports, and call whitelisted API methods from Cursor and other MCP clients.

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
        "ERPNEXT_URL": "https://erp.livro.systems",
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
  "ERPNEXT_URL": "https://erp.livro.systems",
  "ERPNEXT_CREDENTIALS_FILE": "C:/Users/hmapa/.erpnext-mcp/credentials.json"
}
```

Reload Cursor (**Developer: Reload Window**), then confirm **erpnext** is connected under MCP.

If a tool is missing (Cursor shows ~16 tools max), run:

```bash
npm run fix-cursor-mcp
```

That adds an `erpnext-fields` entry for `get_doctype_fields`. Reload Cursor again.

### 5. Domain skills (Cursor, Claude, Gemini, OpenCode)

```bash
npm run install-skills
```

Copies `.cursor/skills/` and `.cursor/memory-lane/` into each client’s project folder:


| Client     | Skills path         |
| ---------- | ------------------- |
| Cursor     | `.cursor/skills/`   |
| Claude     | `.claude/skills/`   |
| Gemini CLI | `.gemini/skills/`   |
| OpenCode   | `.opencode/skills/` |


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
get_user_profile with sync true, then get_doctype_schema for Livro Task
```

```
get_documents for Livro Task with filters dev_assignee = me, limit 10
```

```
get_document for Leave Application HR-LAP-2026-00547
```

```
note_document on Livro Task LT-2026-09102 with message "Ready for QA"
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