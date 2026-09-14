import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Briefcase,
  Check,
  CheckCircle2,
  Database,
  GraduationCap,
  HeartPulse,
  Layers,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users2,
  Zap,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";


const capabilities = [
  {
    icon: Bot,
    tag: "Conversational",
    title: "AI Workforce Copilot",
    desc: "Ask questions about attrition, performance, hiring or onboarding and get answers grounded in your workforce data.",
    stat: "10+ intent types",
  },
  {
    icon: HeartPulse,
    tag: "Predictive",
    title: "Attrition Intelligence",
    desc: "See retention risk by employee, understand the signals behind it, and plan targeted follow-up.",
    stat: "Risk 0–100",
  },
  {
    icon: Briefcase,
    tag: "Recruiting",
    title: "Recruitment Intelligence",
    desc: "Review candidates by role with strengths, gaps and match signals to support consistent shortlisting.",
    stat: "Match scoring",
  },
  {
    icon: TrendingUp,
    tag: "Performance",
    title: "Performance Intelligence",
    desc: "Bring review ratings, attendance patterns and goal progress together for focused manager action.",
    stat: "Multi-signal",
  },
  {
    icon: Layers,
    tag: "Skills",
    title: "Skill Intelligence",
    desc: "Compare team skills with role requirements, highlight coverage gaps, and plan development steps.",
    stat: "Graph analysis",
  },
  {
    icon: GraduationCap,
    tag: "Onboarding",
    title: "Adaptive Onboarding",
    desc: "Track onboarding task by task, spot delays and blockers, and keep each plan moving forward.",
    stat: "Task-level",
  },
] as const;

const pipeline = [
  { icon: Database, title: "Workforce data connected", desc: "Recruitment, onboarding, performance, goals, skills, attendance and policies come together in one workspace." },
  { icon: Radar, title: "Signals surfaced", desc: "AI reviews each domain to highlight meaningful changes, risks and opportunities." },
  { icon: BrainCircuit, title: "Context brought together", desc: "Signals are connected across domains so teams can see the wider context behind workforce trends." },
  { icon: Sparkles, title: "Insights explained", desc: "Insights include supporting evidence, reasoning, severity and confidence so people can review them clearly." },
  { icon: Target, title: "Next steps made practical", desc: "Turn findings into focused actions for employees, managers, departments and recruiters." },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col overflow-hidden bg-[#fafaf8] text-[#17191f]">
      {/* ── Navbar ────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.04] bg-[#fafaf8]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-1">
            <div className="mr-3 hidden items-center gap-1 md:flex">
              {[
                { label: "Platform", href: "#platform" },
                { label: "How it works", href: "#how" },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[#686a70] transition-colors hover:bg-black/[0.03] hover:text-[#17191f]"
                >
                  {l.label}
                </a>
              ))}
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-[#686a70] hover:bg-black/[0.04] hover:text-[#17191f]"
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-[#3e43d8] px-5 text-white shadow-md shadow-[#3e43d8]/20 transition-all hover:bg-[#3338c7] hover:shadow-lg hover:shadow-[#3e43d8]/30"
            >
              <Link href="/signup">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden pb-20 pt-24 sm:pb-28 sm:pt-32 lg:pb-36 lg:pt-40">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/3 bg-[radial-gradient(ellipse_55%_50%_at_50%_40%,rgba(62,67,216,0.07),transparent_70%)]" />
            <div className="absolute -right-32 top-20 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.04),transparent_70%)]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
              {/* Left: copy */}
              <div className="sr-fade max-w-xl">
                {/* Badge */}
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c8c9f3]/60 bg-[#f2f1ff] px-4 py-1.5 shadow-sm shadow-[#3e43d8]/5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e0dfff]">
                    <BrainCircuit className="h-3 w-3 text-[#3e43d8]" />
                  </span>
                  <span className="text-xs font-semibold tracking-wide text-[#3e43d8]">
                    AI-powered workforce intelligence
                  </span>
                </div>

                {/* Headline */}
                <h1 className="sr-fade-d1 text-5xl font-bold leading-[1.05] tracking-[-0.03em] text-[#17191f] sm:text-6xl lg:text-7xl">
                  One connected view of your{" "}
                  <span className="bg-gradient-to-r from-[#3e43d8] via-[#7c3aed] to-[#3e43d8] bg-clip-text text-transparent">
                    people.
                  </span>
                </h1>

                {/* Subhead */}
                <p className="sr-fade-d2 mt-7 max-w-lg text-base leading-7 text-[#686a70] sm:text-lg">
                  Nexus HR brings recruitment, onboarding, performance, skills,
                  attendance and attrition into one workspace, then turns the
                  connected signals into clear next steps for your team.
                </p>

                {/* CTAs */}
                <div className="sr-fade-d3 mt-9 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-full bg-[#17191f] px-7 text-white shadow-xl shadow-[#17191f]/15 transition-all hover:scale-[1.02] hover:bg-[#2b2d35] hover:shadow-2xl"
                  >
                    <Link href="/login">
                      Explore the HR workspace <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-[#d2d0ca] bg-white/70 px-7 text-[#4e5056] backdrop-blur-sm transition-all hover:border-[#b8b9ed] hover:bg-white hover:text-[#17191f]"
                  >
                    <Link href="/login">
                      See the employee workspace
                    </Link>
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="sr-fade-d4 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#92928e]">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#168467]" />
                    Role-based workspaces
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-[#3e43d8]" />
                    Supabase-backed data
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BrainCircuit className="h-3.5 w-3.5 text-[#7c3aed]" />
                    Reviewable recommendations
                  </span>
                </div>
              </div>

              {/* Right: dashboard mockup */}
              <div className="sr-fade-d2 relative">
                {/* Glow */}
                <div className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(62,67,216,0.12),transparent_70%)] blur-xl" />

                {/* Dashboard card */}
                <div className="relative overflow-hidden rounded-2xl border border-[#e2e0da] bg-white shadow-[0_32px_80px_-40px_rgba(38,36,31,0.3)] sm:rounded-3xl">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 border-b border-black/[0.04] bg-[#fafaf8] px-5 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#e5e3dd]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#e5e3dd]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#e5e3dd]" />
                    </div>
                    <div className="ml-2 flex-1 rounded-lg bg-white px-3 py-1.5 text-xs text-[#92928e] shadow-sm ring-1 ring-black/[0.04]">
                      app.nexushr.com/hr/dashboard
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Synced
                    </span>
                  </div>

                  {/* Dashboard body */}
                  <div className="grid gap-3 bg-[#f7f7f5] p-4 sm:grid-cols-3 sm:p-5">
                    {/* Health score — spans 2 */}
                    <div className="rounded-xl border border-black/[0.04] bg-white p-4 shadow-sm sm:col-span-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-[#92928e]">
                            Workforce health score
                          </p>
                          <p className="mt-1 text-4xl font-bold tracking-tight text-[#17191f]">
                            82
                            <span className="text-base font-normal text-[#b8b9b5]">
                              {" "} / 100
                            </span>
                          </p>
                        </div>
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                          <TrendingUp className="h-3 w-3" /> +4.8%
                        </span>
                      </div>
                      {/* Chart */}
                      <div className="mt-5 flex h-16 items-end gap-1">
                        {[30, 38, 35, 48, 42, 58, 52, 66, 62, 76, 70, 85, 78, 82].map(
                          (h, i) => (
                            <span
                              key={i}
                              className="flex-1 rounded-t-sm bg-[#eeedff]"
                              style={{ height: `${h}%` }}
                            >
                              <span
                                className="block h-full rounded-t-sm bg-[#3e43d8]"
                                style={{ opacity: i >= 10 ? 1 : 0.35 }}
                              />
                            </span>
                          )
                        )}
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] text-[#b8b9b5]">
                        <span>Jan</span>
                        <span>Jul</span>
                        <span>Dec</span>
                      </div>
                    </div>

                    {/* Key signals */}
                    <div className="rounded-xl border border-black/[0.04] bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-[#92928e]">
                          Key signals
                        </p>
                        <Zap className="h-3.5 w-3.5 text-[#3e43d8]" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          { l: "Attendance", v: "94.2%", w: 94, c: "bg-emerald-500" },
                          { l: "Goals done", v: "78%", w: 78, c: "bg-[#3e43d8]" },
                          { l: "Skill coverage", v: "71%", w: 71, c: "bg-amber-500" },
                        ].map((s) => (
                          <div key={s.l}>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-[#92928e]">{s.l}</span>
                              <span className="font-semibold text-[#17191f]">
                                {s.v}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-[#f0efed]">
                              <div
                                className={`h-full rounded-full ${s.c}`}
                                style={{ width: `${s.w}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* High-risk */}
                    <div className="rounded-xl border border-black/[0.04] bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-rose-500">
                          <Users2 className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-xs font-medium text-[#92928e]">
                          High-risk employees
                        </p>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-[#17191f]">
                        23
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-rose-500">
                        Needs attention this week
                      </p>
                    </div>

                    {/* AI brief — spans 2 */}
                    <div className="rounded-xl border border-black/[0.04] bg-white p-4 shadow-sm sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                          <p className="text-xs font-bold text-[#17191f]">
                            AI workforce brief
                          </p>
                        </div>
                        <span className="text-[10px] text-[#b8b9b5]">
                          Just now
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-[#686a70]">
                        Engineering attrition risk is trending up, driven by
                        attendance variability and declining goal progress on the
                        platform team. Consider targeted manager check-ins for 3
                        employees.
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-[#3e43d8]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Evidence-backed recommendation
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Problem / Solution ────────────────────────────── */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3e43d8]">
                  The challenge
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#17191f] sm:text-4xl">
                  HR data is everywhere.
                  <br />
                  Clarity is nowhere.
                </h2>
                <p className="mt-5 text-[#686a70] leading-relaxed">
                  Recruitment, performance, attendance and goals often live in
                  separate places. HR leaders spend too much time compiling
                  updates instead of acting on what matters.
                </p>
                <ul className="mt-7 space-y-3">
                  {[
                    "Time lost assembling updates from separate sources",
                    "Important workforce signals are easy to miss",
                    "No shared view across the employee lifecycle",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-[#4e5056]"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3e43d8]">
                  The solution
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#17191f] sm:text-4xl">
                  One connected system.
                  <br />
                  Confident action.
                </h2>
                <p className="mt-5 text-[#686a70] leading-relaxed">
                  Nexus HR brings the signals into one shared view, then AI
                  turns them into explainable recommendations your team can
                  review and act on.
                </p>
                <ul className="mt-7 space-y-3">
                  {[
                    "Workforce health score across seven categories",
                    "AI insights with evidence and confidence",
                    "Focused action plans for the signals that matter",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-[#4e5056]"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3e43d8]">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────── */}
        <section
          id="platform"
          className="border-y border-black/[0.04] bg-[#f7f7f5] py-24 sm:py-32"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3e43d8]">
                Platform
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#17191f] sm:text-4xl lg:text-5xl">
                Everything your HR team needs — in one place.
              </h2>
              <p className="mt-4 text-[#686a70]">
                Connected tools for workforce planning, people operations and
                employee growth.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((cap, i) => (
                <Card
                  key={cap.title}
                  className={`group relative overflow-hidden border-[#e2e0da] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#b8b9ed] hover:shadow-xl hover:shadow-[#3e43d8]/[0.06] sr-fade-d${Math.min(i + 1, 6)}`}
                >
                  <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[#f2f1ff] text-[#3e43d8] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#3e43d8] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[#3e43d8]/25">
                    <cap.icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-[#f5f4f0] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#92928e]">
                    {cap.tag}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-[#17191f]">
                    {cap.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#686a70]">
                    {cap.desc}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-[#3e43d8]/60">
                    <Zap className="h-3 w-3" />
                    {cap.stat}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────── */}
        <section id="how" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3e43d8]">
                Explainable by design
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#17191f] sm:text-4xl lg:text-5xl">
                How Nexus HR thinks
              </h2>
              <p className="mt-4 text-[#686a70]">
                Every insight follows the same path — from workforce signal to
                explainable recommendation.
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-[10%] right-[10%] top-6 hidden h-px bg-gradient-to-r from-transparent via-[#d6d3cc] to-transparent lg:block" />

              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
                {pipeline.map((step, i) => (
                  <div
                    key={step.title}
                    className="relative flex flex-col items-center text-center"
                  >
                    <span className="relative mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[#c8c9f3] bg-[#f2f1ff] text-[#3e43d8] shadow-sm transition-all duration-300 hover:scale-110 hover:border-[#3e43d8] hover:shadow-md hover:shadow-[#3e43d8]/15">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="mb-2 text-[10px] font-bold text-[#b8b9b5]">
                      0{i + 1}
                    </span>
                    <h3 className="text-sm font-bold text-[#17191f]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#686a70]">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Intelligence ───────────────────────────────── */}
        <section className="border-y border-black/[0.04] bg-[#f7f7f5] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3e43d8]">
                  AI Intelligence
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#17191f] sm:text-4xl lg:text-5xl">
                  Insights that explain themselves.
                </h2>
                <p className="mt-5 text-lg text-[#686a70] leading-relaxed">
                  Every insight carries evidence, reasoning, severity and a
                  confidence score. No black-box recommendations — just clear,
                  grounded analysis.
                </p>
                <div className="mt-8 space-y-5">
                  {[
                    {
                      icon: ShieldCheck,
                      t: "Evidence-backed",
                      d: "Recommendations are grounded in the data available in your workspace.",
                    },
                    {
                      icon: Target,
                      t: "Actionable",
                      d: "Concrete next steps, not just analysis.",
                    },
                    {
                      icon: BrainCircuit,
                      t: "Cross-source reasoning",
                      d: "Signals connected across domains for better context.",
                    },
                  ].map((x) => (
                    <div key={x.t} className="flex items-start gap-3.5">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f2f1ff] text-[#3e43d8]">
                        <x.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#17191f]">
                          {x.t}
                        </p>
                        <p className="mt-0.5 text-sm text-[#686a70]">{x.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(62,67,216,0.08),transparent_70%)] blur-xl" />
                <div className="relative overflow-hidden rounded-2xl border border-[#e2e0da] bg-white p-6 shadow-2xl shadow-[#3e43d8]/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#3e43d8] text-white shadow-md shadow-[#3e43d8]/20">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-bold text-[#17191f]">
                        AI Insight
                      </span>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      High severity
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[#4e5056]">
                    <span className="font-semibold text-[#17191f]">
                      Engineering
                    </span>{" "}
                    shows{" "}
                    <span className="font-semibold text-[#17191f]">
                      3 high-risk employees
                    </span>{" "}
                    — driven by rising attendance variability and declining goal
                    completion on the platform team.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {[
                      "Engineering · 3 at risk",
                      "Attendance ▼",
                      "Goal completion ▼",
                      "83% confidence",
                    ].map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-[#f5f4f0] px-2.5 py-1 text-[10px] font-semibold text-[#686a70]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl border border-[#f0efed] bg-[#fafaf8] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8b9b5]">
                      Evidence
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#686a70]">
                      Employee #42 — attendance dropped 18% over 3 months.
                      Employee #17 — 2 consecutive missed goals. Employee #31 —
                      review downgraded from Exceeds to Meets.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#3e43d8]">
                    <CheckCircle2 className="h-4 w-4" />
                    Generate retention plan →
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="border-t border-black/[0.04] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#17191f] sm:text-4xl lg:text-5xl">
              See your workforce clearly.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base text-[#686a70]">
              Explore the seeded demo workspace with realistic synthetic data.
              Sign in to choose an HR or employee experience.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-[#17191f] px-8 text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-[#2b2d35]"
              >
                <Link href="/login">
                  Explore the HR workspace <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-[#d2d0ca] px-8 text-[#4e5056] transition-all hover:border-[#b8b9ed] hover:bg-white"
              >
                <Link href="/login">
                  See the employee workspace
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-black/[0.04] bg-[#f7f7f5]">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo size="sm" />
            <p className="mt-3 max-w-[260px] text-xs leading-5 text-[#92928e]">
              Connected workforce intelligence for HR teams and employees.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#b8b9b5]">
              Product
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#686a70]">
              <li>
                <a
                  href="#platform"
                  className="transition-colors hover:text-[#3e43d8]"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how"
                  className="transition-colors hover:text-[#3e43d8]"
                >
                  How it works
                </a>
              </li>
              <li>
                <Link
                  href="/hr/dashboard"
                  className="transition-colors hover:text-[#3e43d8]"
                >
                  HR workspace
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#b8b9b5]">
              Workspaces
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#686a70]">
              <li>
                <Link
                  href="/hr/copilot"
                  className="transition-colors hover:text-[#3e43d8]"
                >
                  AI Copilot
                </Link>
              </li>
              <li>
                <Link
                  href="/hr/recruitment"
                  className="transition-colors hover:text-[#3e43d8]"
                >
                  Recruitment
                </Link>
              </li>
              <li>
                <Link
                  href="/hr/reports"
                  className="transition-colors hover:text-[#3e43d8]"
                >
                  Reports
                </Link>
              </li>
              <li>
                <Link
                  href="/employee/dashboard"
                  className="transition-colors hover:text-[#3e43d8]"
                >
                  Employee portal
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#b8b9b5]">
              Company
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#686a70]">
              <li>
                <a href="#" className="transition-colors hover:text-[#3e43d8]">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-[#3e43d8]">
                  Security
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-[#3e43d8]">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-[#3e43d8]">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-black/[0.04]">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-[#92928e] sm:flex-row sm:px-8">
            <p>
              &copy; 2026 Nexus HR. Demo workspace seeded with synthetic
              data.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[#3e43d8] transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-[#3e43d8] transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-[#3e43d8] transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
