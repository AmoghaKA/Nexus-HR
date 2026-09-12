"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Mail, UserRound } from "lucide-react";

import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  roleDashboard,
  roleLabels,
  type WorkspaceRole,
} from "@/lib/auth/role";
import { persistSignInRole } from "@/lib/auth/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SignUpFormProps {
  role: WorkspaceRole;
  onBack?: () => void;
}

export function SignUpForm({ role, onBack }: SignUpFormProps) {
  const router = useRouter();
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (isSupabaseConfigured) {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setNotice("Supabase client could not be initialised.");
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${roleDashboard[role]}`,
        },
      });

      if (error) {
        setLoading(false);
        setNotice(
          `Account creation failed: ${error.message}. Please try again.`
        );
        return;
      }

      if (data.user && data.user.identities?.length === 0) {
        setLoading(false);
        setNotice(
          `An account with ${email} already exists. Try signing in instead.`
        );
        return;
      }

      if (data.user) {
        const result = await persistSignInRole(data.user.id, role);
        if (!result.ok) {
          setLoading(false);
          setNotice(
            `Account created, but your role could not be saved: ${result.error}.`
          );
          return;
        }
        await supabase.auth.refreshSession();
      }

      if (data.session) {
        setLoading(false);
        router.push(roleDashboard[role]);
        router.refresh();
        return;
      }

      // Email confirmation is enabled — a session only arrives after confirm.
      setLoading(false);
      setNotice(
        `Account created. Check ${email} and click the confirmation link, then sign in — you'll land in the ${roleLabels[role].toLowerCase()}.`
      );
      return;
    }

    // Demo mode: no Supabase configured — go straight to the role dashboard.
    router.push(roleDashboard[role]);
  };

  return (
    <Card className="border-none shadow-xl sm:border sm:shadow-sm">
      {onBack && (
        <div className="p-6 pb-0">
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
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <Badge variant="secondary">{roleLabels[role]}</Badge>
        </div>
        <CardDescription>
          Join your company&apos;s WorkforceIQ {roleLabels[role].toLowerCase()}.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <div className="relative">
              <UserRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Ada Lovelace"
                autoComplete="name"
                required
                className="pl-9"
              />
            </div>
          </div>
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
                className="pl-9"
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
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
                className="pl-9"
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
        <CardContent className="pt-0">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
          {!isSupabaseConfigured && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Demo mode — no email verification needed. You&apos;ll be taken to
              the {roleLabels[role].toLowerCase()}.
            </p>
          )}
        </CardContent>
      </form>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}