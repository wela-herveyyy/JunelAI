---
name: erpnext-leave-application
description: >-
  Create or update Livro ERPNext Leave Application drafts via the erpnext MCP
  server only. Use when the user asks to file leave, request vacation/sick leave,
  save a leave draft, or submit a Leave Application in ERPNext.
---

# ERPNext Leave Application

Create Livro **Leave Application** records using **only** the `user-erpnext` MCP server.

## Hard rules

- **Only** `CallMcpTool` on server `user-erpnext`. No shell scripts, no axios, no `npm run save-leave-draft`.
- Read each tool schema under `mcps/user-erpnext/tools/` before calling.
- If auth fails, call `check_auth` and tell the user to run `npm run setup-sid`.
- **Default: save as draft** (`status: "Open"`, docstatus 0). Do **not** call `submit_document` unless the user explicitly asks to submit.

## Workflow

1. **`check_auth`** — stop if not authenticated; note `loggedUser`.
2. **`get_documents`** — resolve the requester's Employee record:
   ```json
   {
     "doctype": "Employee",
     "fields": ["name", "employee_name", "user_id", "company", "department", "leave_approver"],
     "filters": { "user_id": "<loggedUser>" }
   }
   ```
   If no Employee row, stop and tell the user HR must link their ERPNext User to an Employee.
3. Ask the user for anything missing:
   - `leave_type` (e.g. `Vacation Leave`, `Sick Leave`)
   - `from_date` / `to_date` (`YYYY-MM-DD`)
   - `half_day` (0 or 1; if 1, set `half_day_date`)
   - Reason / letter body for `description`
   - Override `leave_approver` only if they specify someone other than the Employee default
4. Set `posting_date` to **today** (meeting date of request) unless the user gives another date.
5. Build `description` using [template.md](template.md) when the user gives a short reason instead of a full letter.
6. **`create_document`** with `doctype: "Leave Application"` and payload below.
7. Reply with:
   - Document `name` (e.g. `HR-LAP-2026-00123`)
   - `status`, dates, `leave_type`
   - Link: `https://erp.livro.systems/app/leave-application/{name}`
   - Reminder: draft is **not submitted** until they approve in ERPNext or ask you to `submit_document`.

## `create_document` payload

Send **only** business fields. Do **not** send `owner`, `creation`, `modified`, `docstatus`, `idx`, `name`, `employee_name`, `total_leave_days`, `leave_balance` (ERPNext calculates these).

```json
{
  "doctype": "Leave Application",
  "data": {
    "naming_series": "HR-LAP-.YYYY.-",
    "employee": "EMP/00259",
    "leave_type": "Vacation Leave",
    "company": "Livro Systems Inc.",
    "department": "Product Dev - LSI",
    "from_date": "2026-06-24",
    "to_date": "2026-06-24",
    "half_day": 0,
    "leave_approver": "denesse@livro.systems",
    "follow_via_email": 1,
    "posting_date": "2026-06-15",
    "letter_head": "Livro Wela",
    "status": "Open",
    "description": "Dear Sir Den,\n\n..."
  }
}
```

### Field reference

| Field | Source | Notes |
|-------|--------|-------|
| `naming_series` | Constant | `HR-LAP-.YYYY.-` |
| `employee` | Employee.name | From logged-in user's Employee record |
| `leave_type` | User | Must match a configured Leave Type |
| `company` | Employee.company | Usually `Livro Systems Inc.` |
| `department` | Employee.department | e.g. `Product Dev - LSI` |
| `from_date` / `to_date` | User | Same date for single-day leave |
| `half_day` | User | `0` full day, `1` half day |
| `half_day_date` | User | Required when `half_day` is 1 |
| `leave_approver` | Employee.leave_approver | Default; override only if asked |
| `follow_via_email` | Constant | `1` |
| `posting_date` | Today | Date the request is filed |
| `letter_head` | Constant | `Livro Wela` |
| `status` | Constant | `Open` for draft |
| `description` | User / template | Plain text letter to approver |

### Livro defaults (when Employee lookup succeeds)

| Field | Typical value |
|-------|----------------|
| `company` | Livro Systems Inc. |
| `letter_head` | Livro Wela |
| `leave_approver` | From Employee (often `denesse@livro.systems` for Product Dev) |

## Submit (optional)

Only when the user **explicitly** says submit / file for approval:

```json
{
  "server": "user-erpnext",
  "toolName": "submit_document",
  "arguments": {
    "doctype": "Leave Application",
    "name": "HR-LAP-2026-00123"
  }
}
```

Warn: submitted leave cannot be edited as draft — only cancelled.

## Update existing draft

1. **`get_document`** — `doctype: "Leave Application"`, `name: "<id>"`
2. Confirm `docstatus` is 0 and `status` is `Open`.
3. **`update_document`** — changed fields only.
4. Submit only if user asks.

## List / check own leave

```json
{
  "doctype": "Leave Application",
  "fields": ["name", "leave_type", "from_date", "to_date", "status", "total_leave_days"],
  "filters": { "employee": "EMP/00259" },
  "limit": 20
}
```

Use the Employee `name` from step 2, ordered by recent dates if needed.

## Example MCP call (draft)

```json
{
  "server": "user-erpnext",
  "toolName": "create_document",
  "arguments": {
    "doctype": "Leave Application",
    "data": {
      "naming_series": "HR-LAP-.YYYY.-",
      "employee": "EMP/00259",
      "leave_type": "Vacation Leave",
      "company": "Livro Systems Inc.",
      "department": "Product Dev - LSI",
      "from_date": "2026-06-24",
      "to_date": "2026-06-24",
      "half_day": 0,
      "leave_approver": "denesse@livro.systems",
      "follow_via_email": 1,
      "posting_date": "2026-06-15",
      "letter_head": "Livro Wela",
      "status": "Open",
      "description": "Dear Sir Den,\n\nI am writing to formally request a vacation leave on Wednesday, June 24, 2026.\n\n..."
    }
  }
}
```

Reference draft: `scripts/drafts/leave-application-2026-06-24.json`
