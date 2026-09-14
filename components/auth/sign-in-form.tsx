"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";

import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  roleDashboard,
  roleLabels,
  type WorkspaceRole,
} from "@/lib/auth/role";
import { resolveUserRole } from "@/lib/auth/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SignInFormProps {
  role: WorkspaceRole;
  onBack?: () => void;
}

export function SignInForm({ role, onBack }: SignInFormProps) {
  const router = useRouter();
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (isSupabaseConfigured) {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setNotice("Supabase client could not be initialised.");
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        setNotice(
          `Sign-in failed: ${error.message}. Please check your credentials and try again.`
        );
        return;
      }

      if (data.user) {
        // The account's real role comes from the database — never from the
        // role card clicked on the login screen.
        try {
          const result = await resolveUserRole(data.user.id);
          if (!result.ok) {
            await supabase.auth.signOut();
            setLoading(false);
            setNotice(`Sign-in failed: ${result.error}`);
            return;
          }
          if (result.workspace !== role) {
            await supabase.auth.signOut();
            setLoading(false);
            setNotice(
              `This account belongs to the ${roleLabels[result.workspace].toLowerCase()}. Go back, choose the "${roleLabels[result.workspace]}" option, and sign in there.`
            );
            return;
          }
          // Claims may have been repaired to match the database — refresh so the
          // proxy's role check on the next request sees them. Non-fatal if the
          // refresh is refused transiently; navigation proceeds regardless.
          await supabase.auth.refreshSession().catch(() => null);
          // Replace (not push) so the login page is not left in history, and
          // skip the extra router.refresh() — the destination is a dynamic page
          // that already re-fetches fresh data on soft navigation.
          router.replace(roleDashboard[result.workspace]);
        } catch (error) {
          setLoading(false);
          setNotice(
            `Sign-in failed: ${error instanceof Error ? error.message : "Something went wrong."}`
          );
        }
        return;
      }

    }

    // Demo mode: no Supabase configured — go straight to the role dashboard.
    router.push(roleDashboard[role]);
  };

  return (
    <Card className="border-border/80 bg-card/95 shadow-[0_24px_70px_hsl(195_28%_14%_/_0.09)]">
      {onBack && (
        <div className="p-6 pb-0 sm:px-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Change role
          </button>
        </div>
      )}
      <CardHeader className="space-y-3 p-6 sm:p-8 sm:pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-2xl tracking-[-0.03em]">Welcome back</CardTitle>
          <Badge variant="secondary">{roleLabels[role]}</Badge>
        </div>
        <CardDescription>
          Sign in to your {roleLabels[role].toLowerCase()}.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 px-6 sm:px-8">
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="h-11 rounded-lg pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="h-11 rounded-lg pl-9"
              />
            </div>
          </div>
          {notice && (
            <p
              role="status"
              className="rounded-md border border-amber-300 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning"
            >
              {notice}
            </p>
          )}
        </CardContent>
        <CardContent className="px-6 pt-0 sm:px-8">
          <Button type="submit" className="h-11 w-full rounded-lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          {!isSupabaseConfigured && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Demo mode — no credentials required. You&apos;ll be taken to the{" "}
              {roleLabels[role].toLowerCase()}.
            </p>
          )}
        </CardContent>
      </form>
      <CardContent className="px-6 pt-1 sm:px-8">
        <div className="flex items-center gap-3 py-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-lg"
          onClick={() =>
            setNotice(
              "SSO / Google sign-in will be enabled with Supabase Auth in Phase 2."
            )
          }
        >
          Continue with Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center px-6 pb-7 sm:px-8">
        <p className="text-sm text-muted-foreground">
          New to Nexus HR?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}