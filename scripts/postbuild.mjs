import { chmodSync } from "node:fs";
import { join } from "node:path";

const entry = join(process.cwd(), "build", "index.js");
try {
  chmodSync(entry, 0o755);
} catch {
  // Windows ignores chmod; safe to skip.
}
