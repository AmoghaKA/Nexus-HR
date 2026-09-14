"use client";

import { GraduationCap, Loader2, Sparkles } from "lucide-react";

import type { GenerateSkillRecommendationsActionResult } from "@/lib/ai/actions";
import { generateSkillRecommendations } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import {
  AiAnswerFrame,
  AiResultCard,
  ConfidenceBadge,
  ErrorBanner,
  LevelDot,
  LoadingRow,
  ScoreBar,
  BulletList,
  PersistenceBadges,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

const priorityVariant = { high: "danger", medium: "warning", low: "success" } as const;
const priorityBarTone = { high: "destructive", medium: "warning", low: "success" } as const;

export function SkillsAnalysis() {
  const { isPending, result, run } = useAiRun<GenerateSkillRecommendationsActionResult>();
  return (
    <div className="space-y-4">
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(generateSkillRecommendations)}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {isPending ? "Running analysis…" : "Run skill gap analysis"}
      </Button>

      {isPending && <LoadingRow label="Measuring skill coverage and gaps…" />}
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
  report: NonNullable<GenerateSkillRecommendationsActionResult["report"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <AiAnswerFrame
      title="AI Skill Gap Analysis"
      icon={<Sparkles className="h-3 w-3" aria-hidden="true" />}
      badges={
        <>
          <Badge variant="outline">
            <GraduationCap className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Overall coverage: <span className="ml-1 font-semibold">{report.overall_coverage_pct}%</span>
          </Badge>
          <ConfidenceBadge confidence={report.confidence} />
          <PersistenceBadges saved={saved} persistError={persistError} />
        </>
      }
      headline={report.headline}
    >
      <div className="space-y-3">
        {report.recommendations.map((r, i) => (
          <AiResultCard
            key={r.skill}
            index={i}
            icon={
              <span className="flex h-10 w-10 shrink-0 items-center justify-center gap-1.5">
                <LevelDot level={r.priority} className="mt-0 h-2.5 w-2.5" />
              </span>
            }
          >
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{r.skill}</span>
                <Badge variant={priorityVariant[r.priority]}>
                  {r.priority} priority
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {r.current_coverage_pct}% coverage · gap {r.gap}%
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Coverage</span>
                  <span className="font-medium">{r.current_coverage_pct}%</span>
                </div>
                <ScoreBar value={r.current_coverage_pct} tone={priorityBarTone[r.priority]} />
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">{r.rationale}</p>

              {r.target_roles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.target_roles.map((role) => (
                    <span key={role} className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{role}</span>
                  ))}
                </div>
              )}

              <BulletList items={r.recommended_actions} tone="muted" />
            </div>
          </AiResultCard>
        ))}

        {report.recommendations.length === 0 && (
          <p className="text-sm text-muted-foreground">No skill recommendations yet.</p>
        )}
      </div>

      <AiDisclaimer />
    </AiAnswerFrame>
  );
}