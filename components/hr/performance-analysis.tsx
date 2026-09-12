"use client";

import { Award, Loader2, ShieldAlert, Sparkles, Star, TrendingUp, Users } from "lucide-react";

import type { AnalyzePerformanceActionResult } from "@/lib/ai/actions";
import { analyzePerformance } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import {
  BulletList,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  RecommendedActions,
  TrendIcon,
  PersistenceBadges,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

export function PerformanceAnalysis() {
  const { isPending, result, run } = useAiRun<AnalyzePerformanceActionResult>();
  return (
    <div className="space-y-4">
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(analyzePerformance)}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {isPending ? "Running analysis…" : "Run performance analysis"}
      </Button>

      {isPending && <LoadingRow label="Summarizing reviews, goals, and feedback…" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.report && (
        <ReportView
          report={result.report}
          topPerformers={result.topPerformers}
          needsSupport={result.needsSupport}
          saved={result.saved}
          persistError={result.persistError}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report renderer
// ---------------------------------------------------------------------------

function ReportView({
  report,
  topPerformers,
  needsSupport,
  saved,
  persistError,
}: {
  report: NonNullable<AnalyzePerformanceActionResult["report"]>;
  topPerformers?: NonNullable<AnalyzePerformanceActionResult["topPerformers"]>;
  needsSupport?: NonNullable<AnalyzePerformanceActionResult["needsSupport"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">
          <Star className="mr-1 h-3.5 w-3.5 text-warning" aria-hidden="true" />
          Avg performance: <span className="ml-1 font-semibold">{report.overall_rating}/5</span>
        </Badge>
        <ConfidenceBadge confidence={report.confidence} />
        <PersistenceBadges saved={saved} persistError={persistError} />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{report.headline}</p>

      {/* ----------------------------------------------------------------- */}
      {/* Department comparison */}
      {/* ----------------------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">
          Department comparison
        </h2>
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">Department</th>
                <th className="px-4 py-2 font-medium">Avg rating</th>
                <th className="px-4 py-2 font-medium">Trend</th>
                <th className="px-4 py-2 font-medium w-full">Note</th>
              </tr>
            </thead>
            <tbody>
              {report.by_department.map((d) => (
                <tr key={d.department} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{d.department}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums">{d.rating}/5</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(0, Math.min(100, (d.rating / 5) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs">
                      <TrendIcon direction={d.trend} />
                      <span className="capitalize text-muted-foreground">{d.trend}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">{d.note}</td>
                </tr>
              ))}
              {report.by_department.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm text-muted-foreground">No department-level review data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Top performers */}
      {/* ----------------------------------------------------------------- */}
      {topPerformers && topPerformers.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-card-foreground">
            <Award className="h-4 w-4 text-warning" aria-hidden="true" />
            Top performers
          </h2>
          <div className="flex flex-wrap gap-2">
            {topPerformers.map((t) => (
              <span key={`${t.name}-${t.department}`} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
                <Star className="h-3 w-3 text-warning" aria-hidden="true" />
                <span className="font-medium">{t.name}</span>
                <span className="text-muted-foreground">{t.department} · {t.rating}/5</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Employees needing support */}
      {/* ----------------------------------------------------------------- */}
      {needsSupport && needsSupport.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-card-foreground">
            <Users className="h-4 w-4 text-destructive" aria-hidden="true" />
            Employees needing support
          </h2>
          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Employee</th>
                  <th className="px-4 py-2 font-medium">Department</th>
                  <th className="px-4 py-2 font-medium">Rating</th>
                  <th className="px-4 py-2 font-medium">Goal completion</th>
                  <th className="px-4 py-2 font-medium">Why flagged</th>
                </tr>
              </thead>
              <tbody>
                {needsSupport.map((n) => (
                  <tr key={`${n.name}-${n.department}`} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{n.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{n.department}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{n.rating != null ? `${n.rating}/5` : "n/a"}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{n.goalCompletionPct != null ? `${n.goalCompletionPct}%` : "n/a"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{n.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* AI analysis */}
      {/* ----------------------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-card-foreground">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          AI analysis
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-success">Strengths</p>
            <BulletList items={report.strengths} tone="muted" />
          </Card>
          <Card className="p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-destructive">Improvement areas</p>
            <BulletList items={report.improvement_areas} tone="muted" />
          </Card>
        </div>

        {report.goal_risks.length > 0 && (
          <Card className="p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-warning">Goal risks</p>
            <BulletList items={report.goal_risks} tone="muted" />
          </Card>
        )}

        {report.development_recommendations.length > 0 && (
          <Card className="p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">Development recommendations</p>
            <BulletList items={report.development_recommendations} tone="primary" />
          </Card>
        )}
      </section>

      <RecommendedActions actions={report.recommended_actions} />

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        AI analysis recommends actions to HR. HR remains the decision maker — the AI never makes automatic employment decisions.
      </div>

      <AiDisclaimer />
    </div>
  );
}