import type { ERPNextClient } from "../client/erpnext-client.js";
import { loadSchema, listCachedDoctypes, saveSchema } from "./store.js";
import type { DocTypeSchema, SchemaField } from "./types.js";

function inferFieldsFromSample(
  sample: Record<string, unknown>
): SchemaField[] {
  return Object.keys(sample).map((fieldname) => ({
    fieldname,
    sampleType: typeof sample[fieldname],
    sample:
      sample[fieldname]?.toString()?.substring(0, 80) || null,
  }));
}

function mergeMetaFields(meta: Record<string, unknown>): SchemaField[] {
  const rows = meta.fields;
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => ({
      fieldname: String(row.fieldname || ""),
      fieldtype: row.fieldtype ? String(row.fieldtype) : undefined,
      label: row.label ? String(row.label) : undefined,
      options: row.options ? String(row.options) : undefined,
    }))
    .filter((field) => field.fieldname);
}

export async function fetchSchemaFromErpnext(
  client: ERPNextClient,
  doctype: string
): Promise<DocTypeSchema> {
  let fields: SchemaField[] = [];
  let sampleDocument: Record<string, unknown> | undefined;
  let source: DocTypeSchema["_meta"]["source"] = "sample-document";
  const childTables: string[] = [];

  try {
    const meta = await client.getDocument("DocType", doctype);
    const metaFields = mergeMetaFields(meta);
    if (metaFields.length) {
      fields = metaFields;
      source = "erpnext-meta";
    }
    if (Array.isArray(meta.fields)) {
      for (const row of meta.fields) {
        if (
          typeof row === "object" &&
          row !== null &&
          (row as Record<string, unknown>).fieldtype === "Table" &&
          (row as Record<string, unknown>).fieldname
        ) {
          childTables.push(String((row as Record<string, unknown>).fieldname));
        }
      }
    }
  } catch {
    // DocType meta may be restricted; fall back to sample document.
  }

  try {
    const documents = await client.getDocList(doctype, {}, ["*"], 1);
    if (documents[0]) {
      sampleDocument = documents[0];
      if (!fields.length) {
        fields = inferFieldsFromSample(sampleDocument);
        source = "sample-document";
      } else {
        source = "merged";
        const known = new Set(fields.map((f) => f.fieldname));
        for (const inferred of inferFieldsFromSample(sampleDocument)) {
          if (!known.has(inferred.fieldname)) {
            fields.push(inferred);
          }
        }
      }
    }
  } catch {
    // Sample may be unavailable for empty doctypes.
  }

  if (!fields.length) {
    throw new Error(
      `Could not resolve schema for ${doctype}. No DocType meta or sample documents available.`
    );
  }

  return {
    doctype,
    fields,
    childTables: childTables.length ? childTables : undefined,
    sampleDocument,
    _meta: {
      cachedAt: new Date().toISOString(),
      source,
      refreshedAt: new Date().toISOString(),
    },
  };
}

export class DocTypeCacheManager {
  constructor(private readonly client: ERPNextClient) {}

  async get(doctype: string, refresh = false): Promise<DocTypeSchema> {
    if (!refresh) {
      const cached = await loadSchema(doctype);
      if (cached) {
        return cached;
      }
    }

    if (!this.client.isAuthenticated()) {
      const cached = await loadSchema(doctype);
      if (cached) {
        return cached;
      }
      throw new Error(
        `No cached schema for ${doctype} and ERPNext is not authenticated.`
      );
    }

    const schema = await fetchSchemaFromErpnext(this.client, doctype);
    await saveSchema(schema);
    return schema;
  }

  async list(): Promise<string[]> {
    return listCachedDoctypes();
  }
}
