#!/usr/bin/env node
import { ERPNextClient } from "../build/client/erpnext-client.js";
import { loadCredentialsIntoEnv } from "../build/config/credentials.js";
import { createLogger } from "../build/utils/logger.js";

const content = `<div class="ql-editor read-mode"><p><strong>Update — Silid v3 activity edit save fix</strong></p><p><br></p><p><strong>Problem</strong></p><p>Editing an activity (quiz, assignment, materials) returned success but did not persist changes. QA retest failed: modified questions were lost and new questions were not created.</p><p>Root cause: the edit payload includes nested GET fields (attachments, images, nested questions). PR #60 fixed the update path, but the create path still inserted those fields into the DB. Inserts failed silently, then cleanup removed rows that were never saved.</p><p><br></p><p><strong>Fix</strong> (branch fix/SPB-01010/silidv3-edit-function-issue, commit bd4c95c1)</p><ul><li>Strip non-DB fields before question/section create inserts</li><li>Fix section createOrUpdate to require a valid id before update</li><li>Skip question/section cleanup when any save error occurred during edit</li></ul><p><br></p><p><strong>Files changed</strong></p><ul><li>activity.controller.ts</li><li>create-question.usecase.ts</li><li>create-section-question.usecase.ts</li><li>section-question.service.ts</li></ul><p><br></p><p><strong>QA retest</strong></p><p>Edit an existing question, add a new question (with image if possible), save, reload — changes should persist.</p><p><br></p><p><strong>Note:</strong> bank.controller.ts uses the same create/cleanup pattern and is not included in this fix yet.</p></div>`;

const task = process.argv[2] || "SPB-01010";

const logger = createLogger();
const credentialsFile = await loadCredentialsIntoEnv();
const client = new ERPNextClient(logger);
client.setCredentialsFile(credentialsFile);
await client.initializeAuth();

const auth = await client.getAuthStatus({ verify: true });
console.log("Auth:", auth.loggedUser, auth.message);

async function tryAddComment() {
  return client.addDocumentComment({
    reference_doctype: "Sprint Backlogs",
    reference_name: task,
    content,
    comment_email: "hervey.geralph@livro.systems",
    comment_by: "HERVEY GERALPH MAPANO",
  });
}

async function tryCreateCommentDoc() {
  return client.createDocument("Comment", {
    comment_by: "HERVEY GERALPH MAPANO",
    comment_email: "hervey.geralph@livro.systems",
    comment_type: "Comment",
    reference_doctype: "Sprint Backlogs",
    reference_name: task,
    content,
  });
}

async function tryUpdateActionsTaken() {
  return client.updateDocument("Sprint Backlogs", task, {
    actions_taken: content,
  });
}

for (const [label, fn] of [
  ["add_comment", tryAddComment],
  ["create Comment doc", tryCreateCommentDoc],
  ["update actions_taken", tryUpdateActionsTaken],
]) {
  try {
    const result = await fn();
    console.log(`SUCCESS via ${label}:`, JSON.stringify(result, null, 2));
    console.log(`https://erp.livro.systems/app/sprint-backlogs/${task}`);
    process.exit(0);
  } catch (error) {
    console.error(`Failed via ${label}:`, error.message);
  }
}

process.exit(1);
