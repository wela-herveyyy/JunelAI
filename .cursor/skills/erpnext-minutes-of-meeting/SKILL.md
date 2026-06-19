---
name: erpnext-minutes-of-meeting
description: >-
  Create or update Livro ERPNext Minutes of Meeting via the erpnext MCP server
  only. Profile-first: get_user_profile before all steps. Use for MOM, meeting
  minutes, or recording team discussions in ERPNext.
---

# ERPNext Minutes of Meeting (MOM)

Create Livro **Minutes of Meeting** records using **only** the `user-erpnext` MCP server.

**Profile-first:** Recorder, department, and attribution come from the user profile. Read [_shared/profile-first.md](../_shared/profile-first.md).

## Hard rules

- **Only** `CallMcpTool` on server `user-erpnext`.
- **`get_user_profile`** with `sync: true` — always step 1.
- **`recorded_by`** — first token of `profile.fullName` unless user names another recorder.
- **`department`** — `profile.department` unless user overrides for this meeting.
- User shares identity → **`update_user_profile`** before create.

## Workflow

1. **`get_user_profile`** — `fullName`, `position`, `workEmail`, `department`.
2. **`update_user_profile`** — if user gave new identity facts.
3. **`get_doctype_schema`** for `Minutes of Meeting` — or [minutes-of-meeting.json](../../memory-lane/doctypes/minutes-of-meeting.json).
4. Gather **meeting-specific** only (profile covers recorder/department):
   - `date_of_meeting`, `meeting_subject`, optional `project`
   - Attendees, discussion body
6. Build HTML per [template.md](template.md) — include **`profile.fullName`** in attendees if they attended.
7. **`create_document`** — payload below.
8. Reply to **`profile.fullName`** with doc `name` and link.

## `create_document` payload

```json
{
  "doctype": "Minutes of Meeting",
  "data": {
    "date_of_meeting": "2026-06-15",
    "meeting_subject": "Silid v2 to Silid v3 Migrations Discussion",
    "recorded_by": "<first name from profile.fullName>",
    "department": "<profile.department>",
    "project": "PROJ-0253",
    "small_text_afux": "<header HTML — profile.fullName in attendees if present>",
    "discussion": "<sectioned HTML from template.md>"
  }
}
```

### Field reference

| Field | Source |
|-------|--------|
| `recorded_by` | First name of `profile.fullName` |
| `department` | `profile.department` |
| Attendees line | Include `profile.fullName` when user was present |
| Action owners in discussion | Attribute speakers; default recorder context from profile |

## Update existing MOM

`get_document` → merge → `update_document`. Preserve profile-based `recorded_by` unless user changes recorder.

## HTML conventions

Unchanged — see [template.md](template.md).
