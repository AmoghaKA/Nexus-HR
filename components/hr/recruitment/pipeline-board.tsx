"use client";

import * as React from "react";
import { useState } from "react";
import { ArrowRight, FileText, UserRoundX } from "lucide-react";

import type { RecruitmentCandidate } from "@/lib/hr/recruitment";
import { PIPELINE_STAGES, TERMINAL_STATES } from "@/lib/hr/recruitment";
import { updateCandidateStatus } from "@/lib/recruitment/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBanner } from "@/components/hr/ai-shared";
import { MatchBadge, STAGE_META } from "@/components/hr/recruitment/recruitment-ui";

interface PipelineBoardProps {
  candidates: RecruitmentCandidate[];
  jobs: { id: string; title: string }[];
  onChanged: () => void;
}

export function PipelineBoard({ candidates, onChanged }: PipelineBoardProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = candidates.filter((c) => (PIPELINE_STAGES as readonly string[]).includes(c.status));
  const terminal = candidates.filter((c) => (TERMINAL_STATES as readonly string[]).includes(c.status));

  async function move(candidate: RecruitmentCandidate, status: string) {
    setPendingId(candidate.id);
    setError(null);
    const res = await updateCandidateStatus(candidate.id, status);
    setPendingId(null);
    if (!res.ok) setError(res.error ?? "Failed to move candidate.");
    else onChanged();
  }

  const nextStage = (status: string): string | null => {
    const idx = (PIPELINE_STAGES as readonly string[]).indexOf(status);
    return idx >= 0 && idx < PIPELINE_STAGES.length - 1 ? (PIPELINE_STAGES[idx + 1] as string) : null;
  };

  const allStages = [...PIPELINE_STAGES, ...TERMINAL_STATES] as string[];

  return (
    <div className="space-y-4">
      {error && <ErrorBanner error={error} />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PIPELINE_STAGES.map((stage) => {
          const inStage = active
            .filter((c) => c.status === stage)
            .sort(
              (a, b) => (b.assessment?.overall_match ?? 0) - (a.assessment?.overall_match ?? 0)
            );
          return (
            <div key={stage} className="flex flex-col rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {STAGE_META[stage]?.label ?? stage}
                </p>
                <Badge variant="secondary">{inStage.length}</Badge>
              </div>
              <div className="flex-1 space-y-2 p-2">
                {inStage.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">Empty</p>
                )}
                {inStage.map((c) => {
                  const next = nextStage(c.status);
                  const isBusy = pendingId === c.id;
                  return (
                    <div key={c.id} className="rounded-md border bg-background p-2.5 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.full_name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {c.job_title ?? "No role assigned"}
                          </p>
                        </div>
                        <MatchBadge score={c.assessment?.overall_match ?? null} />
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {c.experience_years != null && <span>{c.experience_years} yrs</span>}
                        {c.has_resume && (
                          <span className="flex items-center gap-0.5">
                            <FileText className="h-3 w-3" aria-hidden="true" /> resume
                          </span>
                        )}
                        {c.skills.slice(0, 2).map((s) => (
                          <span key={s} className="rounded bg-muted px-1 py-px">{s}</span>
                        ))}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <Select
                          value={c.status}
                          onValueChange={(value) => move(c, value)}
                          disabled={isBusy}
                        >
                          <SelectTrigger className="h-7 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allStages.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STAGE_META[s]?.label ?? s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {next && (
                          <Button
                            size="icon-sm"
                            variant="outline"
                            title={`Move to ${STAGE_META[next]?.label}`}
                            disabled={isBusy}
                            onClick={() => move(c, next)}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {terminal.length > 0 && (
        <details className="rounded-lg border bg-muted/20 px-4 py-2">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
            <UserRoundX className="h-3.5 w-3.5" aria-hidden="true" />
            Out of pipeline ({terminal.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {terminal.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-card-foreground">{c.full_name}</span>
                <Badge variant="outline">{STAGE_META[c.status]?.label ?? c.status}</Badge>
              </li>
            ))}
          </ul>
        </details>
      )}

      {active.length === 0 && (
        <EmptyState
          title="No candidates in the pipeline yet"
          description="Add a candidate from the Candidates tab, or from a job card, to begin moving them through the stages."
        />
      )}
    </div>
  );
}