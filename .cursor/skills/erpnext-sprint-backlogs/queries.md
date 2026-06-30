# Sprint Backlogs query reference

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
| Sprint board | `sprint_assign` = sprint name |
| Urgent open items | `priority` = Urgent, `status` = Open |

## Work status report template

```
Sprint Backlogs status — <profile.fullName> (<profile.workEmail>)
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
["name", "subject", "status", "type", "priority", "owner", "current_assignee", "dev_assignee", "sprint_assign", "sprint_points", "module", "exp_end_date", "modified"]
```

## ERPNext links

`{erpnextBaseUrl}/app/sprint-backlogs/{name}` — use the school's ERPNext URL from MCP config (`X-ERPNext-URL`).

## Create — assign to self

When user says "create a task for me":

```json
{
  "doctype": "Sprint Backlogs",
  "dev_assignee": "<profile.erpnextUser>",
  "subject": "...",
  "type": "Feature Request",
  "status": "Open"
}
```

## Resolve another user by name

Only when user names someone else — query User; do not use profile for their filters.
