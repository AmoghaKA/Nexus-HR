"use client";

import { Compass, Loader2, Sparkles } from "lucide-react";

import type { SkillPlanActionResult } from "@/lib/ai/actions";
import { recommendSkillPlan } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/progress-bar";
import { useAiRun } from "@/components/hr/ai-run";
import {
  AiAnswerFrame,
  AiResultCard,
  BulletList,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  PersistenceBadges,
  RecommendedActions,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

const GAP_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  none: "success",
  small: "success",
  medium: "warning",
  large: "danger",
};

const PRIORITY_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary" | "outline"> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

export function SkillPlanPanel() {
  const { isPending, result, run } = useAiRun<SkillPlanActionResult>();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(recommendSkillPlan)}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
          {isPending ? "Building your skill plan…" : "Generate my skill plan"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Recommended next skills, courses, projects, and the career paths they unlock.
        </p>
      </div>

      {isPending && <LoadingRow label="Analyzing your skills, role, and career direction…" />}
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
  plan: NonNullable<SkillPlanActionResult["plan"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <AiAnswerFrame
      title="AI Skill Plan"
      icon={<Sparkles className="h-3 w-3" aria-hidden="true" />}
      badges={
        <>
          <Badge variant="secondary">{Math.round(plan.overall_coverage_pct)}% coverage</Badge>
          <ConfidenceBadge confidence={plan.confidence} />
          <PersistenceBadges saved={saved} persistError={persistError} noun="insight saved" />
        </>
      }
      headline={plan.headline}
    >
      {plan.recommendations.map((rec, i) => (
        <AiResultCard
          key={rec.skill}
          index={i}
          icon={
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{rec.skill}</span>
              <Badge variant={GAP_VARIANT[rec.gap]}>{rec.gap} gap</Badge>
              <Badge variant={PRIORITY_VARIANT[rec.priority]}>priority: {rec.priority}</Badge>
              {rec.career_paths.length > 0 && (
                <Badge variant="outline" className="bg-card text-muted-foreground">
                  {rec.career_paths[0]}
                  {rec.career_paths.length > 1 ? ` +${rec.career_paths.length - 1}` : ""}
                </Badge>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Proficiency
                </p>
                <ProgressBar
                  value={(rec.current_proficiency / 5) * 100}
                  size="sm"
                  tone="primary"
                  label={`${rec.current_proficiency} → ${rec.target_proficiency} / 5`}
                />
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">{rec.rationale}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Courses
                </p>
                <BulletList items={rec.courses} tone="muted" empty="No specific course yet." />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Projects to build
                </p>
                <BulletList items={rec.projects} tone="muted" empty="None listed." />
              </div>
            </div>
          </div>
        </AiResultCard>
      ))}

      {plan.recommendations.length === 0 && (
        <p className="text-sm text-muted-foreground">No skill recommendations generated yet.</p>
      )}

      <RecommendedActions actions={plan.recommendations.map((r) => `${r.skill}: ${r.projects[0] ?? r.courses[0] ?? "start practicing this month"}`)} />
      <AiDisclaimer />
    </AiAnswerFrame>
  );
}