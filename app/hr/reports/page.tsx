import type { Metadata } from "next";
import Link from "next/link";
import { Bot, BarChart3, Layers, ListChecks, BrainCircuit, Radar, Sparkles } from "lucide-react";

import { computeHrDashboardData } from "@/lib/hr/analytics";
import { buildWorkforceBriefing, computeWorkforceHealthScore } from "@/lib/ai/briefing";
import { fetchOnboardingOverview } from "@/lib/hr/onboarding";
import { fetchRecruitmentData } from "@/lib/hr/recruitment";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HealthScoreCard } from "@/components/hr/panels/health-score-card";
import { ScoreBar } from "@/components/hr/ai-shared";
import { WorkforceBriefButton } from "@/components/hr/workforce-brief-button";

import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Workforce Intelligence Report" };
export const dynamic = "force-dynamic";

const severityDot: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
  info: "bg-muted-foreground",
};

function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)}>
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 text-sm tabular-nums", className)}>{children}</td>;
}

function MatchBadge({ match }: { match: number | null }) {
  if (match == null) return <Badge variant="outline">—</Badge>;
  const pct = Math.round(match * 100);
  const variant = pct >= 75 ? "success" : pct >= 50 ? "secondary" : "outline";
  return <Badge variant={variant}>{pct}%</Badge>;
}

export default async function ReportsPage() {
  let dashboard;
  let briefing;
  let onboarding;
  let recruitment;

  try {
    [dashboard, briefing, onboarding, recruitment] = await Promise.all([
      computeHrDashboardData(),
      buildWorkforceBriefing(),
      fetchOnboardingOverview(),
      fetchRecruitmentData(),
    ]);
  } catch (error) {
    return (
      <ErrorState
        title="Couldn't load report data"
        message={
          error instanceof Error
            ? error.message
            : "We couldn't reach Supabase to build this report. Please try again."
        }
      />
    );
  }

  const health = computeWorkforceHealthScore(briefing.package);
  const depts = [...briefing.package.departments].sort((a, b) => (b.avgRiskScore ?? 0) - (a.avgRiskScore ?? 0));
  const lowCoverage = briefing.package.skills.gaps;
  const plansNeedingHelp = (onboarding ?? []).filter(
    (o) => o.overallStatus === "at_risk" || o.counts.overdue > 0 || o.counts.blocked > 0
  );
  const topCandidates = recruitment.candidates
    .filter((c) => c.assessment)
    .sort((a, b) => (b.assessment!.overall_match ?? 0) - (a.assessment!.overall_match ?? 0))
    .slice(0, 6);

  const highInsights = briefing.insights.filter((i) => i.severity === "critical" || i.severity === "high");

  return (
    <div className="space-y-10">
      <PageHeader
        title="Workforce Intelligence Report"
        description="A consolidated view of every workforce signal, synthesized from live Supabase data."
        badge={
          <Badge variant="secondary">
            <BarChart3 className="mr-1 h-3 w-3" aria-hidden="true" />
            Live data
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <WorkforceBriefButton />
            <Link
              href="/hr/copilot"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
            >
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              Ask the AI Copilot
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <HealthScoreCard score={health} />
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Executive summary</h3>
            {highInsights.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {highInsights.slice(0, 3).map((i) => (
                  <li key={i.id} className="flex items-start gap-2">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", severityDot[i.severity ?? "info"])} aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium leading-snug">{i.title}</p>
                      <p className="text-xs text-muted-foreground">{i.summary}</p>
                      {i.recommendedAction && <p className="mt-0.5 text-xs font-medium text-primary">{i.recommendedAction}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No high-severity signals right now.</p>
            )}
          </Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card/60 p-4 text-center">
              <p className="text-xs text-muted-foreground">High-risk employees</p>
              <p className="mt-1 text-2xl font-bold">{briefing.package.risk.highRiskCount}</p>
            </div>
            <div className="rounded-lg border bg-card/60 p-4 text-center">
              <p className="text-xs text-muted-foreground">Open roles</p>
              <p className="mt-1 text-2xl font-bold">{briefing.package.recruitment.openRoles}</p>
            </div>
            <div className="rounded-lg border bg-card/60 p-4 text-center">
              <p className="text-xs text-muted-foreground">Active candidates</p>
              <p className="mt-1 text-2xl font-bold">{briefing.package.recruitment.activeCandidates}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Attrition by department" />
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40">
              <tr>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Headcount</TableHead>
                <TableHead className="text-right">Avg risk</TableHead>
                <TableHead className="text-right">High risk</TableHead>
                <TableHead className="text-right">Goal completion</TableHead>
                <TableHead className="text-right">Neg. feedback</TableHead>
                <TableHead className="text-right">Open roles</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y">
              {depts.map((d) => (
                <tr key={d.department} className="bg-card/60">
                  <TableCell className="font-medium">{d.department}</TableCell>
                  <TableCell className="text-right">{d.headcount}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.avgRiskScore ?? "n/a"}</TableCell>
                  <TableCell className="text-right">
                    {d.highRiskCount > 0 ? (
                      <span className="text-destructive font-medium">{d.highRiskCount}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.goalCompletionPct != null ? `${d.goalCompletionPct}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{d.negativeFeedbackCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.openRolesCount}</TableCell>
                </tr>
              ))}
              {depts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No department data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Top risk employees" />
        {dashboard.highRisk.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.highRisk.map((emp) => (
              <Card key={emp.id} className="p-4">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", emp.risk === "critical" || emp.risk === "high" ? "bg-destructive" : emp.risk === "medium" ? "bg-warning" : "bg-success")} aria-hidden="true" />
                  <p className="text-sm font-semibold">{emp.name}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{emp.role} · {emp.department}</p>
                <div className="mt-2">
                  <ScoreBar value={emp.score} tone={emp.score >= 70 ? "destructive" : "warning"} />
                  <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">Score {emp.score} / 100</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No employees currently exceed the risk threshold.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading title="Top skill gaps" />
        {lowCoverage.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {lowCoverage.map((g) => (
              <Card key={g.skill} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{g.skill}</p>
                  <Badge variant={g.priority === "high" ? "danger" : g.priority === "medium" ? "warning" : "secondary"}>
                    {g.priority} priority
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{g.suggestedAction}</p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No material skill gaps detected.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading title="Recruitment pipeline" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Funnel</h3>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {dashboard.pipeline.map((stage) => (
                <span key={stage.stage} className="rounded-full border bg-card/60 px-3 py-1 tabular-nums">
                  {stage.stage}: <span className="font-semibold text-card-foreground">{stage.count}</span>
                </span>
              ))}
              {dashboard.pipeline.length === 0 && <span>No pipeline data.</span>}
            </div>
          </Card>
          <Card className="overflow-hidden">
            {topCandidates.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Match</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topCandidates.map((c) => (
                    <tr key={c.id} className="bg-card/60">
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell>{c.job_title ?? "—"}</TableCell>
                      <TableCell className="text-right"><MatchBadge match={c.assessment!.overall_match} /></TableCell>
                      <TableCell>{c.assessment!.recommendation ?? "—"}</TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">No assessed candidates yet.</div>
            )}
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Onboarding plans needing attention" />
        {plansNeedingHelp.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plansNeedingHelp.slice(0, 6).map((p) => (
              <Card key={p.employeeId} className="p-4">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", p.overallStatus === "at_risk" ? "bg-warning" : "bg-destructive")} aria-hidden="true" />
                  <p className="text-sm font-semibold">{p.name}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.role} · {p.department}</p>
                <div className="mt-2">
                  <ScoreBar value={p.progressPct} tone={p.progressPct < 40 ? "destructive" : "warning"} />
                  <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">{p.progressPct}% complete</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {p.counts.overdue > 0 && <Badge variant="danger">{p.counts.overdue} overdue</Badge>}
                  {p.counts.blocked > 0 && <Badge variant="warning">{p.counts.blocked} blocked</Badge>}
                  <Badge variant="outline">{p.overallStatus}</Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            All onboarding plans are on track.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading title="How WorkforceIQ Thinks" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { icon: Layers, label: "HR data ingested", detail: "Recruitment, onboarding, performance, goals, skills, attendance, policies" },
            { icon: Radar, label: "Signal detection", detail: "Each domain is scored independently by Gemini" },
            { icon: BrainCircuit, label: "Cross-domain reasoning", detail: "Signals are connected to reflect real workforce complexity" },
            { icon: Sparkles, label: "Explainable output", detail: "Every insight carries evidence, reasoning and confidence" },
            { icon: ListChecks, label: "Actionable next steps", detail: "Concrete recommendations at employee, team and org level" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border bg-card/60 p-4 text-center">
                <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-xs font-semibold">{s.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{s.detail}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}