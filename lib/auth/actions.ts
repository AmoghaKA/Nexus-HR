"use server";

import { type WorkspaceRole } from "@/lib/auth/role";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Persists the workspace role the user chose at sign-in onto their Supabase
 * user record (app_metadata) so the proxy can enforce per-workspace access.
 * Uses the service role key server-side.
 */
export async function persistSignInRole(
  userId: string,
  role: WorkspaceRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const current = await supabase.auth.admin.getUserById(userId);
  const appMetadata = current.data?.user?.app_metadata ?? {};

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...appMetadata, role },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}