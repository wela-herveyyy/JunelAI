import type { ERPNextClient } from "../client/erpnext-client.js";
import { loadProfile, updateProfile } from "./store.js";
import { syncProfileFromErpnext } from "./sync.js";
import {
  normalizeProfileUpdates,
  type UserProfile,
} from "./types.js";

export class UserProfileManager {
  private cached: UserProfile | null = null;

  constructor(private readonly client: ERPNextClient) {}

  async initialize(): Promise<UserProfile> {
    this.cached = await loadProfile();

    if (this.client.isAuthenticated()) {
      try {
        this.cached = await syncProfileFromErpnext(this.client);
      } catch {
        // Profile sync is best-effort on startup.
      }
    }

    return this.cached;
  }

  async get(sync = false): Promise<UserProfile> {
    if (sync && this.client.isAuthenticated()) {
      this.cached = await syncProfileFromErpnext(this.client);
      return this.cached;
    }

    if (!this.cached) {
      this.cached = await loadProfile();
    }
    return this.cached;
  }

  async update(
    input: Record<string, unknown>
  ): Promise<{ profile: UserProfile; path: string }> {
    const updates = normalizeProfileUpdates(input);
    const result = await updateProfile(updates);
    this.cached = result.profile;
    return result;
  }
}
