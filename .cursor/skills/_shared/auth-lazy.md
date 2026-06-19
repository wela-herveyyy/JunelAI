---
name: auth-lazy
description: >-
  Lazy ERPNext auth for agents. Do not call check_auth before every workflow.
  Retry with refresh-auth only when session errors occur. User setup instructions.
---

# Lazy auth — agents read this

## Rules for AI

1. **Do not call `check_auth` at the start of every task.** Go straight to `get_user_profile` then the work (leave, tasks, etc.).
2. **Trust the session** until ERPNext returns an auth error (401, 403, session expired, Guest).
3. **On auth error only:** run `npm run refresh-auth` (see below), ask user to restart MCP, retry once.
4. **Never ask the user to re-login** unless refresh-auth fails.

## One-time user setup

1. Log in to [ERPNext](https://erp.livro.systems) in the browser.
2. Run once (or paste sid to the agent):

```bash
npm run setup-sid
```

Or quick refresh anytime:

```bash
npm run refresh-auth
```

3. In Cursor MCP config, prefer **credentials file** over inline SID:

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["C:/path/to/erpnext-mcp-server/build/index.js"],
      "env": {
        "ERPNEXT_URL": "https://erp.livro.systems",
        "ERPNEXT_CREDENTIALS_FILE": "C:/Users/YOU/.erpnext-mcp/credentials.json"
      }
    }
  }
}
```

4. Restart the ERPNext MCP server after auth changes.

## Agent: refresh session (non-interactive)

When the user pastes a sid in chat:

```bash
npm run refresh-auth -- --sid "PASTED_SID_VALUE" --json
```

If user copied sid to clipboard:

```bash
npm run refresh-auth -- --clipboard --json
```

Auto-find sid from Cursor `mcp.json` or credentials file:

```bash
npm run refresh-auth -- --json
```

Then tell the user: **Restart the ERPNext MCP server in Cursor.**

## When to call check_auth

| Situation | Action |
|-----------|--------|
| Normal leave / task / read | Skip check_auth |
| User asks "am I logged in?" | `check_auth` with `verify: true` |
| After refresh-auth + MCP restart | Optional `check_auth` once |
| Tool returned session expired | refresh-auth, not check_auth first |

## Profile vs auth

- **Profile** (`get_user_profile`) — who the user is (every workflow).
- **Auth** (session sid) — permission to call ERPNext (lazy, error-driven).
