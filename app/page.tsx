import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Layers,
  ListChecks,
  Radar,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const capabilities = [
  {
    icon: Bot,
    title: "AI Workforce Copilot",
    description:
      "Ask natural-language questions about attrition, performance, hiring or onboarding — answered from your live data with Gemini.",
  },
  {
    icon: HeartPulse,
    title: "Attrition Intelligence",
    description:
      "Predict retention risk per employee, surface the factors driving risk, and recommend targeted interventions.",
  },
  {
    icon: Briefcase,
    title: "Recruitment Intelligence",
    description:
      "AI-matched candidates per role with strengths, gaps and an overall match score to guide shortlisting.",
  },
  {
    icon: TrendingUp,
    title: "Performance Intelligence",
    description:
      "Combine review ratings, attendance patterns and goal progress into clear manager action plans.",
  },
  {
    icon: Layers,
    title: "Skill Intelligence",
    description:
      "Map every skill in your org against role requirements, highlight gaps, and generate upskilling plans.",
  },
  {
    icon: GraduationCap,
    title: "Adaptive Onboarding",
    description:
      "Track onboarding plans task-by-task, flag delays and blockers, and adapt when plans need intervention.",
  },
  {
    icon: BookOpenCheck,
    title: "Policy Reasoning",
    description:
      "HRs can ask questions against stored policies and get answers grounded in the actual document text.",
  },
];

const pipeline = [
  {
    icon: Layers,
    title: "Multiple HR Data Sources",
    description:
      "Recruitment, onboarding, performance, goals, skills, attendance and policies — one connected model.",
  },
  {
    icon: Radar,
    title: "AI Signal Detection",
    description:
      "Each domain is analysed independently by Gemini to flag meaningful signals before they escalate.",
  },
  {
    icon: BrainCircuit,
    title: "Cross-Source Reasoning",
    description:
      "Signals are connected across domains so insights reflect the real, compound nature of workforce risk.",
  },
  {
    icon: Sparkles,
    title: "Explainable Insights",
    description:
      "Every insight carries evidence, reasoning, a severity level and a confidence score — never a black box.",
  },
  {
    icon: ListChecks,
    title: "Recommended Actions",
    description:
      "Insights finish with concrete next steps — targeted at employees, teams, departments or recruiters.",
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
        <section className="flex flex-col items-center gap-6 py-24 text-center sm:py-32">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <BrainCircuit className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            AI-powered workforce management
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Workforce Intelligence,{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Powered by AI.
            </span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Understand your workforce. Predict risks. Discover skills. Empower employees. WorkforceIQ
            connects recruitment, onboarding, performance, skills and attrition — then reasons across
            them so you know what to do next.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/hr/dashboard">
                Enter HR Dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/employee/dashboard">Enter Employee Dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-6 pb-20">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Everything an AI workforce platform should be.</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              One workspace that connects every stage of the employee lifecycle with real-time AI
              reasoning over your own data.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <Card key={cap.title} className="p-5">
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold">{cap.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {cap.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-6 pb-20">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">How WorkforceIQ Thinks</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Every insight passes through the same pipeline — from raw signal to explainable,
              actionable recommendation.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {pipeline.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative flex flex-col items-center text-center">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-3 top-5 hidden h-px w-6 bg-border lg:block"
                    />
                  )}
                  <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl border bg-card/80 shadow-sm">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="pb-20">
          <div className="rounded-2xl border bg-card/60 p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">Explore the Demo Workspace</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              The workspace is seeded with realistic synthetic data — 30 employees across 5
              departments, recruitment pipeline, 200+ goals, reviews, attendance records, a skills
              catalog and HR policies. All AI features run over this data through the real Gemini API.
            </p>
            <div className="mx-auto mt-6 max-w-lg space-y-4 text-left text-sm">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="font-semibold text-card-foreground">HR Manager</p>
                <p className="mt-1 text-muted-foreground">hr@workforceiq.demo</p>
                <p className="text-muted-foreground">WorkforceIQ-HR-2026!</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="font-semibold text-card-foreground">Employee</p>
                <p className="mt-1 text-muted-foreground">employee@workforceiq.demo</p>
                <p className="text-muted-foreground">WorkforceIQ-EMP-2026!</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="sm">
                <Link href="/hr/dashboard">
                  Enter HR Dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/employee/dashboard">Enter Employee Dashboard</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>
            WorkforceIQ — demo workspace seeded with synthetic data for
            demonstration.
          </p>
          <p>Powered by Next.js, Supabase, and Gemini.</p>
        </div>
      </footer>
    </div>
  );
}