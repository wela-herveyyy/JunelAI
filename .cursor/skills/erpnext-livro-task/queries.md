# Livro Task query reference

**All "my" queries use `get_user_profile` first.** Substitute `profile.erpnextUser` for `loggedUser` and `profile.workEmail` / `profile.fullName` in report headers.

## Filter cheat sheet

| User intent | Filter |
|-------------|--------|
| My open dev tasks | `dev_assignee` = `profile.erpnextUser`, `status` = Open |
| My active dev work | `dev_assignee` = `profile.erpnextUser` + active statuses |
| Tasks assigned to me (lead) | `current_assignee` = `profile.erpnextUser` |
| My owned backlog | `owner` = `profile.erpnextUser` |
| Someone's backlog | `owner` = their email (user must name them) |
| Project board | `project` = PROJ-xxxx |
| Urgent open items | `priority` = Urgent, `status` = Open |

## Work status report template

```
Livro Task status — <profile.fullName> (<profile.workEmail>)
Department: <profile.department> · <profile.position>
As of: [today]

Lead assignments (current_assignee = profile.erpnextUser)
| ID | Subject | Status | Priority | Due |

Dev workload (dev_assignee = profile.erpnextUser) — active
| Status | Count |
|--------|------:|

Owned backlog (owner = profile.erpnextUser) — active: [n]
```

## List fields (default)

```json
["name", "subject", "status", "type", "priority", "owner", "current_assignee", "dev_assignee", "project_name", "exp_end_date", "modified"]
```

## ERPNext links

`https://erp.livro.systems/app/livro-task/{name}`

## Create — assign to self

When user says "create a task for me":

```json
{
  "dev_assignee": "<profile.erpnextUser>",
  "subject": "...",
  "type": "Feature Request",
  "status": "Open"
}
```

## Resolve another user by name

Only when user names someone else — query User; do not use profile for their filters.
