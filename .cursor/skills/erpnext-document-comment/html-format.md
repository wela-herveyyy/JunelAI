# Rich comment HTML (optional)

Default: **plain text** in `content`.

Use HTML when the user wants formatted status updates (QA notes, fix summaries, bullet lists) — same pattern as desk rich-text comments.

Wrap body in:

```html
<div class="ql-editor read-mode"><p>...</p></div>
```

## Minimal example

```html
<div class="ql-editor read-mode"><p><strong>Update</strong></p><p>Fixed the save issue on edit.</p><ul><li>Strip nested GET fields before insert</li><li>Skip cleanup on error</li></ul></div>
```

## Rules

- Escape user content if it contains `<` in non-HTML context.
- Prefer plain text for short replies ("LGTM", "Please review").
- Do not embed scripts or external images unless user provides URLs.
