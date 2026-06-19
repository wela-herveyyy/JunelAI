---
name: erpnext-leave-application
description: >-
  Create or update Livro ERPNext Leave Application drafts via the erpnext MCP
  server only. Profile-first: get_user_profile before all steps. Use when the
  user asks to file leave, request vacation/sick leave, or submit Leave Application.
---

# ERPNext Leave Application

Create Livro **Leave Application** records using **only** the `user-erpnext` MCP server.

**Profile-first:** This skill revolves around the user profile. Read [_shared/profile-first.md](../_shared/profile-first.md).

## Hard rules

- **Only** `CallMcpTool` on server `user-erpnext`. No shell scripts, no axios.
- **`get_user_profile`** with `sync: true` — always step 1.
- If user shares identity details → **`update_user_profile`** before creating leave.
- **Do not call `check_auth` every time** — only on auth errors (see [_shared/auth-lazy.md](../_shared/auth-lazy.md)).
- **Default: draft** (`status: "Open"`). Do **not** `submit_document` unless user explicitly asks.

## Workflow

1. **`get_user_profile`** — load `fullName`, `position`, `workEmail`, `company`, `department`, `employeeId`, `erpnextUser`.
2. **`update_user_profile`** — if user gave new name/position/department/email this turn.
3. **`get_doctype_schema`** for `Leave Application` — or [leave-application.json](../../memory-lane/doctypes/leave-application.json).
4. **`get_documents`** — confirm Employee (skip if `employeeId` already set):
   ```json
   {
     "doctype": "Employee",
     "fields": ["name", "employee_name", "company", "department", "leave_approver"],
     "filters": { "user_id": "<profile.erpnextUser>" }
   }
   ```
   If no Employee and no `employeeId`, stop — HR must link User to Employee. If MCP returns more than profile, call `update_user_profile` to sync.
5. Ask only for **leave-specific** fields (profile already covers identity):
   - `leave_type`, `from_date` / `to_date`, `half_day`, reason for `description`
   - Override `leave_approver` only if user specifies
6. **`posting_date`** — today (or `profile.timezone` if set).
7. Build `description` from [template.md](template.md) using **profile fields** for sign-off and contact line.
8. **`create_document`** — payload below; all identity from profile.
9. Reply to **`profile.fullName`**: doc `name`, dates, link, draft reminder.

## `create_document` payload

Identity fields **from profile** — do not hardcode user names or IDs.

```json
{
  "doctype": "Leave Application",
  "data": {
    "naming_series": "HR-LAP-.YYYY.-",
    "employee": "<profile.employeeId>",
    "leave_type": "Vacation Leave",
    "company": "<profile.company>",
    "department": "<profile.department>",
    "from_date": "2026-06-24",
    "to_date": "2026-06-24",
    "half_day": 0,
    "leave_approver": "<from Employee.leave_approver>",
    "follow_via_email": 1,
    "posting_date": "<today>",
    "letter_head": "Livro Wela",
    "status": "Open",
    "description": "<from template.md using profile.fullName, profile.position, profile.department, profile.workEmail>"
  }
}
```

### Field reference

| Field | Source |
|-------|--------|
| `employee` | `profile.employeeId` |
| `company` | `profile.company` |
| `department` | `profile.department` |
| `description` | [template.md](template.md) + profile sign-off |
| `leave_approver` | Employee record (not profile unless user overrides) |
| Leave dates / type | User message |

## Submit (optional)

Only when user explicitly asks. Use doc `name` from create response.

## List own leave

Filter by `profile.employeeId`:

```json
{
  "doctype": "Leave Application",
  "filters": { "employee": "<profile.employeeId>" },
  "limit": 20
}
```

## Update draft

`get_document` → confirm draft → `update_document`. Re-use profile for any identity fields in `description` edits.
