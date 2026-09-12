import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a Supabase client for browser usage that stores session tokens in
 * cookies (required for the proxy session to read them). Returns null when the
 * environment has not been configured yet.
 */
export function getSupabaseBrowser() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);