# Salary summary output format

Use this structure when replying to the user. Adjust sections to the request.

## Quick summary (latest slip)

```
Employee: [employee_name] ([EMP/xxxxx])
Department: [department] · [designation]
Latest period: [start_date] → [end_date]
Payroll run: [posting_date]

| | Amount (PHP) |
|---|--:|
| Gross pay | 10,137.95 |
| Deductions | 760.35 |
| Net pay | 9,377.60 |
| Rounded total | 9,378.00 |

YTD net (from slip): [year_to_date]
YTD gross (from slip): [gross_year_to_date]

Open in ERPNext: https://erp.livro.systems/app/salary-slip/[name]
```

## Payslip history table

```
| Period | Gross | Deductions | Net | Slip |
|--------|------:|-----------:|----:|------|
| 2025-10-06 → 2025-10-20 | 10,137.95 | 760.35 | 9,377.60 | Sal Slip/.../00012 |
| 2025-09-21 → 2025-10-05 | 9,500.00 | 1,024.14 | 8,475.86 | Sal Slip/.../00011 |
```

Add footer:

```
Totals ([N] periods): Gross [x] · Deductions [y] · Net [z]
Average net per period: [z/N]
```

## Earnings & deductions (single slip)

```
Period: [start_date] → [end_date] · [name]

Earnings
| Component | Amount | YTD |
|-----------|-------:|----:|
| Basic | 9,000.00 | 99,000.00 |
| Overtime | 1,137.95 | 4,506.54 |

Deductions
| Component | Amount | YTD |
|-----------|-------:|----:|
| Philhealth | 450.00 | 2,700.00 |
| Pagibig | 200.00 | 1,200.00 |
| Late | 110.35 | 882.76 |

Gross: [gross_pay] · Net: [net_pay]
```

## Year summary

```
[Year] salary summary — [employee_name]

| Metric | PHP |
|--------|----:|
| Payslips | [count] |
| Total gross | [sum] |
| Total deductions | [sum] |
| Total net | [sum] |
| Latest YTD net (ERPNext) | [year_to_date from latest slip] |
```

## Access denied (403)

```
Could not access [Salary Summary / report / other employee].

Your ERPNext role can read your own Salary Slips only. For company payroll reports, ask HR or request HR Manager permissions.
```

## Formatting rules

- Use comma thousands separators: `9,377.60`
- Currency label: **PHP** (once in header or column title)
- Dates: `YYYY-MM-DD` or readable `Mon DD, YYYY` for user-facing text
- Link slip names to ERPNext when showing a single slip
