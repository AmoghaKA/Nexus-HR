"use client";

import { Loader2, MessageSquareReply, Sparkles } from "lucide-react";

import type { PerformanceCoachActionResult } from "@/lib/ai/actions";
import { explainPerformance } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import {
  BulletList,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  PersistenceBadges,
  RecommendedActions,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

export function PerformanceCoachPanel() {
  const { isPending, result, run } = useAiRun<PerformanceCoachActionResult>();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(explainPerformance)}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareReply className="h-4 w-4" />}
          {isPending ? "Coaching…" : "What should I improve?"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Your personal coach, grounded in your review history and feedback.
        </p>
      </div>

      {isPending && <LoadingRow label="Reading your reviews and feedback…" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.coach && (
        <ReportView coach={result.coach} saved={result.saved} persistError={result.persistError} />
      )}
    </div>
  );
}

function ReportView({
  coach,
  saved,
  persistError,
}: {
  coach: NonNullable<PerformanceCoachActionResult["coach"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <div className="ai-gradient-border space-y-4 rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">
          <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          AI Performance Coach
        </Badge>
        <ConfidenceBadge confidence={coach.confidence} />
        <PersistenceBadges saved={saved} persistError={persistError} noun="insight saved" />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{coach.headline}</p>

      {coach.improvement_focus.length > 0 && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            What I should improve
          </p>
          <BulletList items={coach.improvement_focus} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            My strengths
          </p>
          <BulletList items={coach.strengths} tone="muted" empty="No strengths identified yet." />
        </div>
      </div>

      <RecommendedActions actions={coach.recommended_actions} />
      <AiDisclaimer />
    </div>
  );
}