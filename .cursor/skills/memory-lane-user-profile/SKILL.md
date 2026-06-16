---
name: memory-lane-user-profile
description: >-
  Profile-first gate for all ERPNext MCP skills. Always call get_user_profile
  before other erpnext tools. Use when any skill needs identity, when the user
  shares name/position/email, or when updating profile settings.
---

# User Profile — center of all ERPNext skills

**Every ERPNext skill in this repo revolves around the user profile.**  
Read [_shared/profile-first.md](../_shared/profile-first.md) — all skills inherit this contract.

## Hard rules

1. **`get_user_profile` first** — no exceptions before leave, MOM, Livro Task, salary, or any create/update.
2. **Profile drives filters** — `erpnextUser`, `employeeId`, `workEmail`, `department`, `company` come from profile, not memory.
3. **Update on learn** — user shares identity → `update_user_profile` when MCP is up; otherwise run `npm run setup-profile` (see below).
4. **Replies use profile** — address user by `fullName`; scope "my" to `erpnextUser` / `employeeId`.
5. **Markdown is backup only** — `.cursor/memory-lane/user-profile.md` when MCP is down.
6. **Agents may run setup-profile** — non-interactive CLI is allowed when saving identity fields.

## Tools

| Tool / command | When |
|----------------|------|
| `get_user_profile` `{ "sync": true }` | Start of every ERPNext session |
| `update_user_profile` | User shares identity — **preferred when MCP is connected** |
| `npm run setup-profile -- …` | **Allowed for agents** — MCP down, or sync JSON + memory-lane markdown |
| `erpnext://user-profile` | Resource equivalent |

Stored at `~/.erpnext-mcp/user-profile.json`.

## Profile → skill map

| Skill | Required profile fields |
|-------|-------------------------|
| Leave application | `employeeId`, `fullName`, `position`, `department`, `company`, `workEmail` |
| Minutes of meeting | `fullName`, `position`, `department`, `workEmail` |
| Livro Task | `erpnextUser`, `workEmail`, `fullName` |
| Salary summary | `employeeId`, `fullName`, `position`, `department`, `company` |

## Workflow

### 1. Load profile

```json
{
  "server": "user-erpnext",
  "toolName": "get_user_profile",
  "arguments": { "sync": true }
}
```

### 2. Patch gaps

If user said e.g. "I'm the Web Developer in Product Dev":

```json
{
  "server": "user-erpnext",
  "toolName": "update_user_profile",
  "arguments": {
    "position": "Web Developer",
    "department": "Product Dev - LSI"
  }
}
```

### 3. Hand off to domain skill

Pass profile context into leave / MOM / task / salary workflow — every filter and letter field substitutes from profile (see shared contract).

## Agent: run setup-profile script

**Agents are allowed to run** `npm run setup-profile` via the Shell tool when:

- MCP `update_user_profile` is unavailable or failed
- User asks to set up / fix profile from terminal
- You need to sync **both** `~/.erpnext-mcp/user-profile.json` and `.cursor/memory-lane/user-profile.md`

Use **non-interactive** flags (never prompt the user in terminal):

```bash
npm run setup-profile -- --full-name "Hervey Geralph C. Mapano" --position "Web Developer" --work-email "hervey.geralph@livro.systems" --company "Livro Systems Inc." --department "Product Dev - LSI" --json
```

Only pass flags the user provided or that are missing from profile. Omit empty fields. Use `--json` so the result is machine-readable.

**Priority:** `update_user_profile` (MCP) first when server is connected; `setup-profile` script as fallback or to refresh markdown.

## User commands

| User says | Action |
|-----------|--------|
| "What's my profile?" | `get_user_profile` → summarize |
| "Update my profile…" | `update_user_profile` (or `setup-profile -- … --json` if MCP down) |
| "Refresh from ERPNext" | `get_user_profile` with `sync: true` |
| "Set up my profile" | `get_user_profile` → ask missing fields → `update_user_profile` or `setup-profile -- … --json` |

## Privacy

- Do not echo `workEmail` outside relevant workflows.
- Confirm before overwriting a non-empty profile field.
