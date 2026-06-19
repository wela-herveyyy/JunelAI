import { chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const entry = join(process.cwd(), "build", "index.js");
try {
  chmodSync(entry, 0o755);
} catch {
  // Windows ignores chmod; safe to skip.
}

spawnSync(process.execPath, ["scripts/export-mcp-tool-descriptors.mjs"], {
  stdio: "inherit",
  cwd: process.cwd(),
});
