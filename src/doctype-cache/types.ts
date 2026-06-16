export interface SchemaField {
  fieldname: string;
  fieldtype?: string;
  label?: string;
  options?: string;
  sampleType?: string;
  sample?: string | null;
}

export interface DocTypeSchema {
  doctype: string;
  fields: SchemaField[];
  keyFields?: string[];
  commonFilters?: string[];
  childTables?: string[];
  sampleDocument?: Record<string, unknown>;
  notes?: string;
  _meta: {
    cachedAt: string;
    source: "erpnext-meta" | "sample-document" | "merged" | "manual";
    refreshedAt?: string;
  };
}

export function doctypeToSlug(doctype: string): string {
  return doctype
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
