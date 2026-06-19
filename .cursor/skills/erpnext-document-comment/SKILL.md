---
name: erpnext-document-comment
description: >-
  Add or list timeline comments on any ERPNext document via the erpnext MCP
  server. Profile-first. Use when the user asks to comment on a task, leave,
  sprint backlog, ticket, or any doctype record, or to read comments on a document.
---

# ERPNext Document Comment

Post and read **timeline comments** on any ERPNext document using **only** the `user-erpnext` MCP server.

**Profile-first:** Read [_shared/profile-first.md](../_shared/profile-first.md).  
**Auth:** Lazy — no `check_auth` unless errors ([_shared/auth-lazy.md](../_shared/auth-lazy.md)).

## Hard rules

- **Only** `CallMcpTool` on server `user-erpnext`. No shell scripts.
- **`get_user_profile`** with `sync: true` — step 1.
- **Use `note_document`** to post comments (preferred). Do not pass a nested `doc` object to `call_method`.
- **Do not** `create_document` on DocType `Comment` — Livro blocks direct Comment create (PermissionError).
- **Verify the target document exists** before commenting (`get_document` or `get_documents`).

## Workflow — add comment

1. **`get_user_profile`** — `fullName`, `workEmail`, `erpnextUser`.
2. **Resolve target** from user message:
   - DocType + name (e.g. `Livro Task` / `LT-2026-09102`, `Leave Application` / `HR-LAP-2025-00164`, `Sprint Backlogs` / `SPB-01010`).
   - ERPNext URL → extract doctype slug and name.
   - If ambiguous → `get_documents` with filters; ask once.
3. **`get_document`** — confirm `{doctype, name}` exists. Stop with clear error if not found.
4. **Comment text** — use user's words; plain text default. For rich updates (bullets, bold), see [html-format.md](html-format.md).
5. **`note_document`** — post comment (identity from profile):

```json
{
  "server": "user-erpnext",
  "toolName": "note_document",
  "arguments": {
    "doctype": "<DocType>",
    "name": "<document name>",
    "data": {
      "message": "<comment text>"
    },
    "comment_by": "<profile.fullName>",
    "comment_email": "<profile.erpnextUser>"
  }
}
```

`comment_by` and `comment_email` default from profile if omitted after `get_user_profile`.

6. **Reply** to `profile.fullName`: comment posted, document link, comment `name` from response.

## Workflow — list comments

```json
{
  "toolName": "get_documents",
  "arguments": {
    "doctype": "Comment",
    "fields": ["name", "content", "comment_by", "comment_email", "creation"],
    "filters": {
      "reference_doctype": "<DocType>",
      "reference_name": "<document name>"
    },
    "limit": 20
  }
}
```

Order by `creation desc` is not supported in filters — present results sorted in the reply.

## Document links

| DocType | URL pattern |
|---------|-------------|
| Livro Task | `https://erp.livro.systems/app/livro-task/{name}` |
| Sprint Backlogs | `https://erp.livro.systems/app/sprint-backlogs/{name}` |
| Leave Application | `https://erp.livro.systems/app/leave-application/{name}` |
| Other | `https://erp.livro.systems/app/{slug}/{name}` — slug = doctype lowercased, spaces → hyphens |

## Errors

| Error | Action |
|-------|--------|
| `DoesNotExistError` | Document name wrong or deleted — re-resolve with user |
| `socket hang up` | Usually wrong args (nested `doc`) or very large HTML — use `note_document` with flat fields; prefer plain text |
| `PermissionError` | User lacks access to that DocType — do not retry |
| Session expired | [_shared/auth-lazy.md](../_shared/auth-lazy.md) → `refresh-auth` |

## Do not

- Post comments without user-provided or confirmed content.
- Use `@` mentions unless user asks (plain text is fine).
- Edit or delete comments unless user explicitly asks (no delete tool in standard workflow).

## Examples

See [examples.md](examples.md).
