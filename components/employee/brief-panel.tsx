"use client";

import { Loader2, Sparkles } from "lucide-react";

import type { GenerateEmployeeBriefActionResult } from "@/lib/ai/actions";
import { generateEmployeeBrief } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { CardContent, CardTitle } from "@/components/ui/card";
import { useAiRun } from "@/components/hr/ai-run";
import {
  AiAnswerFrame,
  BulletList,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  PersistenceBadges,
  RecommendedActions,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

export function BriefPanel() {
  const { isPending, result, run } = useAiRun<GenerateEmployeeBriefActionResult>();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(generateEmployeeBrief)}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isPending ? "Building your brief…" : "Refresh my AI brief"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Personalized from your goals, skills, performance, feedback, and training.
        </p>
      </div>

      {isPending && <LoadingRow label="Analyzing your profile across goals, skills, and feedback…" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.brief && (
        <ReportView
          brief={result.brief}
          saved={result.saved}
          persistError={result.persistError}
        />
      )}
    </div>
  );
}

function ReportView({
  brief,
  saved,
  persistError,
}: {
  brief: NonNullable<GenerateEmployeeBriefActionResult["brief"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <AiAnswerFrame
      title="Your AI Workforce Brief"
      icon={<Sparkles className="h-3 w-3" aria-hidden="true" />}
      badges={
        <>
          <ConfidenceBadge confidence={brief.confidence} />
          <PersistenceBadges saved={saved} persistError={persistError} noun="insight saved" />
        </>
      }
    >
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{brief.headline}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{brief.summary}</p>
      </div>

      {brief.focus_areas.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {brief.focus_areas.map((area, i) => (
            <div key={`${area.area}-${i}`} className="group overflow-hidden rounded-xl border bg-card/80 transition-shadow hover:shadow-md">
              <div
                className="h-1 w-full bg-gradient-to-r from-primary via-indigo-500 to-violet-500 opacity-70 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
              <CardContent className="space-y-2 p-4">
                <CardTitle className="text-sm font-semibold">{area.area}</CardTitle>
                <p className="text-xs leading-relaxed text-muted-foreground">{area.why}</p>
                <p className="flex items-start gap-1.5 text-xs font-medium text-card-foreground">
                  <span className="mt-0.5 text-primary" aria-hidden="true">→</span>
                  {area.action}
                </p>
              </CardContent>
            </div>
          ))}
        </div>
      )}

      {brief.insights.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Signals
          </p>
          <BulletList
            items={brief.insights.map((i) => `${i.title} — ${i.summary}`)}
            tone="muted"
            empty=""
          />
        </div>
      )}

      <RecommendedActions actions={brief.recommended_action ? [brief.recommended_action] : []} />
      <AiDisclaimer />
    </AiAnswerFrame>
  );
}