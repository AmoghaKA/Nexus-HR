import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Returns a Supabase client bound to the signed-in user's session (reads the
 * auth cookies). Row Level Security applies, so this is the right client for
 * mutations and storage calls that must respect the caller's role.
 *
 * NOTE: this module imports `next/headers`, so it must only be imported from
 * Server Components and Server Actions ("use server" modules) — never from
 * client component files.
 */
export async function getSupabaseAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
}