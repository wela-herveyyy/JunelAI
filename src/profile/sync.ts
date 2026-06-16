import type { ERPNextClient } from "../client/erpnext-client.js";
import { loadProfile, saveProfile } from "./store.js";
import { mergeProfile, type UserProfile } from "./types.js";

export async function syncProfileFromErpnext(
  client: ERPNextClient
): Promise<UserProfile> {
  const current = await loadProfile();
  const loggedUser = client.getLoggedUser();

  if (!loggedUser) {
    return current;
  }

  const updates: Partial<UserProfile> = {
    erpnextUser: loggedUser,
    workEmail: current.workEmail || loggedUser,
  };

  try {
    const users = await client.getDocList(
      "User",
      { name: loggedUser },
      ["name", "full_name", "email"],
      1
    );
    const user = users[0];
    if (user) {
      if (typeof user.full_name === "string" && user.full_name) {
        updates.fullName = user.full_name;
      }
      if (typeof user.email === "string" && user.email) {
        updates.workEmail = user.email;
      }
    }
  } catch {
    // User doctype may be restricted; continue with Employee lookup.
  }

  try {
    const employees = await client.getDocList(
      "Employee",
      { user_id: loggedUser },
      [
        "name",
        "employee_name",
        "company",
        "department",
        "designation",
      ],
      1
    );
    const employee = employees[0];
    if (employee) {
      if (typeof employee.name === "string") {
        updates.employeeId = employee.name;
      }
      if (typeof employee.employee_name === "string") {
        updates.employeeName = employee.employee_name;
        if (!updates.fullName) {
          updates.fullName = employee.employee_name;
        }
      }
      if (typeof employee.company === "string") {
        updates.company = employee.company;
      }
      if (typeof employee.department === "string") {
        updates.department = employee.department;
      }
      if (typeof employee.designation === "string") {
        updates.position = employee.designation;
      }
    }
  } catch {
    // Employee record may not exist for this user.
  }

  const profile = mergeProfile(current, {
    ...updates,
    _meta: {
      ...current._meta,
      syncedFromErpnextAt: new Date().toISOString(),
    },
  });

  await saveProfile(profile);
  return profile;
}
