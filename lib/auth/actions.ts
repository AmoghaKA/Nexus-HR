"use server";

import {
  type AppRole,
  type WorkspaceRole,
  appRoleFromWorkspace,
  workspaceFromAppRole,
} from "@/lib/auth/role";
import { getSupabaseServer } from "@/lib/supabase/server";

const APP_ROLES: readonly AppRole[] = ["hr_admin", "hr_manager", "employee"];

/**
 * Persists the role the user chose at sign-in onto their Supabase user record
 * (app_metadata) as a granular AppRole, then best-effort syncs the matching
 * `profiles` row. Uses the service role key server-side.
 *
 * The profile sync is non-fatal: it only matters once the schema migrations
 * have been applied, and a failed sync must never block sign-in.
 */
export async function persistSignInRole(
  userId: string,
  workspace: WorkspaceRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const role = appRoleFromWorkspace(workspace);

  const user = await supabase.auth.admin.getUserById(userId);
  if (user.error) return { ok: false, error: user.error.message };

  const appMetadata = user.data.user?.app_metadata ?? {};
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...appMetadata, role },
  });
  if (error) return { ok: false, error: error.message };

  const profilePatch: {
    role: string;
    full_name?: string;
  } = { role };
  const fullName = user.data.user?.user_metadata?.full_name;
  if (typeof fullName === "string") profilePatch.full_name = fullName;

  // Non-fatal: profiles table may not exist yet on fresh databases.
  const { error: profileError } = await supabase
    .from("profiles")
    .update(profilePatch)
    .eq("id", userId);
  if (profileError) {
    console.warn("persistSignInRole: profile sync skipped:", profileError.message);
  }

  return { ok: true };
}

/**
 * Resolves the role an account actually holds, using `profiles.role` as the
 * source of truth (not whatever the user picked on the login screen).
 *
 * The granular role is also repaired onto the auth user's `app_metadata` so the
 * proxy's workspace routing (`lib/supabase/session.ts`) matches the database.
 * Returns the AppRole + the workspace it maps to.
 */
export async function resolveUserRole(
  userId: string,
): Promise<{ ok: true; role: AppRole; workspace: WorkspaceRole } | { ok: false; error: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const dbRole = profile?.role as AppRole | undefined;
  if (!dbRole || !APP_ROLES.includes(dbRole)) {
    return {
      ok: false,
      error: "This account has no role assigned. Ask an administrator to provision your account.",
    };
  }

  const user = await supabase.auth.admin.getUserById(userId);
  if (user.error) return { ok: false, error: user.error.message };

  const appMetadata = user.data.user?.app_metadata ?? {};
  if (appMetadata.role !== dbRole) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { ...appMetadata, role: dbRole },
    });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true, role: dbRole, workspace: workspaceFromAppRole(dbRole) };
}