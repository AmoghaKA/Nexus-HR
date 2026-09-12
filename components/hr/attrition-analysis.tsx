"use client";

import { Loader2, Sparkles, TrendingUp } from "lucide-react";

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
  LoadingRow,
  RecommendedActions,
  ScoreBar,
  PersistenceBadges,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

// ---------------------------------------------------------------------------
// Attrition page main client shell
// ---------------------------------------------------------------------------

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

      {isPending && <LoadingRow label="Computing attrition risk signals and cohorts…" />}

      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.report && (
        <ReportView report={result.report} saved={result.saved} persistError={result.persistError} />
      )}
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

function ReportView({
  report,
  saved,
  persistError,
}: {
  report: NonNullable<CalculateAttritionActionResult["report"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="text-[11px]">
          <TrendingUp className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Overall risk: <span className="ml-1 font-semibold capitalize">{report.overall_risk_level}</span>
        </Badge>
        <ConfidenceBadge confidence={report.confidence} />
        <PersistenceBadges saved={saved} persistError={persistError} />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{report.headline}</p>

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
                <span>Avg estimated risk</span>
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

      <RecommendedActions actions={report.recommended_actions} />
      <AiDisclaimer />
    </div>
  );
}