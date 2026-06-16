---
name: erpnext-minutes-of-meeting
description: >-
  Create or update Livro ERPNext Minutes of Meeting (MOM) documents via the
  erpnext MCP server only. Use when the user asks to create, draft, or save
  meeting minutes, MOM, Minutes of Meeting, or record a team discussion in ERPNext.
---

# ERPNext Minutes of Meeting (MOM)

Create Livro **Minutes of Meeting** records using **only** the `user-erpnext` MCP server.

## Hard rules

- **Only** `CallMcpTool` on server `user-erpnext`. No shell scripts, no axios, no local JSON POST.
- Read each tool schema under `mcps/user-erpnext/tools/` before calling.
- If auth fails, call `check_auth` and tell the user to run `npm run setup-sid` — do not bypass MCP.

## Workflow

1. **`check_auth`** — stop if not authenticated.
2. **`get_doctype_fields`** with `doctype: "Minutes of Meeting"` when field names are uncertain.
3. Gather from the user (or meeting notes they pasted):
   - `date_of_meeting` (YYYY-MM-DD)
   - `meeting_subject`
   - `recorded_by` (recorder first name, e.g. `Hervey`, `Ianrey`)
   - `department` (e.g. `Product Dev - LSI`)
   - `project` (ERPNext Project ID, e.g. `PROJ-0253`) — optional
   - Attendees list + short topic line
   - Discussion body (sections below)
4. Build HTML for `small_text_afux` and `discussion` (see [template.md](template.md)).
5. **`create_document`** with `doctype: "Minutes of Meeting"` and `data` payload below.
6. **`create_document`** with `verbose: true` only if the user wants the full saved doc echoed back.
7. Reply with document `name` and ERPNext link:  
   `https://erp.livro.systems/app/minutes-of-meeting/{name}`

## `create_document` payload

Send **only** business fields. Do **not** send system fields (`owner`, `creation`, `modified`, `docstatus`, `idx`, `name` unless updating).

```json
{
  "doctype": "Minutes of Meeting",
  "data": {
    "date_of_meeting": "2026-06-15",
    "meeting_subject": "Silid v2 to Silid v3 Migrations Discussion",
    "recorded_by": "Hervey",
    "department": "Product Dev - LSI",
    "project": "PROJ-0253",
    "small_text_afux": "<div class=\"ql-editor read-mode\">...</div>",
    "discussion": "<div class=\"ql-editor read-mode\">...</div>"
  }
}
```

### Field reference

| Field | Purpose |
|-------|---------|
| `date_of_meeting` | Meeting date (`YYYY-MM-DD`) |
| `meeting_subject` | Short title (no department prefix) |
| `recorded_by` | Who recorded minutes (first name) |
| `department` | Livro department name |
| `project` | Link to Project doc name |
| `small_text_afux` | Header block: **Attendees** + **Topic** (HTML) |
| `discussion` | Full minutes body (HTML, sectioned) |

ERPNext auto-names records like:  
`{department} - {meeting_subject} {date_of_meeting}`

## HTML conventions

- Wrap content in `<div class="ql-editor read-mode">...</div>`.
- Use `<h3>` for section titles, `<p>` for paragraphs, `<strong>` for emphasis.
- Bullets: `<ol>` or `<ul>` with `<li data-list="bullet">` and `<span class="ql-ui" contenteditable="false"></span>` before text (matches ERPNext Quill export).
- Ordered lists for numbered options/steps: `<li data-list="ordered">`.
- Inline styles (optional, match existing MOMs):  
  `style="color: rgb(48, 48, 48); background-color: transparent;"` on spans.

## Discussion sections (use what applies)

Include only sections relevant to the meeting. Standard order:

1. **Summary**
2. **Initial Process** / context (attribute owner if known)
3. **Issues Identified**
4. **Suggestions** (attribute person)
5. **Policy / requirements**
6. **Questions Raised** (attribute asker)
7. **Options Discussed** (numbered)
8. **Key Decisions & Actions** (owner in parentheses)
9. **Conclusion & Next Steps** (numbered, dates bold)

See [template.md](template.md) for minimal HTML skeleton.

## Update existing MOM

1. **`get_document`** — `doctype: "Minutes of Meeting"`, `name: "<doc name>"`
2. Merge changes into `discussion` or other fields.
3. **`update_document`** — same `doctype`, `name`, and changed fields in `data`.

## Example MCP call

```json
{
  "server": "user-erpnext",
  "toolName": "create_document",
  "arguments": {
    "doctype": "Minutes of Meeting",
    "data": {
      "date_of_meeting": "2026-06-15",
      "meeting_subject": "Silid v2 to Silid v3 Migrations Discussion",
      "recorded_by": "Hervey",
      "department": "Product Dev - LSI",
      "project": "PROJ-0253",
      "small_text_afux": "<div class=\"ql-editor read-mode\"><p><strong>Attendees:</strong> ...</p><p><strong>Topic:</strong> ...</p></div>",
      "discussion": "<div class=\"ql-editor read-mode\"><h3>Summary</h3><p>...</p></div>"
    }
  }
}
```
