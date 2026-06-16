---
name: erpnext-salary-summary
description: >-
  Summarize Livro ERPNext salary and payslip data via the erpnext MCP server
  only. Profile-first: get_user_profile before all steps. Use for payslip
  history, net pay, gross pay, deductions, or YTD for the logged-in user.
---

# ERPNext Salary Summary

Retrieve and summarize **Salary Slip** data using **only** the `user-erpnext` MCP server.

**Profile-first:** Default scope is always the profile user (`employeeId`, `fullName`). Read [_shared/profile-first.md](../_shared/profile-first.md).

## Hard rules

- **Only** `CallMcpTool` on server `user-erpnext`.
- **`get_user_profile`** with `sync: true` — always step 1.
- **Default scope:** `profile.employeeId` / `profile.erpnextUser` — not another employee unless user names them **and** MCP allows.
- Reply header uses **`profile.fullName`**, **`profile.position`**, **`profile.department`**.
- Amounts in **PHP**, 2 decimals. No bank account numbers.

## Workflow

1. **`get_user_profile`** — `employeeId`, `fullName`, `position`, `department`, `company`, `erpnextUser`.
2. **`update_user_profile`** — if user shared identity corrections.
3. **`check_auth`** — scope to `loggedUser` = `profile.erpnextUser`.
4. **`get_doctype_schema`** for `Salary Slip` — or [salary-slip.json](../../memory-lane/doctypes/salary-slip.json).
5. If `employeeId` empty → **`get_documents`** Employee by `profile.erpnextUser`; sync profile via `update_user_profile`.
6. Determine payslip scope (latest, N slips, year, range).
7. **`get_documents`** Salary Slips — `filters: { "employee": "<profile.employeeId>" }`.
8. **`get_document`** for breakdown when needed.
9. Format per [output-format.md](output-format.md) using **profile** in header.
10. Address **`profile.fullName`** in summary.

## Filters by request

| User asks | Scope |
|-----------|-------|
| "My latest payslip" | `profile.employeeId` |
| "My salary this month" | `profile.employeeId` + date filter |
| "Employee X" | Named lookup only — not profile |

## Example list (profile-driven)

```json
{
  "doctype": "Salary Slip",
  "fields": ["name", "start_date", "end_date", "gross_pay", "total_deduction", "net_pay", "year_to_date"],
  "filters": { "employee": "<profile.employeeId>", "status": "Submitted" },
  "limit": 6
}
```

## HR-only paths

May return 403 — explain using `profile.fullName`'s role limits.

## Do not

- Show another employee's salary without explicit name + MCP access.
- Guess amounts or employee ID — use profile + MCP.
