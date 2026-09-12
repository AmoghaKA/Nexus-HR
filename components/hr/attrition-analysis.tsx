"use client";

import { Bot, Building2, ChevronDown, Loader2, Sparkles, TrendingUp } from "lucide-react";

import type { CalculateAttritionActionResult } from "@/lib/ai/actions";
import { calculateAttritionInsights } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import {
  ConfidenceBadge,
  ErrorBanner,
  LevelBadge,
  LevelDot,
  LoadingRow,
  RecommendedActions,
  ScoreBar,
  TrendIcon,
  PersistenceBadges,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

export function AttritionAnalysis() {
  const { isPending, result, run } = useAiRun<CalculateAttritionActionResult>();
  return (
    <div className="space-y-4">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run(calculateAttritionInsights)}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {isPending ? "Running analysis…" : "Run attrition analysis"}
      </Button>

      {isPending && <LoadingRow label="Computing deterministic risk signals and cohorts…" />}

      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.report && (
        <ReportView
          report={result.report}
          employeeRisks={result.employeeRisks}
          departmentRisk={result.departmentRisk}
          saved={result.saved}
          persistError={result.persistError}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Risk Estimate label
// ---------------------------------------------------------------------------

function RiskEstimateLabel() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/[0.05] px-3 py-2 text-xs">
      <Bot className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="font-semibold">AI Risk Estimate</span>
      <span className="text-muted-foreground">— explainable estimate from workforce signals, not a science.</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report renderer
// ---------------------------------------------------------------------------

const riskColors: Record<string, "primary" | "destructive" | "warning" | "success"> = {
  critical: "destructive",
  high: "destructive",
  medium: "warning",
  low: "success",
};

function levelTone(level: string): "success" | "warning" | "destructive" {
  if (level === "high" || level === "critical") return "destructive";
  if (level === "medium") return "warning";
  return "success";
}

function ReportView({
  report,
  employeeRisks,
  departmentRisk,
  saved,
  persistError,
}: {
  report: NonNullable<CalculateAttritionActionResult["report"]>;
  employeeRisks?: NonNullable<CalculateAttritionActionResult["employeeRisks"]>;
  departmentRisk?: NonNullable<CalculateAttritionActionResult["departmentRisk"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <div className="space-y-6">
      <RiskEstimateLabel />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="text-[11px]">
          <TrendingUp className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Overall risk: <span className="ml-1 font-semibold capitalize">{report.overall_risk_level}</span>
        </Badge>
        <ConfidenceBadge confidence={report.confidence} />
        <PersistenceBadges saved={saved} persistError={persistError} />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{report.headline}</p>

      {/* ----------------------------------------------------------------- */}
      {/* Department risk */}
      {/* ----------------------------------------------------------------- */}
      {departmentRisk && departmentRisk.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">
            Department risk
          </h2>
          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Department</th>
                  <th className="px-4 py-2 font-medium">Risk distribution</th>
                  <th className="px-4 py-2 font-medium">Risk trend</th>
                  <th className="px-4 py-2 font-medium">High-risk employees</th>
                  <th className="px-4 py-2 font-medium">Avg AI risk</th>
                </tr>
              </thead>
              <tbody>
                {departmentRisk.map((d) => (
                  <tr key={d.department} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {d.department}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreBar value={d.avgRiskScore} tone={d.avgRiskScore >= 60 ? "destructive" : d.avgRiskScore >= 40 ? "warning" : "success"} className="w-32" />
                        <span className="text-xs tabular-nums text-muted-foreground">{d.avgRiskScore}/100</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendIcon direction={d.riskTrend} />
                        <span className="capitalize">{d.riskTrend}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={d.highRiskCount > 0 ? "font-semibold text-destructive" : "font-medium"}>{d.highRiskCount}</span>
                        <span className="mx-1 text-muted">/</span>
                        <span className="truncate max-w-[160px]">Top factors: {d.topDrivers.join(", ") || "n/a"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${d.avgRiskScore >= 60 ? "text-destructive" : d.avgRiskScore >= 40 ? "text-warning" : "text-success"}`}>
                        <LevelDot level={d.avgRiskScore >= 60 ? "high" : d.avgRiskScore >= 40 ? "medium" : "low"} />
                        {d.avgRiskScore >= 60 ? "High" : d.avgRiskScore >= 40 ? "Medium" : "Low"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* High-risk employees */}
      {/* ----------------------------------------------------------------- */}
      {employeeRisks && employeeRisks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">
              High-risk employees
            </h2>
            <span className="text-xs text-muted-foreground">{employeeRisks.length} flagged · AI risk estimate ≥ 60</span>
          </div>

          <div className="space-y-3">
            {employeeRisks.map((e) => (
              <EmployeeRiskCard key={e.employeeId} employee={e} />
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* AI cohort report */}
      {/* ----------------------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">AI cohort analysis</h2>
        <div className="space-y-3">
          {report.segments.map((seg, i) => (
            <Card key={`${seg.name}-${i}`} className="ai-gradient-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{seg.name}</span>
                <LevelBadge level={seg.risk_level} />
                <span className="ml-auto text-xs text-muted-foreground">{seg.headcount} employee{seg.headcount === 1 ? "" : "s"}</span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Avg AI risk estimate</span>
                  <span className="font-medium">{seg.avg_risk_score}/100</span>
                </div>
                <ScoreBar value={seg.avg_risk_score} tone={riskColors[seg.risk_level] ?? "primary"} />
              </div>

              {seg.key_drivers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {seg.key_drivers.map((d) => (
                    <span key={d} className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{d}</span>
                  ))}
                </div>
              )}

              {seg.recommended_action && (
                <p className="mt-2.5 border-l-2 border-primary/30 pl-3 text-xs leading-relaxed text-card-foreground">
                  <span className="font-semibold text-primary">Action: </span>
                  {seg.recommended_action}
                </p>
              )}
            </Card>
          ))}

          {report.segments.length === 0 && (
            <p className="text-sm text-muted-foreground">No high-risk cohorts identified at this time.</p>
          )}
        </div>
      </section>

      <RecommendedActions actions={report.recommended_actions} />
      <AiDisclaimer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// High-risk employee card
// ---------------------------------------------------------------------------

function EmployeeRiskCard({
  employee,
}: {
  employee: NonNullable<CalculateAttritionActionResult["employeeRisks"]>[number];
}) {
  const tone = levelTone(employee.riskScore >= 70 ? "high" : employee.riskScore >= 40 ? "medium" : "low");
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{employee.name}</span>
        <span className="text-xs text-muted-foreground">{employee.department}</span>
        <TrendIcon direction={employee.trend} />
        <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
          Risk <span className={tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-success"}>{employee.riskScore}/100</span>
        </span>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>AI risk estimate</span>
          <span className="uppercase font-medium">{employee.riskScore >= 70 ? "High" : employee.riskScore >= 40 ? "Medium" : "Low"}</span>
        </div>
        <ScoreBar value={employee.riskScore} tone={tone === "destructive" ? "destructive" : tone === "warning" ? "warning" : "success"} />
      </div>

      <details className="group mt-3">
        <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
          Why risk increased
        </summary>
        <div className="mt-2 space-y-2">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
            <p className="mb-1 font-semibold text-muted-foreground">Supporting signals</p>
            <ul className="space-y-1">
              {employee.supportingSignals.map((s) => (
                <li key={s} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {s}
                </li>
              ))}
              {employee.supportingSignals.length === 0 && <li className="text-muted-foreground">Insufficient signals.</li>}
            </ul>
          </div>

          <div className="rounded-lg border-l-2 border-primary/30 pl-3 text-xs leading-relaxed text-card-foreground">
            <p className="mb-0.5 font-semibold text-primary">AI explanation</p>
            <pre className="whitespace-pre-wrap font-sans">{employee.aiExplanation}</pre>
          </div>

          <div className="rounded-lg bg-primary/[0.04] px-3 py-2 text-xs">
            <p className="mb-0.5 font-semibold text-primary">Recommended action</p>
            <p>{employee.recommendedAction}</p>
          </div>
        </div>
      </details>
    </Card>
  );
}