# Profile-first contract (all ERPNext skills)

Every skill in this MCP server **revolves around the logged-in user's profile**. Identity is never guessed from chat history alone.

## Required first step

Before any ERPNext tool call (except `get_user_profile` itself):

```json
{
  "server": "user-erpnext",
  "toolName": "get_user_profile",
  "arguments": { "sync": true }
}
```

If the user shares new identity facts in the same turn, call `update_user_profile` **before** continuing the workflow.

## Profile fields

| Field | ERPNext / display use |
|-------|------------------------|
| `fullName` | Letters, MOM attribution, salary header, salutations |
| `position` | Leave sign-off, MOM roles, salary designation line |
| `workEmail` | Contact in letters, task owner filters, reachability |
| `company` | Leave Application, payroll context |
| `department` | Leave, MOM, salary department line |
| `erpnextUser` | **Primary filter key** — replace all `<loggedUser>` / `<user@livro.systems>` placeholders |
| `employeeId` | Leave, Salary Slip filters (`employee`) |
| `employeeName` | Display when `fullName` empty |
| `timezone` | Date defaults when user says "today" |
| `dateFormat` | Format dates in replies |
| `notes` | Free-form preferences the user asked to remember |

## Substitution rules

In all skills, templates, and examples:

| Do not hardcode | Use instead |
|-----------------|-------------|
| `hervey@livro.systems` | `profile.workEmail` or `profile.erpnextUser` |
| `Hervey`, `Hervey Geralph…` | `profile.fullName` (first name = first token) |
| `EMP/00259` | `profile.employeeId` |
| `loggedUser` | `profile.erpnextUser` |
| `Product Dev - LSI` | `profile.department` |
| `Web Developer` | `profile.position` |
| `Livro Systems Inc.` | `profile.company` |

## Missing profile fields

1. If `sync: true` did not fill a required field, try one targeted MCP lookup (Employee/User).
2. If still empty, ask the user **once**, then `update_user_profile` (MCP) or `npm run setup-profile -- … --json` (agents allowed).
3. Do not proceed with create/update documents that need identity until `employeeId` or `erpnextUser` is set (whichever the skill requires).

## Agent script (allowed)

When MCP `update_user_profile` is unavailable, agents **may run**:

```bash
npm run setup-profile -- --full-name "<name>" --work-email "<email>" --position "<title>" --company "<company>" --department "<dept>" --json
```

Prefer MCP `update_user_profile` when the server is connected.

## Skill order (always)

```
get_user_profile → get_doctype_schema (if needed) → update_user_profile (if needed) → skill tools
```

**Do not call `check_auth` before every workflow.** Auth is lazy: the MCP server uses the saved session and only re-validates when ERPNext returns an auth error. Call `check_auth` only if the user asks or after a session-expired failure.

## Auth errors (agent recovery)

If a tool returns session expired / 401 / 403:

1. Ask the user to copy the `sid` cookie from ERPNext DevTools (or copy to clipboard).
2. Run: `npm run refresh-auth -- --sid "PASTED_SID" --json` (or `--clipboard --json`).
3. Tell the user to restart the ERPNext MCP server in Cursor.
4. Retry the failed operation.

See `.cursor/skills/_shared/auth-lazy.md` for full instructions.

## Reply tone

Address the user by `profile.fullName` (first name is fine). Scope "my / I" requests to `profile.erpnextUser` and `profile.employeeId` unless the user explicitly names someone else.

## Fallback

Only if MCP is unavailable: read `.cursor/memory-lane/user-profile.md`, then reconcile via `update_user_profile` when MCP returns.
