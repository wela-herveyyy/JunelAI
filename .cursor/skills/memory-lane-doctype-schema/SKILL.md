---
name: memory-lane-doctype-schema
description: >-
  Use cached DocType schemas before building ERPNext queries. Call
  get_doctype_schema for visited doctypes; read .cursor/memory-lane/doctypes/
  seeds for Livro DocTypes. Use when filtering, creating documents, or unsure
  of field names.
---

# Memory Lane — DocType schema cache

**Refer to cached structure before guessing field names.**

Read [_shared/profile-first.md](../_shared/profile-first.md) for user identity; this skill covers **DocType shape**.

## Hard rules

1. **Schema before query** — for any DocType workflow, call `get_doctype_schema` (or read seed) before `get_documents` / `create_document`.
2. **Cache on visit** — first `get_doctype_schema` fetches from ERPNext and saves to `~/.erpnext-mcp/doctypes/`.
3. **Prefer cache** — do not call `get_doctype_fields` if `get_doctype_schema` already has the DocType.
4. **Refresh when stale** — user says fields changed → `get_doctype_schema` with `refresh: true`.
5. **Seeds for Livro** — read `.cursor/memory-lane/doctypes/{slug}.json` for key fields and filters while offline or before MCP fetch.

## MCP tools

| Tool | When |
|------|------|
| `get_doctype_schema` | Before queries/creates on a DocType |
| `list_doctype_schemas` | See cached DocTypes |
| `get_doctype_schema` + `refresh: true` | Re-pull from ERPNext |

Resource: `erpnext://doctype-schema/{doctype}`

## Workflow

### 1. Resolve schema

```json
{
  "server": "user-erpnext",
  "toolName": "get_doctype_schema",
  "arguments": { "doctype": "Livro Task" }
}
```

Or read seed: `.cursor/memory-lane/doctypes/livro-task.json`

### 2. Build query from schema

Use `keyFields` / `listFields` for `fields` array.  
Use `commonFilters` for `filters` keys.  
Use `childTables` when you need `get_document` for nested rows.

### 3. After first access

Schema is cached automatically — later sessions skip ERPNext meta fetch.

## Seed files (project)

| DocType | Seed path |
|---------|-----------|
| Livro Task | [livro-task.json](../../memory-lane/doctypes/livro-task.json) |
| Leave Application | [leave-application.json](../../memory-lane/doctypes/leave-application.json) |
| Minutes of Meeting | [minutes-of-meeting.json](../../memory-lane/doctypes/minutes-of-meeting.json) |
| Salary Slip | [salary-slip.json](../../memory-lane/doctypes/salary-slip.json) |
| Sprint Backlogs | [sprint-backlogs.json](../../memory-lane/doctypes/sprint-backlogs.json) |

## Skill integration order

```
get_user_profile → get_doctype_schema → get_documents / create_document
```

## Domain skill links

| Skill | DocType seed |
|-------|----------------|
| erpnext-livro-task | livro-task.json |
| erpnext-leave-application | leave-application.json |
| erpnext-minutes-of-meeting | minutes-of-meeting.json |
| erpnext-salary-summary | salary-slip.json |

When a domain skill runs, load its seed **and** refresh MCP cache if not listed in `list_doctype_schemas`.

## New DocTypes

When you access a DocType not in seeds:

1. `get_doctype_schema` — caches it.
2. Optionally add a seed under `.cursor/memory-lane/doctypes/{slug}.json` with `keyFields` and `commonFilters` for the team (manual or agent-assisted).

## Do not

- Guess filter field names (e.g. `assignee` vs `dev_assignee`).
- Re-fetch schema every message if cache exists and user did not ask to refresh.
