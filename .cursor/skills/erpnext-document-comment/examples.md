# Comment skill examples

## Plain comment on Livro Task

User: "Comment on LT-2026-09102: Ready for QA retest on staging."

```json
{
  "toolName": "note_document",
  "arguments": {
    "doctype": "Livro Task",
    "name": "LT-2026-09102",
    "data": { "message": "Ready for QA retest on staging." }
  }
}
```

After `get_user_profile`, `comment_by` / `comment_email` can be omitted.

## Comment on Sprint Backlog

User: "Add update to SPB-01010 about the fix."

Use `doctype`: `Sprint Backlogs`, `name`: `SPB-01010`.  
For long formatted updates, use HTML from [html-format.md](html-format.md).

## Comment on Leave Application

User: "Note on my leave HR-LAP-2025-00164 that I'll hand off tasks to Denesse."

```json
{
  "doctype": "Leave Application",
  "name": "HR-LAP-2025-00164",
  "data": {
    "message": "I'll hand off active tasks to Denesse before leave.",
    "author_name": "<profile.fullName>",
    "author_email": "<profile.erpnextUser>"
  }
}
```

## List comments

User: "What comments are on SPB-01010?"

`get_documents` on `Comment` with filters `reference_doctype` + `reference_name`.

## Resolve from URL

URL: `https://erp.livro.systems/app/sprint-backlogs/SPB-01010`  
→ `Sprint Backlogs`, `SPB-01010`
