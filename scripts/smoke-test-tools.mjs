#!/usr/bin/env node
/**
 * Smoke-test all ERPNext MCP client operations (read + write).
 *
 * Usage: npm run smoke-test-tools
 */

import { ERPNextClient } from "../build/client/erpnext-client.js";
import { loadCredentialsIntoEnv } from "../build/config/credentials.js";
import { UserProfileManager } from "../build/profile/index.js";
import { DocTypeCacheManager } from "../build/doctype-cache/index.js";
import { createLogger } from "../build/utils/logger.js";

const logger = createLogger();

function pass(name, detail = "") {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(`FAIL  ${name} — ${message}`);
  return message;
}

async function run() {
  const credentialsFile = await loadCredentialsIntoEnv();
  const client = new ERPNextClient(logger);
  client.setCredentialsFile(credentialsFile);
  await client.initializeAuth();

  const profile = new UserProfileManager(client);
  await profile.initialize();
  const doctypeCache = new DocTypeCacheManager(client);

  const failures = [];
  let testLeaveName = "";

  try {
    const auth = await client.getAuthStatus({ verify: true });
    if (!auth.authenticated) {
      throw new Error(String(auth.message));
    }
    pass("check_auth", String(auth.loggedUser));
  } catch (error) {
    failures.push(fail("check_auth", error));
    console.log("\nAborting — auth required for remaining tests.");
    process.exit(1);
  }

  try {
    const data = await profile.get(true);
    pass("get_user_profile", data.fullName || data.erpnextUser);
  } catch (error) {
    failures.push(fail("get_user_profile", error));
  }

  try {
    const docs = await client.getDocList(
      "Leave Application",
      { employee: "EMP/00259" },
      ["name", "from_date", "status"],
      3
    );
    pass("get_documents", `${docs.length} leave row(s)`);
  } catch (error) {
    failures.push(fail("get_documents", error));
  }

  try {
    const doc = await client.getDocument("Leave Application", "HR-LAP-2026-00460");
    pass("get_document", String(doc.name));
  } catch (error) {
    failures.push(fail("get_document", error));
  }

  try {
    const doctypes = await client.getAllDocTypes();
    pass("get_doctypes", `${doctypes.length} doctype(s)`);
  } catch (error) {
    failures.push(fail("get_doctypes", error));
  }

  try {
    const schema = await doctypeCache.get("Leave Application", false);
    pass("get_doctype_schema", schema.doctype);
  } catch (error) {
    failures.push(fail("get_doctype_schema", error));
  }

  try {
    const listed = await doctypeCache.list();
    pass("list_doctype_schemas", `${listed.length} cached`);
  } catch (error) {
    failures.push(fail("list_doctype_schemas", error));
  }

  try {
    const sample = await client.getDocList("Leave Application", {}, ["name"], 1);
    pass("get_doctype_fields", sample.length ? Object.keys(sample[0]).length + " fields" : "no sample");
  } catch (error) {
    failures.push(fail("get_doctype_fields", error));
  }

  try {
    const count = await client.callMethod(
      "frappe.client.get_count",
      { doctype: "Leave Application", filters: JSON.stringify([["employee", "=", "EMP/00259"]]) },
      "GET"
    );
    pass("call_method (GET)", `leave count ${count}`);
  } catch (error) {
    failures.push(fail("call_method (GET)", error));
  }

  try {
    const created = await client.createDocument("Leave Application", {
      naming_series: "HR-LAP-.YYYY.-",
      employee: "EMP/00259",
      leave_type: "Vacation Leave",
      company: "Livro Systems Inc.",
      department: "Product Dev - LSI",
      from_date: "2026-06-23",
      to_date: "2026-06-23",
      half_day: 0,
      leave_approver: "denesse@livro.systems",
      follow_via_email: 1,
      posting_date: "2026-06-16",
      letter_head: "Livro Wela",
      status: "Open",
      description: "MCP smoke test — safe to delete.",
    });
    testLeaveName = String(created.name);
    pass("create_document", testLeaveName);
  } catch (error) {
    failures.push(fail("create_document", error));
  }

  if (testLeaveName) {
    try {
      const updated = await client.updateDocument("Leave Application", testLeaveName, {
        description: "MCP smoke test — updated, safe to delete.",
      });
      pass("update_document", String(updated.name));
    } catch (error) {
      failures.push(fail("update_document", error));
    }

    try {
      await client.deleteDocument("Leave Application", testLeaveName);
      pass("delete_document", testLeaveName);
      testLeaveName = "";
    } catch (error) {
      failures.push(fail("delete_document", error));
    }
  }

  try {
    const current = await profile.get(false);
    await profile.update({ notes: current.notes || "" });
    pass("update_user_profile");
  } catch (error) {
    failures.push(fail("update_user_profile", error));
  }

  console.log("SKIP  submit_document — destructive; not run in smoke test");
  console.log("SKIP  cancel_document — destructive; not run in smoke test");
  console.log("SKIP  run_report — report-specific filters; run manually if needed");

  console.log("\n--- Summary ---");
  if (failures.length) {
    console.log(`${failures.length} failure(s):`);
    for (const message of failures) {
      console.log(`  - ${message}`);
    }
    if (testLeaveName) {
      console.log(`\nCleanup: delete draft Leave Application ${testLeaveName} manually if needed.`);
    }
    process.exit(1);
  }

  console.log("All smoke tests passed.");
  process.exit(0);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
