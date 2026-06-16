# MOM HTML templates

**Profile-first:** Call `get_user_profile` before filling templates.

| Placeholder | Profile field |
|-------------|---------------|
| Recorder / `[Name]` in actions | First name from `fullName` |
| Attendees (self) | `fullName` |
| Department in header context | `department` |

## `small_text_afux` (header)

```html
<div class="ql-editor read-mode">
  <p><strong>Attendees:</strong> [include profile.fullName if user attended], [others]</p>
  <p><strong>Topic:</strong> [meeting subject]</p>
</div>
```

## `discussion` (section skeleton)

```html
<div class="ql-editor read-mode">
  <h3>Summary</h3>
  <p>[overview]</p>

  <h3>Initial Process ([owner])</h3>
  <ol>
    <li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>[step]</li>
  </ol>

  <h3>Issues Identified</h3>
  <ol>
    <li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong>[issue]</strong> — [detail]</li>
  </ol>

  <h3>[Person]'s Suggestion</h3>
  <p>[text]</p>

  <h3>Key Decisions &amp; Actions</h3>
  <ol>
    <li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong>[action]</strong> ([owner])</li>
  </ol>

  <h3>Conclusion &amp; Next Steps</h3>
  <ol>
    <li data-list="ordered"><span class="ql-ui" contenteditable="false"></span>[step]</li>
  </ol>
</div>
```

Use Quill list attributes (`data-list="bullet"` / `ordered`) and optional inline styles per existing MOMs.

When attributing the recorder's contributions, use **`profile.fullName`** or first name — not hardcoded names.
