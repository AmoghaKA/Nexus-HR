"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function handle() {
      if (!isSupabaseConfigured) {
        router.replace("/login");
        return;
      }

      const supabase = getSupabaseBrowser();
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const next = searchParams.get("next") ?? "/";

      // 1. PKCE flow: an authorization code arrives as a query param.
      const code = searchParams.get("code");
      if (code) {
        const { error: codeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!codeError) {
          if (!cancelled) {
            router.replace(next);
            router.refresh();
          }
          return;
        }
      }

      // 2. Legacy implicit grant: tokens arrive in the URL fragment, which is
      //    only visible to the browser (this is what Supabase confirmation
      //    emails use).
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: setSessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (!setSessionError) {
            if (!cancelled) {
              router.replace(next);
              router.refresh();
            }
            return;
          }
        }
      }

      // Nothing usable — fall back to sign-in.
      if (!cancelled) {
        setError("We couldn't confirm your session. Please sign in manually.");
        setTimeout(() => router.replace("/login"), 3000);
      }
    }

    handle();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4 text-center">
        <p className="max-w-sm text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}