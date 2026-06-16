# ERPNext MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server for ERPNext and Frappe. Connect AI assistants in **Cursor**, **Claude Desktop**, **Gemini CLI**, **Codex**, or **OpenCode** to your ERPNext instance — query documents, create records, run reports, and call whitelisted API methods from chat.

**Author:** [Hervey geralph Mapano](https://github.com/herveyyy)

## Contents

- [Setup](#setup) — install, profile, auth
- [Client tutorials](#client-tutorials)
  - [Cursor](#cursor)
  - [Claude Desktop](#claude-desktop)
  - [Gemini CLI](#gemini-cli)
  - [OpenCode](#opencode)
- [Verify & troubleshoot](#verify--troubleshoot)
- [Profile-first workflow](#profile-first-workflow)
- [Development](#development)

## Features

### Resources


| URI                                  | Description                                  |
| ------------------------------------ | -------------------------------------------- |
| `erpnext://DocTypes`                 | List available DocTypes                      |
| `erpnext://{doctype}/{name}`         | Fetch a document as JSON                     |
| `erpnext://user-profile`             | Logged-in user profile (synced from ERPNext) |
| `erpnext://doctype-schemas`          | List of cached DocType schemas               |
| `erpnext://doctype-schema/{doctype}` | Field schema for one DocType                 |


### Tools


| Tool                   | Description                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| `get_user_profile`     | **Call first** — name, position, email, employee (syncs from ERPNext)   |
| `update_user_profile`  | Save profile overrides locally                                          |
| `get_doctype_schema`   | **Before queries** — cached DocType fields (auto-saves on first access) |
| `list_doctype_schemas` | List DocTypes already in schema cache                                   |
| `check_auth`           | Verify session or API key status                                        |
| `get_doctypes`         | List all DocTypes                                                       |
| `get_doctype_fields`   | Infer fields from a sample document                                     |
| `get_documents`        | Query documents with filters                                            |
| `get_document`         | Fetch one document with child tables                                    |
| `create_document`      | Create a draft document                                                 |
| `update_document`      | Update an existing document                                             |
| `delete_document`      | Permanently delete a document                                           |
| `submit_document`      | Submit a submittable document                                           |
| `cancel_document`      | Cancel a submitted document                                             |
| `call_method`          | Call a whitelisted Frappe API method                                    |
| `run_report`           | Run an ERPNext report                                                   |


## Requirements

- Node.js 18+
- A running ERPNext / Frappe instance
- ERPNext credentials (SID, API key, or username/password)
- User profile (name + work email at minimum)

## Setup

### Step 1 — Install

```bash
git clone <your-repo-url>
cd erpnext-mcp-server
npm install
npm run build
```

### Step 2 — User profile

Set your identity so AI assistants know who you are in ERPNext workflows (leave, MOM, tasks, salary).

**Interactive (recommended for first-time setup):**

```bash
npm run setup-profile
```

Prompts for:


| Field      | Example                                                             |
| ---------- | ------------------------------------------------------------------- |
| Full name  | Hervey Geralph C. Mapano                                            |
| Position   | Web Developer                                                       |
| Work email | [hervey.geralph@livro.systems](mailto:hervey.geralph@livro.systems) |
| Company    | Livro Systems Inc.                                                  |
| Department | Product Dev - LSI                                                   |


**Non-interactive (automation / AI agents):**

```bash
npm run setup-profile -- \
  --full-name "Hervey Geralph C. Mapano" \
  --work-email "hervey.geralph@livro.systems" \
  --position "Web Developer" \
  --company "Livro Systems Inc." \
  --department "Product Dev - LSI" \
  --json
```

Saves to:

- `~/.erpnext-mcp/user-profile.json` (MCP primary)
- `.cursor/memory-lane/user-profile.md` (local fallback, gitignored)

After ERPNext auth is working, `get_user_profile` also syncs `erpnextUser`, `employeeId`, and related fields from your Employee record.

### Step 3 — ERPNext authentication

**Recommended — browser SID session:**

```bash
npm run setup-sid
```

Opens ERPNext login, guides SID copy from DevTools, saves credentials to `~/.erpnext-mcp/credentials.json`, and writes MCP config snippets under `~/.erpnext-mcp/client-configs/`.

**Other auth options:**

```bash
npm run setup-auth      # API key, password, or SID (interactive menu)
npm run verify-auth     # Test saved credentials
npm run export-mcp-config   # Re-export MCP client config snippets
```

**Auth priority (environment / credentials file):**

1. `ERPNEXT_CREDENTIALS_FILE` — saved credentials JSON (recommended)
2. `ERPNEXT_API_KEY` + `ERPNEXT_API_SECRET`
3. `ERPNEXT_SID` (+ optional `ERPNEXT_CSRF_TOKEN`)
4. `ERPNEXT_USERNAME` + `ERPNEXT_PASSWORD`

SID sessions expire. When MCP stops working, run `npm run setup-sid` again.

**Credentials file** — `~/.erpnext-mcp/credentials.json` (Windows: `%USERPROFILE%\.erpnext-mcp\credentials.json`)

Written by `npm run setup-sid` or `npm run setup-auth`. The MCP server loads it via `ERPNEXT_CREDENTIALS_FILE`. Use **one** auth method per file — do not commit this file to git.

**SID session (recommended)** — from `npm run setup-sid`:

```json
{
  "ERPNEXT_URL": "https://erp.livro.systems",
  "ERPNEXT_SID": "your-session-id-from-browser-cookies",
  "ERPNEXT_CSRF_TOKEN": "optional-csrf-token-from-devtools",
  "_meta": {
    "authMethod": "sid",
    "loggedUser": "you@livro.systems",
    "savedAt": "2026-06-16T01:00:00.000Z",
    "setupVersion": 1
  }
}
```

**API key** — from `npm run setup-auth` (option 1):

```json
{
  "ERPNEXT_URL": "https://erp.livro.systems",
  "ERPNEXT_API_KEY": "your-api-key",
  "ERPNEXT_API_SECRET": "your-api-secret",
  "_meta": {
    "authMethod": "api_key",
    "loggedUser": "you@livro.systems",
    "savedAt": "2026-06-16T01:00:00.000Z",
    "setupVersion": 1
  }
}
```

**Username / password** — from `npm run setup-auth` (option 2):

```json
{
  "ERPNEXT_URL": "https://erp.livro.systems",
  "ERPNEXT_USERNAME": "you@livro.systems",
  "ERPNEXT_PASSWORD": "your-password",
  "_meta": {
    "authMethod": "password",
    "loggedUser": "you@livro.systems",
    "savedAt": "2026-06-16T01:00:00.000Z",
    "setupVersion": 1
  }
}
```

Supported keys: `ERPNEXT_URL`, `ERPNEXT_SID`, `ERPNEXT_CSRF_TOKEN`, `ERPNEXT_COOKIE`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`, `ERPNEXT_USERNAME`, `ERPNEXT_PASSWORD`. `_meta` is optional metadata added by setup scripts.

After `npm run setup-sid`, ready-made snippets are written to:

`~/.erpnext-mcp/client-configs/` (or `%USERPROFILE%\.erpnext-mcp\client-configs\` on Windows)


| File                         | Client                          |
| ---------------------------- | ------------------------------- |
| `cursor.mcp.json`            | Cursor                          |
| `claude_desktop_config.json` | Claude Desktop                  |
| `gemini.settings.json`       | Gemini CLI                      |
| `opencode.config.json`       | OpenCode                        |
| `mcpServers.json`            | All JSON clients (shared block) |


Re-export anytime: `npm run export-mcp-config`

### Step 4 — Connect your AI client

Follow the [Client tutorials](#client-tutorials) for your tool:


| Client         | Tutorial                          |
| -------------- | --------------------------------- |
| Cursor         | [Cursor](#cursor)                 |
| Claude Desktop | [Claude Desktop](#claude-desktop) |
| Gemini CLI     | [Gemini CLI](#gemini-cli)         |
| OpenCode       | [OpenCode](#opencode)             |


Each tutorial lists the config file path, merge steps, a full JSON example, and test prompts. Snippets from `npm run setup-sid` are in `~/.erpnext-mcp/client-configs/`.

---

## Client tutorials

Prerequisites for every client:

1. `npm install && npm run build`
2. `npm run setup-profile`
3. `npm run setup-sid` (writes configs to `~/.erpnext-mcp/client-configs/`)


| Client                            | Config file (Windows)                                     | Config file (macOS / Linux)                                       |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| [Cursor](#cursor)                 | `%APPDATA%\Cursor\User\globalStorage\cursor.mcp\mcp.json` | `~/.cursor/mcp.json`                                              |
| [Claude Desktop](#claude-desktop) | `%APPDATA%\Claude\claude_desktop_config.json`             | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| [Gemini CLI](#gemini-cli)         | `~/.gemini/settings.json`                                 | `~/.gemini/settings.json`                                         |
| [OpenCode](#opencode)             | `%APPDATA%\opencode\config.json`                          | `~/.config/opencode/config.json`                                  |


All four use the same JSON `mcpServers` block. Only **Codex CLI** uses TOML (`~/.codex/config.toml`) — see `client-configs/codex.config.toml` after `setup-sid`.

### Cursor

**Config file**


| OS            | Path                                                      |
| ------------- | --------------------------------------------------------- |
| Windows       | `%APPDATA%\Cursor\User\globalStorage\cursor.mcp\mcp.json` |
| macOS / Linux | `~/.cursor/mcp.json`                                      |


**Steps**

1. Finish [Setup](#setup) steps 1–3 (`npm run build`, `setup-profile`, `setup-sid`).
2. Open Cursor → **Settings** → **MCP** → **Edit config**
  Or edit the file above directly in a text editor.
3. Merge the `mcpServers` block from `~/.erpnext-mcp/client-configs/cursor.mcp.json`
  If the file already has other servers, add `"erpnext": { ... }` inside `mcpServers` — do not replace the whole file unless it is empty.
4. Use absolute paths for `args` and `ERPNEXT_CREDENTIALS_FILE` (Windows: forward slashes work in JSON, e.g. `C:/Users/...`).
5. **Reload** Cursor (Command Palette → “Developer: Reload Window”) or restart Cursor.
6. Open **Chat** → confirm **erpnext** appears under MCP tools (green / connected).

**Full example** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["C:/Users/you/Documents/PROJECTS/MCPs/erpnext-mcp-server/build/index.js"],
      "env": {
        "ERPNEXT_URL": "https://erp.livro.systems",
        "ERPNEXT_CREDENTIALS_FILE": "C:/Users/you/.erpnext-mcp/credentials.json"
      }
    }
  }
}
```

**Test in chat**

```
Call check_auth on the erpnext MCP server.
Then get_user_profile with sync true.
```

**Tips**

- Project skills in `.cursor/skills/` load automatically when this repo is open.
- If MCP shows red / disconnected, run `npm run verify-auth` then `npm run setup-sid`.

---

### Claude Desktop

**Config file**


| OS      | Path                                                              |
| ------- | ----------------------------------------------------------------- |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json`                     |
| macOS   | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Linux   | `~/.config/Claude/claude_desktop_config.json`                     |


**Steps**

1. Complete setup steps 1–3.
2. Quit Claude Desktop completely (tray icon → Exit).
3. Open the config file above. Create it if missing:
  ```json
   {
     "mcpServers": {}
   }
  ```
4. Paste the `erpnext` entry from `~/.erpnext-mcp/client-configs/claude_desktop_config.json` into `mcpServers`.
5. Save the file.
6. Start Claude Desktop again.
7. New chat → look for the **hammer / tools** icon — **erpnext** tools should be listed.

**Full example** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["C:/Users/you/Documents/PROJECTS/MCPs/erpnext-mcp-server/build/index.js"],
      "env": {
        "ERPNEXT_URL": "https://erp.livro.systems",
        "ERPNEXT_CREDENTIALS_FILE": "C:/Users/you/.erpnext-mcp/credentials.json"
      }
    }
  }
}
```

**Test in chat**

```
Use the erpnext MCP tool check_auth and tell me if I'm logged in.
List my Livro Tasks where dev_assignee is me.
```

**Tips**

- Claude only loads MCP config on startup — always restart after edits.
- Keep secrets in `credentials.json`; reference it via `ERPNEXT_CREDENTIALS_FILE`, not inline in config.

---

### Gemini CLI

**Config file**


| OS  | Path                      |
| --- | ------------------------- |
| All | `~/.gemini/settings.json` |


**Steps**

1. Complete setup steps 1–3.
2. Install [Gemini CLI](https://github.com/google-gemini/gemini-cli) if not already installed.
3. Open or create `~/.gemini/settings.json`.
4. Merge `mcpServers` from `~/.erpnext-mcp/client-configs/gemini.settings.json`.

Example minimal file:

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["/absolute/path/to/erpnext-mcp-server/build/index.js"],
      "env": {
        "ERPNEXT_URL": "https://erp.livro.systems",
        "ERPNEXT_CREDENTIALS_FILE": "/home/you/.erpnext-mcp/credentials.json"
      }
    }
  }
}
```

1. Save and start a new Gemini CLI session:
  ```bash
   gemini
  ```
2. Run `/mcp` (if your CLI version supports it) to list connected servers, or ask the model to use erpnext tools.

**Test in chat**

```
@mcp erpnext check_auth
```

Or in natural language:

```
Using MCP server erpnext, call get_user_profile with sync true and summarize my employee info.
```

**Tips**

- Exact slash commands depend on your Gemini CLI version — natural-language tool use also works once MCP is connected.
- Ensure `node` is on your PATH in the same shell environment Gemini uses.

---

### OpenCode

**Config file**


| OS            | Path                             |
| ------------- | -------------------------------- |
| Windows       | `%APPDATA%\opencode\config.json` |
| macOS / Linux | `~/.config/opencode/config.json` |


**Steps**

1. Complete setup steps 1–3.
2. Open or create the config file for your OS.
3. Merge content from `~/.erpnext-mcp/client-configs/opencode.config.json`
  OpenCode expects the same `mcpServers` JSON shape as Cursor and Claude.
4. Save the file.
5. Restart OpenCode (or start a new session) so it reloads MCP servers.
6. Confirm **erpnext** is available in the tool / MCP panel.

**Full example** (`~/.config/opencode/config.json` or Windows `%APPDATA%\opencode\config.json`):

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["C:/Users/you/Documents/PROJECTS/MCPs/erpnext-mcp-server/build/index.js"],
      "env": {
        "ERPNEXT_URL": "https://erp.livro.systems",
        "ERPNEXT_CREDENTIALS_FILE": "C:/Users/you/.erpnext-mcp/credentials.json"
      }
    }
  }
}
```

**Test in chat**

```
Call erpnext get_user_profile, then get_doctype_schema for Livro Task.
```

**Tips**

- If the config file has other keys, only add/merge the `mcpServers` section.
- On Windows, create `%APPDATA%\opencode\` if the folder does not exist yet.

---

## Verify & troubleshoot

### Step 5 — Verify connection

1. **Auth** — ask: `Call check_auth on erpnext` → expect `"authenticated": true`.
2. **Profile** — ask: `get_user_profile with sync true` → name, email, `employeeId`.
3. **Schema** — ask: `get_doctype_schema for Livro Task` → cached fields.
4. **Inspector** (optional):

```bash
npm run inspector
```

### Common issues


| Symptom                    | Fix                                                  |
| -------------------------- | ---------------------------------------------------- |
| MCP red / disconnected     | `npm run verify-auth` → if fail, `npm run setup-sid` |
| `Invalid or expired sid`   | Re-run `npm run setup-sid`, restart client           |
| `ERPNEXT_URL is required`  | Add `ERPNEXT_URL` to `env` in MCP config             |
| Server not found           | Use **absolute** path to `build/index.js` in `args`  |
| Tools not showing (Claude) | Fully quit and reopen Claude Desktop                 |
| Tools not showing (Cursor) | Reload window; check MCP settings enabled            |
| Node not found             | Install Node 18+; ensure `node` is on PATH           |


### Re-export configs

```bash
npm run export-mcp-config
```

Prints snippets and refreshes `~/.erpnext-mcp/client-configs/`.

---

### Setup scripts reference


| Command                     | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `npm run setup-profile`     | Set full name, position, work email, company, department |
| `npm run setup-sid`         | Browser SID login + credentials + MCP config export      |
| `npm run setup-auth`        | API key, password, or SID (menu)                         |
| `npm run verify-auth`       | Test saved ERPNext credentials                           |
| `npm run export-mcp-config` | Re-export MCP snippets for Cursor, Claude, etc.          |


CLI binaries (after `npm install -g` or `npx`):

- `erpnext-mcp-setup-profile`
- `erpnext-mcp-setup-sid`
- `erpnext-mcp-setup-auth`
- `erpnext-mcp-verify-auth`

## Profile-first workflow

All ERPNext skills in this repo call `**get_user_profile` first**. Identity drives leave letters, MOM attribution, task filters, and salary scope.


| When          | Use                                                              |
| ------------- | ---------------------------------------------------------------- |
| MCP connected | `get_user_profile` / `update_user_profile`                       |
| MCP down      | `npm run setup-profile` or `.cursor/memory-lane/user-profile.md` |


Details: `.cursor/skills/_shared/profile-first.md`, `.cursor/memory-lane/doctypes/`, and `.cursor/skills/memory-lane-doctype-schema/SKILL.md`.

## Development

```bash
npm install
npm run build        # Compile TypeScript → build/
npm run typecheck    # Type-check without emit
npm run watch        # Rebuild on change
npm run inspector    # MCP Inspector for debugging
```

### Project layout

```
src/
├── client/erpnext-client.ts   # ERPNext REST API client
├── profile/                   # User profile store + ERPNext sync
├── config/credentials.ts      # Credential file loading
├── handlers/
│   ├── resources.ts           # MCP resource handlers
│   └── tools/                 # Tool definitions + handlers
├── server.ts                  # Server bootstrap
└── index.ts                   # Entry point
scripts/                       # setup-profile, setup-sid, setup-auth, …
.cursor/
├── memory-lane/               # Profile markdown fallback
└── skills/                    # ERPNext domain skills (profile-first)
```

## Releases

Version history is in [CHANGELOG.md](./CHANGELOG.md).

```bash
npm version patch   # or minor / major
git push && git push --tags
```

Pushing a `v*` tag triggers the GitHub Release workflow (`.github/workflows/release.yml`).

## License

MIT — see [LICENSE](./LICENSE).

Based on the original [erpnext-mcp-server](https://github.com/rakeshgangwar/erpnext-mcp-server) by Rakesh Gangwar. Maintained and extended by **Hervey Geralph Mapano**.