# Salary summary output format

**Profile-first:** Header lines use `get_user_profile` fields. Call profile before formatting.

## Profile → output mapping

| Output line | Profile field |
|-------------|---------------|
| Greeting / "Employee:" | `fullName` |
| Designation suffix | `position` |
| Department line | `department` |
| Employee ID in parens | `employeeId` |
| Company context | `company` |

## Quick summary (latest slip)

```
Salary summary for <profile.fullName>

Employee: <profile.fullName> (<profile.employeeId>)
Department: <profile.department> · <profile.position>
Latest period: [start_date] → [end_date]

| | Amount (PHP) |
|---|--:|
| Gross pay | … |
| Deductions | … |
| Net pay | … |

YTD net: [year_to_date]
Open: https://erp.livro.systems/app/salary-slip/[name]
```

## Payslip history table

```
Payslip history — <profile.fullName>

| Period | Gross | Deductions | Net | Slip |
|--------|------:|-----------:|----:|------|
```

## Earnings & deductions (single slip)

```
<profile.fullName> — [start_date] → [end_date]
```

## Year summary

```
[Year] salary summary — <profile.fullName> (<profile.employeeId>)
```

## Access denied (403)

```
<profile.fullName>, your ERPNext role can read your own Salary Slips only.
```

## Formatting rules

- PHP, comma thousands, dates per `profile.dateFormat` if set else `YYYY-MM-DD`
- Never hardcode employee names — always from profile
