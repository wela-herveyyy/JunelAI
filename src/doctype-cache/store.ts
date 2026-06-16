import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { doctypeToSlug, type DocTypeSchema } from "./types.js";

export const DOCTYPE_CACHE_DIR = join(homedir(), ".erpnext-mcp", "doctypes");

export function resolveDoctypeCacheDir(): string {
  return process.env.ERPNEXT_DOCTYPE_CACHE_DIR || DOCTYPE_CACHE_DIR;
}

export function schemaFilePath(doctype: string): string {
  return join(resolveDoctypeCacheDir(), `${doctypeToSlug(doctype)}.json`);
}

export async function loadSchema(doctype: string): Promise<DocTypeSchema | null> {
  try {
    const raw = await readFile(schemaFilePath(doctype), "utf8");
    return JSON.parse(raw) as DocTypeSchema;
  } catch {
    return null;
  }
}

export async function saveSchema(schema: DocTypeSchema): Promise<string> {
  const path = schemaFilePath(schema.doctype);
  await mkdir(resolveDoctypeCacheDir(), { recursive: true });
  const payload: DocTypeSchema = {
    ...schema,
    _meta: {
      ...schema._meta,
      cachedAt: new Date().toISOString(),
    },
  };
  await writeFile(path, JSON.stringify(payload, null, 2), { mode: 0o600 });
  return path;
}

export async function listCachedDoctypes(): Promise<string[]> {
  try {
    const entries = await readdir(resolveDoctypeCacheDir());
    const schemas: string[] = [];
    for (const file of entries) {
      if (!file.endsWith(".json")) {
        continue;
      }
      try {
        const raw = await readFile(join(resolveDoctypeCacheDir(), file), "utf8");
        const data = JSON.parse(raw) as DocTypeSchema;
        if (data.doctype) {
          schemas.push(data.doctype);
        }
      } catch {
        // skip corrupt cache files
      }
    }
    return schemas.sort();
  } catch {
    return [];
  }
}
