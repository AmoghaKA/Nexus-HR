"use client";

import { Loader2, Sparkles, Star } from "lucide-react";

import type { AnalyzePerformanceActionResult } from "@/lib/ai/actions";
import { analyzePerformance } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import {
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  RecommendedActions,
  TrendIcon,
  BulletList,
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

      {isPending && <LoadingRow label="Summarizing review cycles and goal data…" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.report && (
        <ReportView report={result.report} saved={result.saved} persistError={result.persistError} />
      )}
    </div>
  );
}

function ReportView({
  report,
  saved,
  persistError,
}: {
  report: NonNullable<AnalyzePerformanceActionResult["report"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">
          <Star className="mr-1 h-3.5 w-3.5 text-warning" aria-hidden="true" />
          Overall rating: <span className="ml-1 font-semibold">{report.overall_rating}/5</span>
        </Badge>
        <ConfidenceBadge confidence={report.confidence} />
        <PersistenceBadges saved={saved} persistError={persistError} />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{report.headline}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {report.by_department.map((d) => (
          <Card key={d.department} className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{d.department}</span>
              <TrendIcon direction={d.trend} />
              <span className="ml-auto text-sm font-medium">{d.rating}/5</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{d.note}</p>
          </Card>
        ))}
        {report.by_department.length === 0 && (
          <p className="text-sm text-muted-foreground">No department-level review data yet.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-success">Strengths</p>
          <BulletList items={report.strengths} tone="muted" />
        </Card>
        <Card className="p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-destructive">Concerns</p>
          <BulletList items={report.concerns} tone="muted" />
        </Card>
      </div>

      <RecommendedActions actions={report.recommended_actions} />
      <AiDisclaimer />
    </div>
  );
}