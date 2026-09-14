"use client";

import { Clock, GraduationCap, Loader2, Sparkles } from "lucide-react";

import type { LearningPlanActionResult } from "@/lib/ai/actions";
import { recommendLearning } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import {
  AiAnswerFrame,
  AiResultCard,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  PersistenceBadges,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

const PRIORITY_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary" | "outline"> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

export function LearningPlanPanel() {
  const { isPending, result, run } = useAiRun<LearningPlanActionResult>();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(recommendLearning)}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
          {isPending ? "Picking courses…" : "Get my AI learning plan"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Picked for your goals and skill gaps — each with the reason why.
        </p>
      </div>

      {isPending && <LoadingRow label="Matching courses to your gaps and goals…" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.plan && (
        <ReportView plan={result.plan} saved={result.saved} persistError={result.persistError} />
      )}
    </div>
  );
}

function ReportView({
  plan,
  saved,
  persistError,
}: {
  plan: NonNullable<LearningPlanActionResult["plan"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <AiAnswerFrame
      title="AI Learning Plan"
      icon={<Sparkles className="h-3 w-3" aria-hidden="true" />}
      badges={
        <>
          <ConfidenceBadge confidence={plan.confidence} />
          <PersistenceBadges saved={saved} persistError={persistError} noun="insight saved" />
        </>
      }
      headline={plan.headline}
    >
      <div className="space-y-3">
        {plan.recommendations.map((rec, i) => (
          <AiResultCard
            key={rec.course_title}
            index={i}
            icon={
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </span>
            }
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{rec.course_title}</p>
                <Badge variant={PRIORITY_VARIANT[rec.priority]}>priority: {rec.priority}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{rec.provider || "Internal"}</span>
                {rec.duration_hours > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {Math.round(rec.duration_hours)}h
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{rec.reason}</p>
              {rec.supports_goals.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {rec.supports_goals.map((support) => (
                    <span
                      key={support}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {support}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </AiResultCard>
        ))}
      </div>

      {plan.recommendations.length === 0 && (
        <p className="text-sm text-muted-foreground">No recommendations generated yet.</p>
      )}

      <AiDisclaimer />
    </AiAnswerFrame>
  );
}