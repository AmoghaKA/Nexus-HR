"use client";

import { Sparkles, Loader2, CheckCircle2, Clock, AlertTriangle, Ban } from "lucide-react";

import type { EvaluateMyOnboardingProgressActionResult } from "@/lib/ai/actions";
import { evaluateMyOnboardingProgress } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/progress-bar";
import { useAiRun } from "@/components/hr/ai-run";
import {
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  RecommendedActions,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

type Status = "on_track" | "at_risk" | "behind" | "blocked";

const STATUS_CHIP: Record<Status, { variant: "success" | "warning" | "danger" | "secondary"; label: string }> = {
  on_track: { variant: "success", label: "On track" },
  at_risk: { variant: "warning", label: "At risk" },
  behind: { variant: "danger", label: "Behind" },
  blocked: { variant: "danger", label: "Blocked" },
};

export function AdaptiveOnboardingStatus() {
  const { isPending, result, run } = useAiRun<EvaluateMyOnboardingProgressActionResult>();

  return (
    <Card className="ai-gradient-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Adaptive onboarding check</h2>
          <p className="text-xs text-muted-foreground">
            How healthy is your ramp-up? See what’s done, overdue, or getting in the way.
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(evaluateMyOnboardingProgress)}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isPending ? "Checking…" : "Check my progress"}
        </Button>
      </div>

      {isPending && <LoadingRow label="Reviewing your onboarding tasks and due dates…" className="mt-3" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.insight && <InsightView insight={result.insight} />}
    </Card>
  );
}

function InsightView({ insight }: { insight: NonNullable<EvaluateMyOnboardingProgressActionResult["insight"]> }) {
  const chip = STATUS_CHIP[insight.status];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={chip.variant}>{chip.label}</Badge>
        <Badge variant="outline" className="bg-card">
          {insight.completed}/{insight.total_tasks} tasks done
        </Badge>
        <ConfidenceBadge confidence={insight.confidence} />
      </div>

      <div>
        <p className="text-sm font-medium">{insight.headline}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.summary}</p>
      </div>

      <ProgressBar value={insight.completed_pct} tone="auto" size="sm" showLabel label="Ramp-up" />

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {insight.completed} completed
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {insight.pending} pending
        </span>
        <span className="inline-flex items-center gap-1 text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> {insight.overdue} overdue
        </span>
        <span className="inline-flex items-center gap-1 text-destructive">
          <Ban className="h-3.5 w-3.5" aria-hidden="true" /> {insight.blocked} blocked
        </span>
      </div>

      {insight.issue && insight.status !== "on_track" && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-relaxed">
          <span className="font-semibold text-destructive">Why:</span> {insight.issue}
        </p>
      )}

      {insight.recommendation && (
        <p className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-xs leading-relaxed">
          <span className="font-semibold text-primary">Recommended next:</span> {insight.recommendation}
        </p>
      )}

      {insight.prescribed_actions.length > 0 && <RecommendedActions actions={insight.prescribed_actions} />}
      <AiDisclaimer />
    </div>
  );
}