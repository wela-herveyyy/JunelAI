export interface UserProfile {
  fullName: string;
  position: string;
  workEmail: string;
  company: string;
  department: string;
  erpnextUser: string;
  employeeId: string;
  employeeName: string;
  timezone: string;
  dateFormat: string;
  notes: string;
  _meta: {
    updatedAt: string;
    syncedFromErpnextAt?: string;
  };
}

export const EMPTY_PROFILE: UserProfile = {
  fullName: "",
  position: "",
  workEmail: "",
  company: "",
  department: "",
  erpnextUser: "",
  employeeId: "",
  employeeName: "",
  timezone: "",
  dateFormat: "YYYY-MM-DD",
  notes: "",
  _meta: {
    updatedAt: "",
  },
};

export const PROFILE_FIELDS = [
  "fullName",
  "position",
  "workEmail",
  "company",
  "department",
  "erpnextUser",
  "employeeId",
  "employeeName",
  "timezone",
  "dateFormat",
  "notes",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

const FIELD_ALIASES: Record<string, ProfileField> = {
  full_name: "fullName",
  fullname: "fullName",
  name: "fullName",
  position: "position",
  designation: "position",
  title: "position",
  work_email: "workEmail",
  email: "workEmail",
  company: "company",
  department: "department",
  erpnext_user: "erpnextUser",
  user: "erpnextUser",
  employee_id: "employeeId",
  employee: "employeeId",
  employee_name: "employeeName",
  timezone: "timezone",
  date_format: "dateFormat",
  notes: "notes",
};

export function normalizeProfileUpdates(
  input: Record<string, unknown>
): Partial<UserProfile> {
  const updates: Partial<UserProfile> = {};

  for (const [key, value] of Object.entries(input)) {
    if (key === "_meta" || typeof value !== "string") {
      continue;
    }
    const field = FIELD_ALIASES[key] ?? (PROFILE_FIELDS.includes(key as ProfileField) ? key as ProfileField : null);
    if (field) {
      updates[field] = value;
    }
  }

  return updates;
}

export function mergeProfile(
  base: UserProfile,
  updates: Partial<UserProfile>
): UserProfile {
  const merged = { ...base, ...updates };
  merged._meta = {
    ...base._meta,
    ...updates._meta,
    updatedAt: new Date().toISOString(),
  };
  return merged;
}
