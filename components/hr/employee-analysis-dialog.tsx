"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

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
            AI Employee Briefing
          </DialogTitle>
          <DialogDescription>
            Signals gathered live from Supabase for {employeeName}. The Gemini
            narrative step comes next.
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

            {pkg.insights.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Signals
                </h4>
                {pkg.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-lg border bg-card/60 p-3.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${severityDot[insight.severity ?? "info"]}`}
                        aria-hidden="true"
                      />
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <Badge variant="outline" className="ml-auto shrink-0">
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {insight.summary}
                    </p>
                    {insight.evidence && insight.evidence.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {insight.evidence.slice(0, 3).map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-1.5 text-xs text-muted-foreground"
                          >
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-xs font-medium text-primary">
                      {insight.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                No notable signals — this profile looks steady.
              </div>
            )}

            <details className="rounded-lg border bg-muted/30 p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                View Gemini handoff prompt
              </summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-card-foreground">
                  {result?.prompt}
                </pre>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}