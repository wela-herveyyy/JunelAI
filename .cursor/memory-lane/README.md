# Memory Lane

User profile is the **center of every ERPNext skill** in this repo.

## Primary: MCP (always first)

| Tool | When |
|------|------|
| `get_user_profile` | Before leave, MOM, Livro Task, salary, or any create/update |
| `update_user_profile` | User shares or corrects identity fields |

Stored at `~/.erpnext-mcp/user-profile.json`. Resource: `erpnext://user-profile`.

All skills follow `.cursor/skills/_shared/profile-first.md`.

## Fallback: markdown

| File | Purpose |
|------|---------|
| `user-profile.example.md` | Committed template |
| `user-profile.md` | Local backup if MCP is down (gitignored) |

When MCP returns, reconcile via `update_user_profile`.

## Profile fields used across skills

- **Identity:** `fullName`, `position`, `workEmail`
- **Org:** `company`, `department`
- **ERPNext:** `erpnextUser`, `employeeId`, `employeeName`
- **Prefs:** `timezone`, `dateFormat`, `notes`

## DocType schemas

Cached field structures live in `.cursor/memory-lane/doctypes/` (seeds) and `~/.erpnext-mcp/doctypes/` (MCP cache). See [memory-lane-doctype-schema](../skills/memory-lane-doctype-schema/SKILL.md).

See [memory-lane-user-profile](../skills/memory-lane-user-profile/SKILL.md).

## Setup (fallback only)

If MCP is unavailable and `user-profile.md` does not exist:

```bash
npm run setup-profile
```

Non-interactive (AI agents may run this):

```bash
npm run setup-profile -- --full-name "Your Name" --work-email "you@company.com" --json
```

Or copy the example manually:

```bash
cp .cursor/memory-lane/user-profile.example.md .cursor/memory-lane/user-profile.md
```

Then edit the copy or tell the agent your details in chat.
