import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Users } from "lucide-react";

import { fetchRiskSnapshot, type CopilotRiskEmployee } from "@/lib/ai/copilot";
import { fetchOnboardingOverview } from "@/lib/hr/onboarding";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { ChartCard } from "@/components/shared/chart-card";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScoreBar } from "@/components/hr/ai-shared";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Workforce Overview" };
export const dynamic = "force-dynamic";

const levelDot: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

function levelBadge(level: string | null | undefined) {
  const variant =
    level === "critical" || level === "high"
      ? "danger"
      : level === "medium"
        ? "warning"
        : level === "low"
          ? "success"
          : "outline";
  return (
    <Badge variant={variant} className="capitalize">
      {level ?? "unknown"}
    </Badge>
  );
}

export default async function WorkforcePage() {
  let risk;
  let onboarding;
  try {
    [risk, onboarding] = await Promise.all([fetchRiskSnapshot(), fetchOnboardingOverview()]);
  } catch (error) {
    return (
      <ErrorState
        title="Couldn't load workforce data"
        message={
          error instanceof Error
            ? error.message
            : "We couldn't reach Supabase to load the workforce overview. Please try again."
        }
      />
    );
  }

  const employees = risk?.employees ?? [];
  const highRisk = employees.filter((e) => (e.riskScore ?? 0) >= 65);
  const attendingLow = employees.filter((e) => (e.recentAttendancePct ?? 100) < 80);
  const onboardingNeeds = (onboarding ?? []).filter(
    (o) => o.overallStatus === "at_risk" || o.counts.overdue > 0 || o.counts.blocked > 0
  );

  return (
    <div className="space-y-10">
      <PageHeader
        title="Workforce Overview"
        description="A people-level view of risk, attendance and performance across every team."
        badge={
          <Badge variant="secondary">
            <Users className="mr-1 h-3 w-3" aria-hidden="true" />
            {employees.length} employees
          </Badge>
        }
        actions={
          <Link
            href="/hr/copilot"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
          >
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            Dive deeper with the AI Copilot
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Mid-or-high risk</p>
          <p className="mt-1 text-2xl font-bold text-destructive">{highRisk.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Low attendance (under 80%)</p>
          <p className="mt-1 text-2xl font-bold text-warning">{attendingLow.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Onboarding needs attention</p>
          <p className="mt-1 text-2xl font-bold text-primary">{onboardingNeeds.length}</p>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Risk & performance by employee" />
        {employees.length > 0 ? (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Level</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest rating</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attendance</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signals</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...employees]
                  .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
                  .map((e) => (
                    <tr key={e.id ?? e.name} className="bg-card/60">
                      <td className="px-3 py-2 font-medium">{e.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.department}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.role}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <ScoreBar
                            value={e.riskScore ?? 0}
                            tone={(e.riskScore ?? 0) >= 65 ? "destructive" : (e.riskScore ?? 0) >= 45 ? "warning" : "success"}
                            className="max-w-16"
                          />
                          <span className="tabular-nums text-muted-foreground">{e.riskScore ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{levelBadge(e.riskLevel)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.latestRating ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {e.recentAttendancePct != null ? `${Math.round(e.recentAttendancePct)}%` : "—"}
                        {e.priorAttendancePct != null && e.recentAttendancePct != null && e.recentAttendancePct < e.priorAttendancePct && (
                          <span className="ml-1 text-[10px] text-destructive">▼</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {e.factors.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {e.factors.map((f) => (
                              <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <p className="rounded-lg border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No risk data available yet.
          </p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="At-risk employees" description="People with a risk score of 45 or above">
          {highRiskSlice(employees).length > 0 ? (
            <ul className="space-y-2.5">
              {highRiskSlice(employees).map((e) => (
                <li key={e.id ?? e.name} className="flex items-start gap-2.5 rounded-lg border bg-card/60 p-3">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", levelDot[e.riskLevel ?? "high"] ?? "bg-destructive")} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{e.name} <span className="text-xs text-muted-foreground">· {e.department}</span></p>
                    {e.factors.length > 0 && (
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">Drivers: {e.factors.join(", ")}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              No high-risk employees right now.
            </p>
          )}
        </ChartCard>

        <ChartCard title="Onboarding needs attention" description="Overdue, blocked or at-risk plans">
          {onboardingNeeds.length > 0 ? (
            <ul className="space-y-2.5">
              {onboardingNeeds.slice(0, 8).map((p) => (
                <li key={p.employeeId} className="flex items-start gap-2.5 rounded-lg border bg-card/60 p-3">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", p.overallStatus === "at_risk" ? "bg-warning" : "bg-destructive")} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{p.name} <span className="text-xs text-muted-foreground">· {p.department}</span></p>
                    <div className="mt-1 flex items-center gap-2">
                      <ScoreBar value={p.progressPct} tone={p.progressPct < 40 ? "destructive" : "warning"} className="flex-1" />
                      <span className="text-[11px] tabular-nums text-muted-foreground">{p.progressPct}%</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.counts.overdue > 0 && <Badge variant="danger">{p.counts.overdue} overdue</Badge>}
                      {p.counts.blocked > 0 && <Badge variant="warning">{p.counts.blocked} blocked</Badge>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              All onboarding plans are on track.
            </p>
          )}
        </ChartCard>
      </section>
    </div>
  );
}

function highRiskSlice(employees: CopilotRiskEmployee[]) {
  return employees
    .filter((e) => (e.riskScore ?? 0) >= 45)
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 8);
}