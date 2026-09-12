import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Layers,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: BrainCircuit,
    title: "AI workforce briefings",
    description:
      "Every dashboard surfaces an AI-generated narrative built from your people data via Gemini.",
  },
  {
    icon: Users,
    title: "HR + employee spaces",
    description:
      "Fully separate workspaces — one for the workforce, one for the individual.",
  },
  {
    icon: Layers,
    title: "Lifecycle coverage",
    description:
      "Recruitment, onboarding, performance, skills, attrition, and growth in one platform.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    description:
      "Supabase authentication, storage, and PostgreSQL under the hood.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <BrainCircuit className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            AI-powered workforce management
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Intelligence for every stage of the{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              employee lifecycle
            </span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            WorkforceIQ brings recruitment, onboarding, performance, skills, and
            attrition together — narrated by an AI briefing that tells you what
            to do next.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/hr/dashboard">
                Open HR workspace
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/employee/dashboard">Open employee workspace</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="p-5">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>
            WorkforceIQ — hackathon build. Dashboards currently render demo
            data.
          </p>
          <p>Powered by Next.js, Supabase, and Gemini.</p>
        </div>
      </footer>
    </div>
  );
}