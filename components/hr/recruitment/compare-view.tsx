"use client";

import * as React from "react";
import { useState } from "react";
import { CheckSquare, GitCompareArrows, Loader2, ShieldCheck, Sparkles, Trophy } from "lucide-react";

import type { RecruitmentCandidate } from "@/lib/hr/recruitment";
import { compareCandidates, type CompareCandidatesActionResult } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAiRun } from "@/components/hr/ai-run";
import { AiDisclaimer, ConfidenceBadge, ErrorBanner, LoadingRow } from "@/components/hr/ai-shared";
import { MatchBadge, RecommendationBadge, STAGE_META } from "@/components/hr/recruitment/recruitment-ui";

interface CompareViewProps {
  candidates: RecruitmentCandidate[];
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
}

function Nullable({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <span className="font-semibold">{value}</span>;
}

export function CompareView({ candidates, selectedIds, onToggleSelected }: CompareViewProps) {
  const { isPending, result, run } = useAiRun<CompareCandidatesActionResult>();
  const [error, setError] = useState<string | null>(null);

  const selected = candidates.filter((c) => selectedIds.has(c.id));
  const rows = result?.ok ? result.rows : null;
  const comparison = result?.ok ? result.comparison : null;

  function compare() {
    setError(null);
    if (selected.length < 2) {
      setError("Select at least two candidates to compare.");
      return;
    }
    run(() => compareCandidates(selected.map((c) => c.id)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Compare <span className="font-semibold text-card-foreground">{selected.length}</span>{" "}
          candidate{selected.length === 1 ? "" : "s"} head-to-head on the same role.
        </p>
        <div className="ml-auto flex items-center gap-2">
          {selected.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => selected.forEach((c) => onToggleSelected(c.id))}>
              Clear
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={compare} disabled={isPending || selected.length < 2}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
            Compare{selected.length >= 2 ? ` ${selected.length}` : ""}
          </Button>
        </div>
      </div>

      {error && <ErrorBanner error={error} />}
      {isPending && <LoadingRow label="Building the evidence-based comparison…" />}

      {selected.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Selected for comparison</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selected.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent/40">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked
                  onChange={() => onToggleSelected(c.id)}
                  aria-label={`Remove ${c.full_name} from comparison`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.job_title ?? "No role assigned"} · {STAGE_META[c.status]?.label ?? c.status}
                  </span>
                </span>
                <MatchBadge score={c.assessment?.overall_match ?? null} />
              </label>
            ))}
          </div>
        </Card>
      )}

      {selected.length === 0 && !isPending && !rows && (
        <EmptyState
          icon={CheckSquare}
          title="Nothing selected to compare"
          description="Head to the Candidates tab and tick the boxes next to the candidates you want to compare, then come back here."
        />
      )}

      {comparison && rows && (
        <div className="space-y-4">
          <Card className="ai-gradient-border space-y-3 p-4">
            <p className="text-sm font-semibold leading-relaxed">{comparison.headline}</p>
            {comparison.recommended_candidate && (
              <div className="flex items-start gap-2 rounded-lg border border-success/25 bg-success/5 p-3">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <p className="text-sm">
                  <span className="font-medium">Best overall recommendation: {comparison.recommended_candidate}</span>
                </p>
              </div>
            )}
            {comparison.candidate_notes.length > 0 && (
              <ul className="space-y-1.5">
                {comparison.candidate_notes.map((n) => (
                  <li key={n.candidate_name} className="flex items-start gap-2 text-sm text-card-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>
                      <span className="font-medium">{n.candidate_name}:</span> {n.note}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <ConfidenceBadge confidence={comparison.confidence} />
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Evidence-based; no protected characteristics considered
              </Badge>
            </div>
          </Card>

          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Candidate</th>
                  <th className="px-3 py-2">Overall</th>
                  <th className="px-3 py-2">Skills</th>
                  <th className="px-3 py-2">Experience</th>
                  <th className="px-3 py-2">Role relevance</th>
                  <th className="px-3 py-2">Education</th>
                  <th className="px-3 py-2">Exp yrs</th>
                  <th className="px-3 py-2">Strengths</th>
                  <th className="px-3 py-2">Gaps</th>
                  <th className="px-3 py-2">Interview focus</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.candidate_id} className="border-b align-top last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.job_title || "No role assigned"}</p>
                      <div className="mt-1">
                        <RecommendationBadge recommendation={r.recommendation} />
                      </div>
                    </td>
                    <td className="px-3 py-2"><MatchBadge score={r.overall_match} /></td>
                    <td className="px-3 py-2"><Nullable value={r.skill_match} /></td>
                    <td className="px-3 py-2"><Nullable value={r.experience_match} /></td>
                    <td className="px-3 py-2"><Nullable value={r.role_relevance} /></td>
                    <td className="px-3 py-2"><Nullable value={r.education_match} /></td>
                    <td className="px-3 py-2 text-muted-foreground">{r.experience_years ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.strengths.slice(0, 3).join("; ") || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.gaps.slice(0, 3).join("; ") || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.interview_focus.slice(0, 3).join("; ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AiDisclaimer />
        </div>
      )}

      {!isPending && !rows && selected.length >= 2 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Hit <span className="font-medium text-card-foreground">Compare</span> to generate an evidence-backed read of these candidates.
        </p>
      )}
    </div>
  );
}