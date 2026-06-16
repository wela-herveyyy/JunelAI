#!/usr/bin/env node
/**
 * Create Silid v2 → v3 migration Minutes of Meeting in ERPNext.
 * Uses ERPNEXT_* env or ~/.cursor/mcp.json erpnext server config.
 *
 *   node scripts/create-silid-migration-mom.mjs
 */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import axios from 'axios';
import { applyWriteAuth } from './lib/csrf.mjs';
import { normalizeUrl, validateSidSession } from './lib/sid-auth.mjs';

async function loadAuthFromMcpJson() {
  const mcpPath = join(homedir(), '.cursor', 'mcp.json');
  try {
    const raw = await readFile(mcpPath, 'utf8');
    const config = JSON.parse(raw);
    const erp = config?.mcpServers?.erpnext?.env ?? {};
    return {
      baseUrl: erp.ERPNEXT_URL || process.env.ERPNEXT_URL,
      sid: erp.ERPNEXT_SID || process.env.ERPNEXT_SID,
      csrf: erp.ERPNEXT_CSRF_TOKEN || process.env.ERPNEXT_CSRF_TOKEN,
    };
  } catch {
    return {
      baseUrl: process.env.ERPNEXT_URL,
      sid: process.env.ERPNEXT_SID,
      csrf: process.env.ERPNEXT_CSRF_TOKEN,
    };
  }
}

const discussion = `<div class="ql-editor read-mode"><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">Summary</span></h3><p><span style="background-color: transparent; color: rgb(48, 48, 48);">The team reviewed the current Silid v2 to v3 migration pipeline (Firebase Cloud Functions → MariaDB → Frappe → NestJS backend) and identified critical performance, data quality, and architectural issues. No concrete migration approach was finalized. The group agreed to pause offering Silid v2→v3 migration to schools until database structures on both sides are fully analyzed and core migration data is identified.</span></p><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">Initial Process (Ianrey)</span></h3><ul><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Firebase Cloud Function → MariaDB</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Firebase data → Frappe side (mapped and structured data) → NestJS → Backend</span></li></ul><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">Issues Identified</span></h3><ul><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Frappe request timeouts</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> during migration/sync.</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Slow Cloud Function processing</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> due to messy/denormalized Firebase data.</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Subject code mismatch</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> between Firebase and Silid v3.</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Student sync uncertainty</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — how to sync students, grades, and what identifier to use (email? generated email?).</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Super-denormalized Firebase data</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — data spread across JSON; large collection/document children slow reads and quadruple chunking time. Duplicated/redundant data is common.</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Core Firebase object</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — Teacher is the core object (Elman).</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Need to verify whether migrated data will conflict with existing v3 data.</span></li></ul><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">Hervey's Suggestion (Frappe / Silid Frontend)</span></h3><p><span style="background-color: transparent; color: rgb(48, 48, 48);">Trigger data retrieval from the Frappe (Silid frontend) side rather than backend-to-backend sync. The frontend would fetch Firebase data for display in Frappe.</span></p><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">v3 School Policy</span></h3><p><span style="background-color: transparent; color: rgb(48, 48, 48);">If a school moves to Silid v3, they should </span><strong style="background-color: transparent; color: rgb(48, 48, 48);">not</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> remain on Silid v2 to avoid bugs and data conflicts.</span></p><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">Questions Raised</span></h3><ul><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Elman</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — What if we migrate activities only?</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Denesse</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — How many schools need migration? How large is the data volume?</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Elman</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — Can indexing help with large bulk queries?</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Firebase email</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — Does Firebase use generated emails for user identity?</span></li></ul><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">Requirements</span></h3><ul><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Schools must complete </span><strong style="background-color: transparent; color: rgb(48, 48, 48);">SMS v3 migration first</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> before Silid v3 (Denesse).</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Migrate the </span><strong style="background-color: transparent; color: rgb(48, 48, 48);">whole school</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> to Silid v3 — not just a single sample.</span></li></ul><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">Migration Options Discussed</span></h3><ol><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Opt 1 — Class by activity</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — Migrate incrementally.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Opt 2 — Bulk per school year</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — Backend Firebase → NestJS &amp; Frappe MariaDB; past year to latest: classes and activities only.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Opt 3 — Activities only</strong><span style="background-color: transparent; color: rgb(48, 48, 48);">.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Opt 4 — Compact migration</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — e.g. quizzes only.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Opt 5 — Per-user, frontend-triggered</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — from profile settings; not backend-to-backend; migrate student answer points only.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Super old data — Silid v2 read-only</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — disable create functions (Hervey).</span></li></ol><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">Key Decisions &amp; Actions</span></h3><ul><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Pause migration offers</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> until v2↔v3 data connection is established (Elman).</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Analyze database structures</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — Silid v2 and v3 (Elman, Denesse).</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Run Collection/Document mapper</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> (Ianrey).</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">MJS school sampling</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> for Firebase structure (Elman).</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Inform Sales</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — migration ongoing; highly discouraged for now (Elman).</span></li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Denesse</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> — confirm how many schools intend to migrate.</span></li></ul><h3><span style="background-color: transparent; color: rgb(31, 31, 31);">Conclusion &amp; Next Steps</span></h3><ol><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Identify Firebase + Silid v2/v3 data structures.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Use </span><strong style="background-color: transparent; color: rgb(48, 48, 48);">MJS school</strong><span style="background-color: transparent; color: rgb(48, 48, 48);"> for data sampling.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Run Firebase Collection/Document mapper (Ianrey).</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Feedback to Sir Elman by </span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Wednesday, June 17, 2026</strong><span style="background-color: transparent; color: rgb(48, 48, 48);">.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Full discussion on </span><strong style="background-color: transparent; color: rgb(48, 48, 48);">Friday, June 19, 2026</strong><span style="background-color: transparent; color: rgb(48, 48, 48);">.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Denesse to confirm school count with stakeholders.</span></li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span><span style="background-color: transparent; color: rgb(48, 48, 48);">Inform Sales to discourage migration offers in the interim.</span></li></ol></div>`;

const attendees = `<div class="ql-editor read-mode"><p><strong>Attendees:</strong> Hervey Geralph, Elman, Ianrey, Denesse</p><p><strong>Topic:</strong> Silid v2 → Silid v3 data migration strategy and feasibility</p></div>`;

const doc = {
  doctype: 'Minutes of Meeting',
  date_of_meeting: '2026-06-15',
  meeting_subject: 'Silid v2 to Silid v3 Migrations Discussion',
  recorded_by: 'Ianrey',
  department: 'Product Dev - LSI',
  project: 'PROJ-0253',
  small_text_afux: attendees,
  discussion,
};

async function main() {
  const { baseUrl, sid, csrf } = await loadAuthFromMcpJson();
  if (!baseUrl || !sid) {
    console.error('Missing ERPNext auth. Run: npm run setup-sid');
    process.exit(1);
  }

  const session = await validateSidSession(baseUrl, sid);
  console.log(`Authenticated as ${session.user}`);

  const client = axios.create({
    baseURL: normalizeUrl(baseUrl),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: `sid=${sid}`,
    },
    validateStatus: () => true,
  });

  process.env.ERPNEXT_CSRF_TOKEN = csrf || session.csrfToken || '';
  await applyWriteAuth(client, process.env);

  const res = await client.post('/api/resource/Minutes%20of%20Meeting', {
    data: doc,
  });

  if (res.status >= 400) {
    console.error('Create failed:', res.status, JSON.stringify(res.data, null, 2));
    process.exit(1);
  }

  const created = res.data?.data;
  console.log('Created Minutes of Meeting:', created?.name);
  console.log(`https://erp.livro.systems/app/minutes-of-meeting/${encodeURIComponent(created?.name ?? '')}`);
}

main().catch((error) => {
  console.error(error.message || error);
  console.error('\nIf session expired, run: npm run setup-sid');
  process.exit(1);
});
