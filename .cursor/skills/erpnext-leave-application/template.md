# Leave Application description template

Plain text for `description`. **All identity placeholders come from `get_user_profile`.**

## Profile mapping

| Placeholder | Profile field |
|-------------|---------------|
| `[Employee full name]` | `fullName` |
| `[Designation]` | `position` |
| `[Department]` | `department` |
| `[email]` | `workEmail` |
| `[Approver title and name]` | From Employee `leave_approver` (query if not in profile) |

## Full letter

```
Dear [Approver title and name],

I am writing to formally request a [leave_type lowercased] on [weekday], [Month DD, YYYY].

[One or two sentences: reason, coverage plan, tasks handed off.]

I will make sure my current tasks are updated before my leave, and I remain reachable at [email] for any urgent concerns.

Thank you for your consideration.

Best regards,

[Employee full name]
[Designation] | [Department]
```

## Short reason

If the user only gives a short reason, expand using profile sign-off — never invent name, email, or title.

## Half-day / sick leave

Same profile mapping. Mention morning/afternoon for half-day if user specifies.

## Example structure (substitute from profile)

```
Dear [approver],

I am writing to formally request a vacation leave on [date].

[reason]

I remain reachable at [profile.workEmail] for urgent concerns.

Best regards,

[profile.fullName]
[profile.position] | [profile.department]
```

Do not copy hardcoded names from old drafts — always substitute live profile values.
