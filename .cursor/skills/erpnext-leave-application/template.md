# Leave Application description template

Plain text for the `description` field. Replace bracketed placeholders.

## Full letter (vacation / personal leave)

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

## Short reason (expand before create)

If the user only says e.g. "vacation June 24 for a community event", expand into the full letter format above before calling `create_document`.

## Half-day leave

Set `half_day: 1` and `half_day_date` to the leave date. Mention morning/afternoon in `description` if the user specifies.

## Sick leave

Use `leave_type: "Sick Leave"`. Keep the tone factual; include expected return date if known.

## Example (real)

From `scripts/drafts/leave-application-2026-06-24.json`:

```
Dear Sir Den,

I am writing to formally request a vacation leave on Wednesday, June 24, 2026.

I will be attending a community event on that date and would like to use this time to participate and fulfill my commitment to the activity. I will make sure my current tasks are updated before my leave, and I remain reachable at hervey.geralph@livro.systems for any urgent concerns.

Thank you for your consideration.

Best regards,

Hervey Geralph Cabig Mapano
Web Developer | Product Dev - LSI
```
