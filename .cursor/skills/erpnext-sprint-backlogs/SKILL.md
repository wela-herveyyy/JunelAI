---
name: erpnext-sprint-backlogs
description: >-
  Query, create, and update Livro ERPNext Sprint Backlogs records via the erpnext
  MCP server only. Profile-first: get_user_profile before all steps. Use for
  sprint backlog items, dev tasks, assignee workload, Silid tasks, or
  creating/updating backlog records.
---

# ERPNext Sprint Backlogs

Work with Livro **Sprint Backlogs** records using **only** the `user-erpnext` MCP server.

| DocType | ID pattern | Use |
|---------|------------|-----|
| Sprint Backlogs | `SPB-xxxx` | Sprint execution / dev tracker |

Schema seed: [sprint-backlogs.json](../../memory-lane/doctypes/sprint-backlogs.json).  
Do not use the deprecated **Livro Task** doctype or the separate `Product Backlog` doctype (often permission-blocked).

**Profile-first:** All "my tasks" queries and attributions revolve around the user profile. Read [_shared/profile-first.md](../_shared/profile-first.md).

## Hard rules

- **Only** `CallMcpTool` on server `user-erpnext`.
- **`get_user_profile`** with `sync: true` — always step 1.
- **"My / I"** → filter by `profile.erpnextUser` (and `profile.workEmail` if assignee fields use email).
- If user shares role/email → **`update_user_profile`** before querying.
- Do **not** delete unless user explicitly asks.

## Workflow

1. **`get_user_profile`** — `erpnextUser`, `workEmail`, `fullName`, `department`, `position`.
2. **`update_user_profile`** — if user corrected identity this turn.
3. **`get_doctype_schema`** for `Sprint Backlogs` — or read [sprint-backlogs.json](../../memory-lane/doctypes/sprint-backlogs.json). Use `listFields` / `commonFilters` for queries.
4. Pick intent from [queries.md](queries.md) — **every "my" filter uses profile**.
5. Reply addressing **`profile.fullName`** with task links.

## Key fields

See [sprint-backlogs.json](../../memory-lane/doctypes/sprint-backlogs.json) for `dev_assignee`, `current_assignee`, `owner`, `status`, `sprint_assign`, `product_backlogs_reference`, etc.

## Query patterns (profile-driven)

### My dev queue

```json
{
  "doctype": "Sprint Backlogs",
  "filters": { "dev_assignee": "<profile.erpnextUser>", "status": "Open" }
}
```

### My owned backlog

```json
{
  "filters": { "owner": "<profile.erpnextUser>" }
}
```

### Lead assignments (me)

```json
{
  "filters": { "current_assignee": "<profile.erpnextUser>", "status": "Working" }
}
```

### Someone else

Only when user **names** another person — resolve via User lookup; do not use profile.

## Create backlog item

- Default `owner` context: user is **`profile.erpnextUser`** unless they assign to others.
- Gather task fields from user; identity already in profile.
- When creating **for self**: `dev_assignee` = `profile.erpnextUser` if user says "assign to me".

## Workload summary

Title line from profile:

```
Sprint Backlogs status — <profile.fullName> (<profile.workEmail>)
```

Run queries from [queries.md](queries.md) with `profile.erpnextUser` for all "my" scopes.

## Do not

- Use hardcoded emails for "my tasks" — always `profile.erpnextUser`.
- Invent counts — always fetch via MCP.
- Query **Livro Task** — that doctype is retired; use **Sprint Backlogs** only.
