import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import {
  type AppRole,
  workspaceFromAppRole,
  workspaceLabels,
} from "@/lib/auth/role";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  appRole: AppRole;
  workspace: "hr" | "employee";
  roleLabel: string;
  jobTitle: string | null;
}

const APP_ROLES: readonly AppRole[] = ["hr_admin", "hr_manager", "employee"];

/**
 * Returns the signed-in user for the current request, using the cookie-based
 * Supabase session (the same cookies the proxy writes and refreshes).
 *
 * Identity is real: the display name comes from the auth user's metadata and
 * the job title from their `employees` row. Returns null when there is no
 * session (the proxy should already have redirected to /login in that case).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Token refresh is handled by the proxy; never write cookies during
        // render (Server Components are not allowed to set cookies).
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rawRole = typeof user.app_metadata?.role === "string" ? user.app_metadata.role : "employee";
  const appRole = APP_ROLES.includes(rawRole as AppRole) ? (rawRole as AppRole) : "employee";

  const name =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name
      : user.email ?? "Team member";

  let jobTitle: string | null = null;
  const service = getSupabaseServer();
  if (service) {
    const { data: empRaw } = await service
      .from("employees")
      .select("roles(title)")
      .eq("profile_id", user.id)
      .maybeSingle();
    const emp = empRaw as unknown as { roles: { title: string } | null } | null;
    jobTitle = emp?.roles?.title ?? null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    appRole,
    workspace: workspaceFromAppRole(appRole),
    roleLabel: workspaceLabels[appRole],
    jobTitle,
  };
}