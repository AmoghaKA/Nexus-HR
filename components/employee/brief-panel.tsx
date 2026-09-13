"use client";

import { Loader2, Sparkles } from "lucide-react";

import type { GenerateEmployeeBriefActionResult } from "@/lib/ai/actions";
import { generateEmployeeBrief } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="ai-gradient-border space-y-4 rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">
          <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Your AI Workforce Brief
        </Badge>
        <ConfidenceBadge confidence={brief.confidence} />
        <PersistenceBadges saved={saved} persistError={persistError} noun="insight saved" />
      </div>

      <div>
        <h3 className="text-lg font-semibold tracking-tight">{brief.headline}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{brief.summary}</p>
      </div>

      {brief.focus_areas.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {brief.focus_areas.map((area) => (
            <Card key={area.area + area.why} className="p-4">
              <CardHeader className="px-0 pb-2">
                <CardTitle className="text-sm font-semibold">{area.area}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-0 py-0">
                <p className="text-xs leading-relaxed text-muted-foreground">{area.why}</p>
                <p className="text-xs font-medium text-card-foreground">→ {area.action}</p>
              </CardContent>
            </Card>
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
    </div>
  );
}