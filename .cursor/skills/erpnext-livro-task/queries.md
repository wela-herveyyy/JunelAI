# Livro Task query reference

## Filter cheat sheet

| User intent | Filter |
|-------------|--------|
| My open dev tasks | `dev_assignee` = loggedUser, `status` = Open |
| My active dev work | `dev_assignee` + status in Open, Working, Overdue, Pending Review |
| Tasks assigned to me (lead) | `current_assignee` = loggedUser |
| Someone's backlog | `owner` = their email |
| Project board | `project` = PROJ-xxxx |
| Urgent open items | `priority` = Urgent, `status` = Open |
| Main/epic tasks | subject contains `(Main)` or `is_group` = 1 |

Run one query per status if combined filters fail.

## List fields (default)

```json
["name", "subject", "status", "type", "priority", "owner", "current_assignee", "dev_assignee", "project_name", "exp_end_date", "modified"]
```

## Work status report template

```
Livro Task status — [Full Name] ([email])
As of: [today]

Lead assignments (current_assignee)
| ID | Subject | Status | Priority | Due |
|----|---------|--------|----------|-----|

Dev workload (dev_assignee) — active
| Status | Count |
|--------|------:|
| Open | |
| Working | |
| Overdue | |
| Pending Review | |

Owned backlog (owner) — active: [n] items

Risk flags
- [overdue + urgent items]
- [lead tasks past exp_end_date]
```

## ERPNext links

- Task: `https://erp.livro.systems/app/livro-task/{name}`
- URL-encode slashes in `name` when needed (`LT-2026-00652` is fine; paths with special chars may need encoding)

## Silid / R&D context

Common modules: `RND`, `Research and Development`, `Core Frappe 15`  
Common projects: `PROJ-0253`, `PROJ-0054`  
Typical PM assignee: `denesse@livro.systems`

## Create — minimal bug ticket

```json
{
  "subject": "Silid v3: [short title]",
  "type": "Bugs/Issues",
  "priority": "Medium",
  "status": "Open",
  "dev_assignee": "ianrey@livro.systems",
  "module": "RND",
  "description": "<div class=\"ql-editor read-mode\"><p>Steps to reproduce: ...</p></div>"
}
```

## Create — feature / main epic

```json
{
  "subject": "(Main) Silid v3: [feature name]",
  "type": "Feature Request",
  "priority": "High",
  "status": "Open",
  "dev_assignee": "ianrey@livro.systems",
  "current_assignee": "denesse@livro.systems",
  "module": "Research and Development",
  "sprint_points": "21",
  "exp_start_date": "2026-06-01",
  "exp_end_date": "2026-07-31",
  "description": "<div class=\"ql-editor read-mode\"><p>PRD: ...</p></div>"
}
```

Sub-tasks are usually added in ERPNext UI or via `task_depends` on update — prefer `get_document` on parent before adding children unless user provides full structure.
