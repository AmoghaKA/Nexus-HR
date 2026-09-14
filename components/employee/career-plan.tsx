"use client";

import { Compass, Loader2, Sparkles } from "lucide-react";

import type { GenerateCareerRecommendationsActionResult } from "@/lib/ai/actions";
import { generateCareerRecommendations } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import {
  AiAnswerFrame,
  AiResultCard,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  RecommendedActions,
  BulletList,
  PersistenceBadges,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

const readinessVariant = {
  ready: "success",
  developing: "warning",
  not_ready: "secondary",
} as const;

export function CareerPlan({ skills }: { skills?: string[] }) {
  const { isPending, result, run } = useAiRun<GenerateCareerRecommendationsActionResult>();
  return (
    <div className="space-y-4">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run(generateCareerRecommendations)}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
        {isPending ? "Running…" : "Generate my career plan"}
      </Button>

      {isPending && <LoadingRow label="Analyzing your skills, goals, and performance…" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.recommendations && (
        <ReportView
          recommendations={result.recommendations}
          currentSkills={skills ?? []}
          showGaps={Boolean(skills)}
          saved={result.saved}
          persistError={result.persistError}
        />
      )}
    </div>
  );
}

function ReportView({
  recommendations,
  currentSkills,
  showGaps,
  saved,
  persistError,
}: {
  recommendations: NonNullable<GenerateCareerRecommendationsActionResult["recommendations"]>;
  currentSkills: string[];
  showGaps: boolean;
  saved?: number;
  persistError?: string;
}) {
  const hasSkill = (skill: string) =>
    currentSkills.some((s) => s.toLowerCase() === skill.toLowerCase());
  return (
    <AiAnswerFrame
      title="AI Career Coach"
      icon={<Sparkles className="h-3 w-3" aria-hidden="true" />}
      badges={
        <>
          <ConfidenceBadge confidence={recommendations.confidence} />
          <PersistenceBadges saved={saved} persistError={persistError} noun="insight saved" />
        </>
      }
      headline={recommendations.headline}
    >
      <div className="space-y-3">
        {recommendations.career_paths.map((path, i) => (
          <AiResultCard
            key={path.path}
            index={i}
            icon={
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
            }
          >
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{path.path}</span>
                <Badge variant={readinessVariant[path.readiness]}>{path.readiness.replace("_", " ")}</Badge>
                <Badge variant="outline" className="bg-card">{path.timeline_months} months</Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{path.rationale}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Steps</p>
                  <BulletList items={path.steps} tone="muted" />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Skills to build
                    {showGaps && (
                      <span className="ml-1 text-[10px] font-medium normal-case text-muted-foreground/70">
                        (gaps from your profile)
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {path.required_skills.map((skill) => {
                      const missing = showGaps && !hasSkill(skill);
                      return (
                        <span
                          key={skill}
                          className={
                            missing
                              ? "inline-flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning"
                              : "rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          }
                        >
                          {missing && <span aria-hidden="true">!</span>}
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </AiResultCard>
        ))}

        {recommendations.career_paths.length === 0 && (
          <p className="text-sm text-muted-foreground">No career paths generated yet.</p>
        )}
      </div>

      <RecommendedActions actions={recommendations.immediate_actions} />
      <AiDisclaimer />
    </AiAnswerFrame>
  );
}