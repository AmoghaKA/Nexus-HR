"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, Loader2, ShieldAlert, Sparkles } from "lucide-react";

import { analyzeEmployee, type AnalyzeEmployeeResult } from "@/lib/ai/actions";
import type { RiskLevel } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/shared/risk-badge";

interface EmployeeAnalysisDialogProps {
  employeeId: string;
  employeeName: string;
}

const severityDot: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
  info: "bg-muted-foreground",
};

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmployeeAnalysisDialog({
  employeeId,
  employeeName,
}: EmployeeAnalysisDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AnalyzeEmployeeResult | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      startTransition(async () => {
        setResult(null);
        setResult(await analyzeEmployee(employeeId));
      });
    }
  }

  const pkg = result?.ok ? result.package : null;
  const analysis = result?.ok ? result.analysis : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Analyze Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            AI Employee Analysis
          </DialogTitle>
          <DialogDescription>
            Supabase employee records → Gemini reasoning → structured, explainable profile.
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Analyzing {employeeName}…
          </div>
        )}

        {!isPending && result && !result.ok && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {result.error}
          </div>
        )}

        {!isPending && pkg && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{pkg.employee.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pkg.employee.role} · {pkg.employee.department}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={pkg.employee.status === "active" ? "success" : "outline"}>
                  {pkg.employee.status}
                </Badge>
                {pkg.risk.level && (
                  <RiskBadge level={pkg.risk.level as RiskLevel} score={pkg.risk.latest ?? undefined} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Performance", pkg.performance.latestRating != null ? `${pkg.performance.latestRating}/5` : "—"],
                ["Attendance", pkg.attendance.rate != null ? `${pkg.attendance.rate}%` : "—"],
                ["Goal progress", pkg.goals.avgProgress != null ? `${pkg.goals.avgProgress}%` : "—"],
                ["Skills", String(pkg.skills.total)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border bg-card/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>

            {analysis && (
              <>
                <div className="rounded-lg border bg-card/60 p-4">
                  <p className="text-sm leading-relaxed">{analysis.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      {Math.round(analysis.confidence * 100)}% confidence
                    </Badge>
                    <span className="flex items-center gap-1">
                      Trend: {analysis.performance_trend.direction}
                      <ArrowUpRight
                        className={`h-3.5 w-3.5 ${
                          analysis.performance_trend.direction === "up"
                            ? "text-success"
                            : analysis.performance_trend.direction === "down"
                              ? "text-destructive"
                              : ""
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SectionList title="Strengths" items={analysis.strengths} />
                  <SectionList title="Development areas" items={analysis.development_areas} />
                  <SectionList title="Skill gaps" items={analysis.skill_gaps} />
                  <SectionList title="Engagement signals" items={analysis.engagement_signals} />
                </div>

                {analysis.performance_trend.description && (
                  <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    <span className="font-medium text-card-foreground">Performance trend: </span>
                    {analysis.performance_trend.description}
                  </div>
                )}

                {analysis.risk_signals.length > 0 && (
                  <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-warning">Risk signals</p>
                    <ul className="mt-2 space-y-1.5">
                      {analysis.risk_signals.map((signal) => (
                        <li key={signal} className="flex items-start gap-2 text-sm leading-relaxed">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                          {signal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.recommended_actions.length > 0 && (
                  <div className="rounded-lg border bg-card/60 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recommended actions
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {analysis.recommended_actions.map((action) => (
                        <li key={action} className="flex items-start gap-2 text-sm font-medium text-primary">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {analysis && analysis.insights.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Structured insights
                </h4>
                {analysis.insights.map((insight, index) => (
                  <div key={`${insight.title}-${index}`} className="rounded-lg border bg-card/60 p-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${severityDot[insight.severity] ?? "bg-muted-foreground"}`}
                        aria-hidden="true"
                      />
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <Badge variant="outline" className="ml-auto shrink-0">
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{insight.summary}</p>
                    {insight.evidence.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {insight.evidence.slice(0, 3).map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-xs font-medium text-primary">{insight.recommended_action}</p>
                  </div>
                ))}
              </div>
            ) : (
              !analysis && (
                <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  No AI analysis returned — review the raw signals above.
                </div>
              )
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {typeof result?.saved === "number" && (
                <Badge variant="success">{result.saved} insight(s) saved to ai_insights</Badge>
              )}
              {result?.persistError && (
                <Badge variant="outline" className="text-destructive">Insights not persisted</Badge>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              AI analysis is an estimate from workforce records. It is not a definitive judgment — review with
              the employee&apos;s manager before acting.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}