# DocType schema cache

Field structures for ERPNext DocTypes the agent has visited. Used to build filters and payloads without re-fetching every session.

## Primary: MCP cache

| Tool | When |
|------|------|
| `get_doctype_schema` | Before querying an unfamiliar DocType |
| `list_doctype_schemas` | See what is already cached |
| `get_doctype_schema` + `refresh: true` | Schema changed in ERPNext |

Stored at `~/.erpnext-mcp/doctypes/{slug}.json`.

Resource: `erpnext://doctype-schema/{doctype}`

## Project reference (committed seeds)

| File | DocType |
|------|---------|
| `sprint-backlogs.json` | Sprint Backlogs (SPB-xxxx) |
| `leave-application.json` | Leave Application |
| `minutes-of-meeting.json` | Minutes of Meeting |
| `salary-slip.json` | Salary Slip |
| `sprint-backlogs.json` | Sprint Backlogs (SPB-xxxx) |

Seeds document **key fields** and **common filters** from Livro skills. MCP cache holds full fetched schemas after first access.

## Workflow

1. Check `list_doctype_schemas` or read seed in this folder.
2. If missing → `get_doctype_schema` with `doctype`.
3. Use `keyFields` / `commonFilters` from seed + `fields` from cache for `get_documents` queries.
4. After visiting a new DocType, cache is auto-saved — no manual step.

See [memory-lane-doctype-schema](../skills/memory-lane-doctype-schema/SKILL.md).
