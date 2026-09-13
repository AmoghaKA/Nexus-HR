"use client";

import * as React from "react";
import { useState } from "react";
import { CheckSquare, Eye, FileUp, Loader2, Plus, ScanText, Sparkles, UserRoundPlus } from "lucide-react";

import type { RecruitmentCandidate, RecruitmentJob } from "@/lib/hr/recruitment";
import { analyzeResume, matchCandidate } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBanner, LoadingRow } from "@/components/hr/ai-shared";
import { AddCandidateDialog } from "@/components/hr/recruitment/add-candidate-dialog";
import { UploadResumeDialog } from "@/components/hr/recruitment/upload-resume-dialog";
import { CandidateDetail } from "@/components/hr/recruitment/candidate-detail";
import { MatchBadge, STAGE_META } from "@/components/hr/recruitment/recruitment-ui";

interface CandidatesViewProps {
  candidates: RecruitmentCandidate[];
  jobs: RecruitmentJob[];
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onChanged: () => void;
}

type AiAction = { candidateId: string; kind: "analyze" | "match" } | null;

export function CandidatesView({ candidates, jobs, selectedIds, onToggleSelected, onChanged }: CandidatesViewProps) {
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState<RecruitmentCandidate | null>(null);
  const [detailFor, setDetailFor] = useState<RecruitmentCandidate | null>(null);
  const [aiAction, setAiAction] = useState<AiAction>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const filtered = jobFilter === "all" ? candidates : candidates.filter((c) => c.job_id === jobFilter);
  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

  function toggleAll() {
    if (allSelected) {
      filtered.forEach((c) => {
        if (selectedIds.has(c.id)) onToggleSelected(c.id);
      });
    } else {
      filtered.forEach((c) => {
        if (!selectedIds.has(c.id)) onToggleSelected(c.id);
      });
    }
  }

  async function runAi(candidate: RecruitmentCandidate, kind: "analyze" | "match") {
    setAiAction({ candidateId: candidate.id, kind });
    setAiError(null);
    const res = kind === "analyze" ? await analyzeResume(candidate.id) : await matchCandidate(candidate.id);
    setAiAction(null);
    if (!res.ok) setAiError(res.error ?? `Failed to ${kind === "analyze" ? "analyze" : "match"} ${candidate.full_name}.`);
    else onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="h-8 w-56 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="none">No role assigned</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedIds.size > 0 && (
          <Badge variant="secondary" className="gap-1">
            <CheckSquare className="h-3 w-3" aria-hidden="true" />
            {selectedIds.size} selected — open the Compare tab
          </Badge>
        )}

        <Button size="sm" className="ml-auto" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add candidate
        </Button>
      </div>

      {aiError && <ErrorBanner error={aiError} />}
      {aiAction && (
        <LoadingRow label={aiAction.kind === "analyze" ? "Analyzing resume…" : "Scoring candidate match…"} />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={UserRoundPlus}
          title="No candidates here"
          description="Add a candidate, upload their resume, then let the AI extract their profile and score their fit."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Exp.</th>
                <th className="px-3 py-2">Resume</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => onToggleSelected(c.id)}
                      aria-label={`Compare ${c.full_name}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" className="text-left" onClick={() => setDetailFor(c)}>
                      <p className="font-medium hover:underline">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(c.current_title ?? c.job_title ?? "New candidate")} {c.job_title ? `· ${c.job_title}` : ""}
                      </p>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="capitalize">{STAGE_META[c.status]?.label ?? c.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.experience_years != null ? `${c.experience_years} yrs` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {c.has_resume ? (
                      <button
                        title="View resume file"
                        className="text-muted-foreground hover:text-card-foreground"
                        onClick={() => setUploadFor(c)}
                      >
                        <ScanText className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        title="Upload resume"
                        onClick={() => setUploadFor(c)}
                      >
                        <FileUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <MatchBadge score={c.assessment?.overall_match ?? null} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Analyze resume"
                        disabled={!c.has_resume || Boolean(aiAction)}
                        onClick={() => runAi(c, "analyze")}
                      >
                        {aiAction?.candidateId === c.id && aiAction.kind === "analyze" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Score match"
                        disabled={!c.has_resume || Boolean(aiAction)}
                        onClick={() => runAi(c, "match")}
                      >
                        {aiAction?.candidateId === c.id && aiAction.kind === "match" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setDetailFor(c)}>
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <AddCandidateDialog open onOpenChange={setAddOpen} jobs={jobs} onCreated={onChanged} />
      )}

      {uploadFor && (
        <UploadResumeDialog
          candidate={uploadFor}
          open={Boolean(uploadFor)}
          onOpenChange={(open) => setUploadFor(open ? uploadFor : null)}
          onUploaded={onChanged}
        />
      )}

      {detailFor && (
        <CandidateDetail
          candidate={detailFor}
          open={Boolean(detailFor)}
          onOpenChange={(open) => setDetailFor(open ? detailFor : null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}