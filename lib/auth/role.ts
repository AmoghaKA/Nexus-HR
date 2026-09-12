export type WorkspaceRole = "hr" | "employee";

export const roleDashboard: Record<WorkspaceRole, string> = {
  hr: "/hr/dashboard",
  employee: "/employee/dashboard",
};

export const roleLabels: Record<WorkspaceRole, string> = {
  hr: "HR workspace",
  employee: "Employee workspace",
};

interface RoleUser {
  app_metadata?: Record<string, unknown> | null;
}

/**
 * Resolves the workspace role attached to a signed-in user. The role is set by
 * `persistSignInRole` during sign-in. Users without an explicit role default
 * to the employee workspace.
 */
export function workspaceRoleFromUser(
  user: RoleUser | null | undefined
): WorkspaceRole {
  return user?.app_metadata?.role === "hr" ? "hr" : "employee";
}