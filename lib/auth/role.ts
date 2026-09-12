export type WorkspaceRole = "hr" | "employee";

export type AppRole = "hr_admin" | "hr_manager" | "employee";

export const roleDashboard: Record<WorkspaceRole, string> = {
  hr: "/hr/dashboard",
  employee: "/employee/dashboard",
};

export const roleLabels: Record<WorkspaceRole, string> = {
  hr: "HR workspace",
  employee: "Employee workspace",
};

export const workspaceLabels: Record<AppRole, string> = {
  hr_admin: "HR administrator",
  hr_manager: "HR manager",
  employee: "Employee",
};

const APP_ROLE_BY_WORKSPACE: Record<WorkspaceRole, AppRole> = {
  hr: "hr_admin", // legacy "hr" choice → default HR admin
  employee: "employee",
};

const WORKSPACE_BY_APP_ROLE: Record<string, WorkspaceRole | undefined> = {
  hr_admin: "hr",
  hr_manager: "hr",
  hr: "hr", // tolerate legacy "hr" stored in app_metadata
  employee: "employee",
};

interface RoleUser {
  app_metadata?: Record<string, unknown> | null;
}

/**
 * The granular role stored on the profile / app_metadata. Defaults to the most
 * permissive sensible value per workspace when nothing is stored yet.
 */
export function appRoleFromWorkspace(workspace: WorkspaceRole): AppRole {
  return APP_ROLE_BY_WORKSPACE[workspace];
}

/** Maps any stored role value to the workspace the user should land in. */
export function workspaceFromAppRole(role: string | undefined | null): WorkspaceRole {
  return WORKSPACE_BY_APP_ROLE[role ?? ""] ?? "employee";
}

/**
 * Resolves the workspace role attached to a signed-in user. The role is set by
 * `persistSignInRole` during sign-in (or by the auth trigger on signup). Users
 * without an explicit role default to the employee workspace.
 */
export function workspaceRoleFromUser(
  user: RoleUser | null | undefined
): WorkspaceRole {
  const role = user?.app_metadata?.role;
  return typeof role === "string" ? workspaceFromAppRole(role) : "employee";
}