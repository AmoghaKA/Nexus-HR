"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck2,
  Gauge,
  Loader2,
  ShieldAlert,
  Sparkles,
  Target,
  ThumbsUp,
  Wrench,
  type LucideIcon,
} from "lucide-react";

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
import { InsightCard, RecommendedActions } from "@/components/hr/ai-shared";
import { cn } from "@/lib/utils";

interface EmployeeAnalysisDialogProps {
  employeeId: string;
  employeeName: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 px-3 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

function ListBlock({
  icon: Icon,
  title,
  items,
  tone = "default",
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  tone?: "default" | "warning";
}) {
  if (items.length === 0) return null;
  const dot = tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className="rounded-xl border bg-card/60 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-start gap-2 text-sm leading-relaxed text-card-foreground">
            <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
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
            Supabase employee records → Qwen reasoning → structured, explainable profile.
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
          <div className="sr-fade space-y-5">
            <div className="relative overflow-hidden rounded-xl border bg-card/60 p-4">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.07] to-transparent"
                aria-hidden="true"
              />
              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary via-indigo-500 to-violet-500 text-sm font-bold text-primary-foreground shadow-sm">
                    {initials(pkg.employee.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{pkg.employee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pkg.employee.role} · {pkg.employee.department}
                    </p>
                  </div>
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
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile icon={Gauge} label="Performance" value={pkg.performance.latestRating != null ? `${pkg.performance.latestRating}/5` : "—"} />
              <StatTile icon={CalendarCheck2} label="Attendance" value={pkg.attendance.rate != null ? `${pkg.attendance.rate}%` : "—"} />
              <StatTile icon={Target} label="Goal progress" value={pkg.goals.avgProgress != null ? `${pkg.goals.avgProgress}%` : "—"} />
              <StatTile icon={Wrench} label="Skills" value={String(pkg.skills.total)} />
            </div>

            {analysis && (
              <>
                <div className="rounded-xl border bg-card/60 p-4">
                  <p className="text-sm leading-relaxed text-card-foreground">{analysis.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {Math.round(analysis.confidence * 100)}% confidence
                    </Badge>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs",
                        analysis.performance_trend.direction === "up" && "text-success",
                        analysis.performance_trend.direction === "down" && "text-destructive",
                        analysis.performance_trend.direction === "flat" && "text-muted-foreground"
                      )}
                    >
                      Trend: {analysis.performance_trend.direction}
                      <ArrowUpRight
                        className={cn(
                          "h-3.5 w-3.5",
                          analysis.performance_trend.direction === "down" && "rotate-90"
                        )}
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ListBlock icon={ThumbsUp} title="Strengths" items={analysis.strengths} />
                  <ListBlock icon={AlertTriangle} title="Development areas" items={analysis.development_areas} />
                  <ListBlock icon={Wrench} title="Skill gaps" items={analysis.skill_gaps} />
                  <ListBlock icon={Activity} title="Engagement signals" items={analysis.engagement_signals} />
                </div>

                {analysis.performance_trend.description && (
                  <div className="flex items-start gap-2.5 rounded-xl border bg-muted/40 px-4 py-3">
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <span className="font-medium text-card-foreground">Performance trend: </span>
                      {analysis.performance_trend.description}
                    </p>
                  </div>
                )}

                {analysis.risk_signals.length > 0 && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-warning">
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      Risk signals
                    </p>
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {analysis.risk_signals.map((signal) => (
                        <li
                          key={signal}
                          className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs text-warning"
                        >
                          {signal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.recommended_actions.length > 0 && (
                  <RecommendedActions actions={analysis.recommended_actions} />
                )}
              </>
            )}

            {analysis && analysis.insights.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Structured insights
                </h4>
                {analysis.insights.map((insight, index) => (
                  <InsightCard key={`${insight.title}-${index}`} insight={insight} index={index} />
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