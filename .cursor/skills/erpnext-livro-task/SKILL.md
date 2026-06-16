---
name: erpnext-livro-task
description: >-
  Query, create, and update Livro ERPNext Livro Task records (product backlog,
  sprints, dev work) via the erpnext MCP server only. Use when the user asks
  about Livro Tasks, LT tickets, backlog, assignee workload, task status,
  overdue tasks, Silid tasks, or creating/updating a Livro Task.
---

# ERPNext Livro Task

Work with Livro **Livro Task** records using **only** the `user-erpnext` MCP server.

**Livro Task = product backlog / dev task tracker.** Do not use the separate `Product Backlog` doctype (often permission-blocked).

## Hard rules

- **Only** `CallMcpTool` on server `user-erpnext`. No shell scripts, no axios.
- Read tool schemas under `mcps/user-erpnext/tools/` before calling.
- If auth fails, call `check_auth` and tell the user to run `npm run setup-sid`.
- Do **not** delete tasks unless the user explicitly asks (`delete_document`).
- Do **not** guess task IDs — list or search first.

## Workflow

1. **`check_auth`** — note `loggedUser`.
2. **`get_doctype_fields`** with `doctype: "Livro Task"` when field names are uncertain.
3. Pick intent (see [queries.md](queries.md)):
   - **My tasks** / **someone's backlog** → `get_documents` with filters
   - **Task detail** → `get_document`
   - **Create task** → `create_document`
   - **Update status/assignee** → `update_document`
   - **Workload summary** → multiple `get_documents` by status
4. Reply with task `name`, `subject`, `status`, key assignees, due date, and link:  
   `https://erp.livro.systems/app/livro-task/{name}`

## Key fields

| Field | Purpose |
|-------|---------|
| `name` | Task ID (e.g. `LT-2026-00652`) |
| `subject` | Title; `(Main)` = epic/parent feature |
| `status` | Workflow state (see below) |
| `type` | `Implementation`, `Feature Request`, `For Enhancement`, `Bugs/Issues`, … |
| `priority` | `Urgent`, `High`, `Medium`, `Low` |
| `owner` | Creator / backlog owner (`user@livro.systems`) |
| `current_assignee` | Who holds the task now (often PM) |
| `dev_assignee` | Developer doing the work |
| `qa_assignee` / `tech_assignee` | Optional roles |
| `project` / `project_name` | ERPNext Project link |
| `project_manager` | PM user id |
| `product_owner` | Often empty |
| `module` | e.g. `RND`, `Core Frappe 15`, `Research and Development` |
| `sprint_assign` | Sprint reference |
| `sprint_points` | Effort estimate |
| `exp_start_date` / `exp_end_date` | Planned dates |
| `description` | HTML (Quill) body |
| `actions_taken` | HTML progress notes |
| `custom_git_branch` | Suggested git commands |
| `custom_pull_request_link` | PR URL |
| `parent_task` / `parent_livro_task` | Parent epic |
| `task_depends` | Child table — sub-tasks (on `get_document`) |
| `is_group` | Parent/group task flag |

### Status values (common)

`Open` · `Working` · `Overdue` · `Pending Review` · `Completed` · `Cancelled` · `Closed` · `Updated Prod`

**Active work** = not in `Completed`, `Cancelled`, `Closed`.

## Query patterns

### Logged-in user's dev queue

```json
{
  "doctype": "Livro Task",
  "fields": ["name", "subject", "status", "priority", "current_assignee", "dev_assignee", "exp_end_date", "modified"],
  "filters": { "dev_assignee": "<loggedUser>", "status": "Open" },
  "limit": 50
}
```

Repeat for `Working`, `Overdue`, `Pending Review` as needed.

### User's owned backlog (product backlog owner)

```json
{
  "filters": { "owner": "<user@livro.systems>" }
}
```

Filter out completed statuses in the response.

### Lead assignments (currently with user)

```json
{
  "filters": { "current_assignee": "<user@livro.systems>", "status": "Working" }
}
```

### By project

```json
{
  "filters": { "project": "PROJ-0253" }
}
```

### Resolve user email

If given a name (e.g. "Ian Rey"), query User or Employee first:

```json
{
  "doctype": "User",
  "fields": ["name", "full_name", "email"],
  "filters": { "full_name": ["like", "%Ian Rey%"] }
}
```

See [queries.md](queries.md) for HR-style workload summaries.

## Task detail (sub-tasks)

```json
{
  "server": "user-erpnext",
  "toolName": "get_document",
  "arguments": {
    "doctype": "Livro Task",
    "name": "LT-2026-00652"
  }
}
```

Read `task_depends[]` for sub-task list (`task_name`, `subject`, `dev_assignee`). Main epics often have `(Main)` in `subject`.

## Create task

Gather from user: `subject`, `type`, `priority`, `dev_assignee`, `description`, optional `project`, dates, `module`.

**Default on create:** `status: "Open"`. Set `current_assignee` and `dev_assignee` per user request; if omitted, ERPNext may default from workflow.

```json
{
  "doctype": "Livro Task",
  "data": {
    "subject": "Silid v3: Example feature",
    "type": "Feature Request",
    "priority": "High",
    "status": "Open",
    "dev_assignee": "ianrey@livro.systems",
    "current_assignee": "denesse@livro.systems",
    "project": "PROJ-0253",
    "module": "Research and Development",
    "exp_start_date": "2026-06-15",
    "exp_end_date": "2026-06-30",
    "description": "<div class=\"ql-editor read-mode\"><p>...</p></div>"
  }
}
```

Do **not** send system fields (`owner`, `creation`, `name`, `lft`, `rgt`, …).

Wrap `description` in `<div class="ql-editor read-mode">...</div>` when using HTML.

## Update task

```json
{
  "doctype": "Livro Task",
  "name": "LT-2026-00218",
  "data": {
    "status": "Working",
    "actions_taken": "<div class=\"ql-editor read-mode\"><p>Started migration script.</p></div>"
  }
}
```

Common updates: `status`, `dev_assignee`, `current_assignee`, `exp_end_date`, `custom_pull_request_link`, `actions_taken`.

Confirm with `get_document` before large description merges.

## Workload summary (for one user)

Run parallel queries for `dev_assignee` + each active status. Present:

| Status | Count | Notable items |
|--------|------:|---------------|
| Open | n | … |
| Working | n | … |
| Overdue | n | … |
| Pending Review | n | … |

Flag **Urgent** / **High** + past `exp_end_date`.

## Permission notes

- Users see tasks their role allows; some lists may be partial.
- `Product Backlog` doctype is separate and often 403 — use **Livro Task** with `owner` filter instead.

## Do not

- Use standard ERPNext `Task` doctype unless user explicitly says so.
- Submit/cancel Livro Tasks (not a submittable doctype in typical use).
- Invent task counts — always fetch via MCP.
