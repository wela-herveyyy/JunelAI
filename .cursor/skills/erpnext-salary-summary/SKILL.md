---
name: erpnext-salary-summary
description: >-
  Summarize Livro ERPNext salary and payslip data via the erpnext MCP server only.
  Use when the user asks for salary summary, payslip history, net pay, gross pay,
  deductions, YTD earnings, or payroll breakdown for themselves or an employee.
---

# ERPNext Salary Summary

Retrieve and summarize **Salary Slip** data using **only** the `user-erpnext` MCP server.

## Hard rules

- **Only** `CallMcpTool` on server `user-erpnext`. No shell scripts, no axios, no local API calls.
- Read each tool schema under `mcps/user-erpnext/tools/` before calling.
- If auth fails, call `check_auth` and tell the user to run `npm run setup-sid`.
- **Default scope: logged-in user only.** Query another employee only if the user explicitly names them **and** MCP returns data (otherwise explain permission limits).
- Present amounts in **PHP** with 2 decimal places. Do not expose full bank account numbers if present on slips.

## Workflow

1. **`check_auth`** — note `loggedUser`.
2. **`get_documents`** — resolve Employee:
   ```json
   {
     "doctype": "Employee",
     "fields": ["name", "employee_name", "user_id", "company", "department", "designation"],
     "filters": { "user_id": "<loggedUser>" }
   }
   ```
3. Determine scope from the user request:
   - **Latest payslip** → one row + optional breakdown
   - **Last N payslips** → list (default N = 6 for bimonthly ≈ 3 months)
   - **Year** → filter `start_date` / `end_date` containing that calendar year
   - **Date range** → filter slips overlapping range
   - **Specific period** → match `start_date` / `end_date`
4. **`get_documents`** — Salary Slips:
   ```json
   {
     "doctype": "Salary Slip",
     "fields": [
       "name", "start_date", "end_date", "posting_date",
       "gross_pay", "total_deduction", "net_pay", "rounded_total",
       "status", "payroll_frequency", "year_to_date", "gross_year_to_date"
     ],
     "filters": { "employee": "<EMP/xxxxx>", "status": "Submitted" },
     "limit": 24
   }
   ```
   Apply additional filters in memory if MCP filters are limited (year, date range). Prefer most recent slips first (`end_date` descending).
5. For **one slip detail** (breakdown of Basic, OT, Philhealth, Pagibig, etc.):
   **`get_document`** — `doctype: "Salary Slip"`, `name: "<slip id>"`  
   Read child tables: `earnings`, `deductions`, `employer_share`, `loans`.
6. Build summary per [output-format.md](output-format.md).
7. Include ERPNext link for latest slip:  
   `https://erp.livro.systems/app/salary-slip/{name}`

## Filters by request type

| User asks | Action |
|-----------|--------|
| "Latest / last payslip" | Newest `end_date`; optionally `get_document` for breakdown |
| "Salary this month" | Slips where `end_date` month matches (bimonthly may be 2 slips) |
| "2025 summary" | All slips with `start_date` or `end_date` in 2025; sum gross, deductions, net |
| "YTD" | Use `year_to_date` / `gross_year_to_date` from **latest** submitted slip |
| "Compare last 2 payslips" | Two most recent rows, show delta |
| "Employee X" | Lookup Employee by name/email; if 403 or empty, explain self-service limit |

## Aggregations

When summarizing multiple slips:

- **Total gross** = sum of `gross_pay`
- **Total deductions** = sum of `total_deduction`
- **Total net** = sum of `net_pay`
- **Average net** = total net ÷ count
- **YTD net / gross** = prefer `year_to_date` and `gross_year_to_date` from the **most recent** slip (ERPNext-maintained), not manual sum across slips unless user asks for calendar-year totals

## Livro payroll context

- **Company:** Livro Systems Inc.
- **Frequency:** Bimonthly (typical `payroll_frequency`)
- **Currency:** PHP
- **Common earnings:** Basic, Overtime
- **Common deductions:** Philhealth, Pagibig, Late, SSS (when present)
- **Slip ID pattern:** `Sal Slip/EMP/00259/00012`

## HR-only paths (may return 403)

If the user has HR/payroll role, try in order when they need company-wide or `Salary Summary` doctype data:

1. **`get_documents`** / **`get_doctype_fields`** — `doctype: "Salary Summary"`
2. **`run_report`** — e.g. `Salary Register`, `Salary Payments Based On Payment Mode`

If **403**, tell the user their role can only see their own **Salary Slip** records. Do not retry with scripts.

## Permission notes

- Employees typically see **only their own** Salary Slips (filtered by ERPNext permissions).
- **`Salary Summary`** custom doctype exists on Livro but is often HR-restricted.
- Payroll **reports** often require HR Manager role.

## Example: list recent payslips

```json
{
  "server": "user-erpnext",
  "toolName": "get_documents",
  "arguments": {
    "doctype": "Salary Slip",
    "fields": ["name", "start_date", "end_date", "gross_pay", "total_deduction", "net_pay", "year_to_date"],
    "filters": { "employee": "EMP/00259", "status": "Submitted" },
    "limit": 6
  }
}
```

## Example: earnings/deductions breakdown

```json
{
  "server": "user-erpnext",
  "toolName": "get_document",
  "arguments": {
    "doctype": "Salary Slip",
    "name": "Sal Slip/EMP/00259/00012"
  }
}
```

Then tabulate `earnings[]` and `deductions[]` (`salary_component`, `amount`, `year_to_date`).

## Do not

- Create or submit Salary Slips unless the user explicitly asks (payroll is HR).
- Guess payslip amounts — always fetch from MCP.
- Show another employee's salary without confirmed MCP access.
