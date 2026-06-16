import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  EMPTY_PROFILE,
  mergeProfile,
  type UserProfile,
} from "./types.js";

export const PROFILE_DIR = join(homedir(), ".erpnext-mcp");
export const DEFAULT_PROFILE_FILE = join(PROFILE_DIR, "user-profile.json");

export function resolveProfilePath(): string {
  return process.env.ERPNEXT_PROFILE_FILE || DEFAULT_PROFILE_FILE;
}

export async function loadProfile(): Promise<UserProfile> {
  const path = resolveProfilePath();
  try {
    const raw = await readFile(path, "utf8");
    const data = JSON.parse(raw) as Partial<UserProfile>;
    return {
      ...EMPTY_PROFILE,
      ...data,
      _meta: {
        ...EMPTY_PROFILE._meta,
        ...data._meta,
      },
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export async function saveProfile(profile: UserProfile): Promise<string> {
  const path = resolveProfilePath();
  await mkdir(PROFILE_DIR, { recursive: true });
  const payload: UserProfile = {
    ...profile,
    _meta: {
      ...profile._meta,
      updatedAt: new Date().toISOString(),
    },
  };
  await writeFile(path, JSON.stringify(payload, null, 2), { mode: 0o600 });
  return path;
}

export async function updateProfile(
  updates: Partial<UserProfile>
): Promise<{ profile: UserProfile; path: string }> {
  const current = await loadProfile();
  const profile = mergeProfile(current, updates);
  const path = await saveProfile(profile);
  return { profile, path };
}
