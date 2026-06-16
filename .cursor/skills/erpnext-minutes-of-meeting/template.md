# MOM HTML templates

## `small_text_afux` (header)

```html
<div class="ql-editor read-mode">
  <p><strong>Attendees:</strong> Hervey Geralph, Elman, Ianrey, Denesse</p>
  <p><strong>Topic:</strong> Silid v2 → Silid v3 data migration strategy and feasibility</p>
</div>
```

## `discussion` (section skeleton)

Replace bracketed placeholders. Omit sections that do not apply.

```html
<div class="ql-editor read-mode">
  <h3><span style="color: rgb(31, 31, 31); background-color: transparent;">Summary</span></h3>
  <p><span style="color: rgb(48, 48, 48); background-color: transparent;">[One paragraph overview]</span></p>

  <h3><span style="color: rgb(31, 31, 31); background-color: transparent;">Initial Process ([Owner])</span></h3>
  <ol>
    <li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><span style="color: rgb(48, 48, 48); background-color: transparent;">[Step]</span></li>
  </ol>

  <h3><span style="color: rgb(31, 31, 31); background-color: transparent;">Issues Identified</span></h3>
  <ol>
    <li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="color: rgb(48, 48, 48); background-color: transparent;">[Issue]</strong><span style="color: rgb(48, 48, 48); background-color: transparent;"> — [detail]</span></li>
  </ol>

  <h3><span style="color: rgb(31, 31, 31); background-color: transparent;">[Person]'s Suggestion</span></h3>
  <p><span style="color: rgb(48, 48, 48); background-color: transparent;">[Suggestion text]</span></p>

  <h3><span style="color: rgb(31, 31, 31); background-color: transparent;">Questions Raised</span></h3>
  <ol>
    <li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="color: rgb(48, 48, 48); background-color: transparent;">[Name]</strong><span style="color: rgb(48, 48, 48); background-color: transparent;"> — [question]</span></li>
  </ol>

  <h3><span style="color: rgb(31, 31, 31); background-color: transparent;">Requirements</span></h3>
  <ol>
    <li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><span style="color: rgb(48, 48, 48); background-color: transparent;">[Requirement]</span></li>
  </ol>

  <h3><span style="color: rgb(31, 31, 31); background-color: transparent;">Options Discussed</span></h3>
  <ol>
    <li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><strong style="color: rgb(48, 48, 48); background-color: transparent;">Opt 1 — [title]</strong><span style="color: rgb(48, 48, 48); background-color: transparent;"> — [detail]</span></li>
  </ol>

  <h3><span style="color: rgb(31, 31, 31); background-color: transparent;">Key Decisions &amp; Actions</span></h3>
  <ol>
    <li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="color: rgb(48, 48, 48); background-color: transparent;">[Action]</strong><span style="color: rgb(48, 48, 48); background-color: transparent;"> ([Owner])</span></li>
  </ol>

  <h3><span style="color: rgb(31, 31, 31); background-color: transparent;">Conclusion &amp; Next Steps</span></h3>
  <ol>
    <li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><span style="color: rgb(48, 48, 48); background-color: transparent;">[Step]</span></li>
  </ol>
</div>
```

## Reference document

Full real example (Silid v2→v3 migration, 2026-06-15):  
`scripts/drafts/minutes-of-meeting-silid-v2-v3-migration-2026-06-15.json`
