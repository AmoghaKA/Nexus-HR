import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  CircleGauge,
  Database,
  GraduationCap,
  HeartPulse,
  Layers,
  ListChecks,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users2,
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
    <div className="flex min-h-svh flex-col overflow-hidden bg-[#f5f2ec] text-[#17191f]">
      <header className="sticky top-0 z-20 border-b border-[#dedbd4] bg-[#f5f2ec]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-1.5 sm:gap-3">
            <div className="mr-2 hidden items-center gap-6 text-sm text-[#686a70] lg:flex">
              <Link className="transition-colors hover:text-[#17191f]" href="#platform">Platform</Link>
              <Link className="transition-colors hover:text-[#17191f]" href="#how-it-works">How it works</Link>
              <Link className="transition-colors hover:text-[#17191f]" href="#demo">Demo</Link>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-[#686a70] hover:bg-white hover:text-[#17191f]">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#3e43d8] text-white shadow-lg shadow-[#3e43d8]/20 hover:bg-[#3035bd]">
              <Link href="/signup">Start exploring <ArrowRight aria-hidden="true" /></Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="landing-grid pointer-events-none absolute inset-x-0 top-0 h-[760px] opacity-35" />
        <div className="landing-glow pointer-events-none absolute -right-40 top-0 h-[560px] w-[560px] rounded-full opacity-50" />
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20 lg:pb-32 lg:pt-28">
          <div className="landing-rise max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c8c9f3] bg-[#f2f1ff] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#3e43d8] shadow-sm shadow-[#3e43d8]/10">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#dcdcff]"><BrainCircuit className="h-3 w-3" aria-hidden="true" /></span>
              AI-powered people intelligence
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-[#17191f] sm:text-7xl">
              A clearer view of your <span className="text-[#3e43d8]">people.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#686a70] sm:text-lg">
              WorkforceIQ connects recruitment, onboarding, performance, skills, attendance and attrition in one living view, then turns the signals into clear next steps for your team.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-[#17191f] px-6 text-white shadow-xl shadow-[#17191f]/15 hover:bg-[#2b2d35]">
                <Link href="/hr/dashboard">Open HR command center <ArrowRight aria-hidden="true" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-[#d2d0ca] bg-white/70 px-6 text-[#4e5056] hover:bg-white">
                <Link href="/employee/dashboard">View employee experience</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#777873]">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#168467]" aria-hidden="true" /> Privacy-first by design</span>
              <span className="flex items-center gap-1.5"><Database className="h-4 w-4 text-[#3e43d8]" aria-hidden="true" /> Grounded in live data</span>
            </div>
          </div>

          <div className="landing-rise relative [animation-delay:120ms]">
            <div className="absolute -inset-5 rounded-[2rem] bg-[#c9c9f5]/40 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-[#dfddd7] bg-[#fffefa] shadow-[0_28px_75px_-30px_rgba(38,36,31,0.35)] sm:rounded-3xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-white"><CircleGauge className="h-4 w-4" aria-hidden="true" /></div><div><p className="text-sm font-semibold text-slate-900">Workforce command center</p><p className="text-[11px] text-slate-400">Monday, September 22 · Live workspace</p></div></div>
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Synced</span>
              </div>
              <div className="grid gap-4 bg-slate-50/70 p-4 sm:grid-cols-3 sm:p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
                  <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-500">Workforce health score</p><p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">82<span className="text-base text-slate-400"> / 100</span></p></div><span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"><TrendingUp className="h-3 w-3" aria-hidden="true" /> 4.8%</span></div>
                  <div className="mt-5 flex h-16 items-end gap-1.5">{[35, 42, 39, 52, 48, 64, 59, 72, 69, 81, 76, 88, 82].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-indigo-100" style={{ height: `${height}%` }}><span className="block h-full rounded-t-sm bg-indigo-500" style={{ opacity: index > 8 ? 1 : 0.45 }} /></span>)}</div>
                  <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>Apr</span><span>Sep</span></div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">Key signals</p><Activity className="h-4 w-4 text-indigo-500" aria-hidden="true" /></div><div className="mt-4 space-y-3"><div><div className="flex justify-between text-[11px]"><span className="text-slate-500">Attendance</span><span className="font-semibold text-slate-900">94.2%</span></div><div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className="h-full w-[94%] rounded-full bg-emerald-500" /></div></div><div><div className="flex justify-between text-[11px]"><span className="text-slate-500">Goal completion</span><span className="font-semibold text-slate-900">78%</span></div><div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className="h-full w-[78%] rounded-full bg-indigo-500" /></div></div><div><div className="flex justify-between text-[11px]"><span className="text-slate-500">Skill coverage</span><span className="font-semibold text-slate-900">71%</span></div><div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className="h-full w-[71%] rounded-full bg-amber-500" /></div></div></div></div>
                <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded-md bg-rose-50 text-rose-600"><Users2 className="h-3.5 w-3.5" aria-hidden="true" /></div><p className="text-xs font-medium text-slate-500">High-risk employees</p></div><p className="mt-3 text-2xl font-semibold text-slate-950">23</p><p className="mt-1 text-[11px] text-rose-600">Needs a closer look this week</p></div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-600" aria-hidden="true" /><p className="text-xs font-semibold text-slate-800">AI workforce brief</p></div><span className="text-[10px] font-medium text-slate-400">Just now</span></div><p className="mt-3 text-xs leading-5 text-slate-600">Engineering attrition risk is trending up, driven by attendance and goal progress. Consider targeted manager check-ins for 3 employees.</p><div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-indigo-600"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Evidence-backed recommendation</div></div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="relative mx-auto w-full max-w-7xl px-5 pb-24 sm:px-8">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3e43d8]">One connected system</p><h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-[#17191f] sm:text-4xl">From workforce signals to confident action.</h2></div>
            <p className="max-w-sm text-sm leading-6 text-[#686a70]">Give HR leaders a complete picture and give every employee a clearer path to grow.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <Card key={cap.title} className="border-[#dedbd4] bg-[#fffefa]/80 p-5 shadow-none transition-all hover:-translate-y-1 hover:border-[#b8b9ed] hover:shadow-lg hover:shadow-[#3e43d8]/10">
                  <span className="mb-8 grid h-10 w-10 place-items-center rounded-lg bg-[#eeedff] text-[#3e43d8]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold text-[#17191f]">{cap.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#686a70]">
                    {cap.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="relative border-y border-[#dedbd4] bg-[#fffefa]/60 py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3e43d8]">Explainable by design</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#17191f] sm:text-4xl">How WorkforceIQ thinks</h2>
            <p className="max-w-2xl text-[#686a70]">
              Every insight passes through the same pipeline — from raw signal to explainable,
              actionable recommendation.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {pipeline.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative flex flex-col items-center text-center">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-8 top-5 hidden h-px w-8 bg-[#d6d3cc] lg:block"
                    />
                  )}
                  <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-[#c8c9f3] bg-[#eeedff] text-[#3e43d8]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#92928e]">0{i + 1}</span>
                  <h3 className="text-sm font-semibold text-[#17191f]">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#686a70]">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
          </div>
        </section>

        <section id="demo" className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-[#d4d1c9] bg-[#e8e7ff] p-7 text-[#17191f] shadow-2xl shadow-[#3e43d8]/10 sm:p-12">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.75),transparent_52%)]" />
            <div className="relative max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3e43d8]">A real workspace to explore</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">See the whole employee lifecycle in one place.</h2>
            <p className="mt-4 text-sm leading-6 text-[#686a70] sm:text-base">
              The workspace is seeded with realistic synthetic data — 30 employees across 5
              departments, recruitment pipeline, 200+ goals, reviews, attendance records, a skills
              catalog and HR policies. All AI features run over this data through the real Gemini API.
            </p>
            <div className="mt-8 grid gap-3 text-left text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-white/70 bg-white/60 p-4"><p className="font-semibold">HR Manager</p><p className="mt-1 text-[#686a70]">hr@workforceiq.demo</p><p className="text-[#686a70]">WorkforceIQ-HR-2026!</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/60 p-4"><p className="font-semibold">Employee</p><p className="mt-1 text-[#686a70]">employee@workforceiq.demo</p><p className="text-[#686a70]">WorkforceIQ-EMP-2026!</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="sm" className="bg-[#17191f] text-white hover:bg-[#2b2d35]">
                <Link href="/hr/dashboard">
                  Enter HR Dashboard
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-[#b9b9e5] bg-transparent text-[#17191f] hover:bg-white/70 hover:text-[#17191f]">
                <Link href="/employee/dashboard">Enter Employee Dashboard</Link>
              </Button>
            </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dedbd4] bg-[#fffefa]/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-5 py-7 text-xs text-[#777873] sm:flex-row sm:px-8">
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