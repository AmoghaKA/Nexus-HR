"use client";

import * as React from "react";
import { useTransition, useState } from "react";
import { GitCompareArrows, KanbanSquare, Briefcase, UsersRound, Loader2 } from "lucide-react";

import type { RecruitmentData } from "@/lib/hr/recruitment";
import { reloadRecruitmentData } from "@/lib/recruitment/actions";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/components/hr/recruitment/pipeline-board";
import { JobsView } from "@/components/hr/recruitment/jobs-view";
import { CandidatesView } from "@/components/hr/recruitment/candidates-view";
import { CompareView } from "@/components/hr/recruitment/compare-view";
import { ErrorBanner } from "@/components/hr/ai-shared";

type TabId = "pipeline" | "jobs" | "candidates" | "compare";

const TABS: { id: TabId; label: string; icon: typeof KanbanSquare; description: string }[] = [
  { id: "pipeline", label: "Pipeline", icon: KanbanSquare, description: "Move candidates through Applied → Screening → Interview → Evaluation → Shortlisted → Hired." },
  { id: "jobs", label: "Jobs", icon: Briefcase, description: "Open roles, requirement definitions, and role-specific interview question sets." },
  { id: "candidates", label: "Candidates", icon: UsersRound, description: "Upload and analyze resumes, then score each candidate against their role." },
  { id: "compare", label: "Compare", icon: GitCompareArrows, description: "Select candidates and view a side-by-side evidence-based comparison." },
];

export function RecruitmentWorkspace({ initialData }: { initialData: RecruitmentData }) {
  const [data, setData] = useState<RecruitmentData>(initialData);
  const [tab, setTab] = useState<TabId>("pipeline");
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      setRefreshError(null);
      const res = await reloadRecruitmentData();
      if (res.ok && res.data) setData(res.data);
      else setRefreshError(res.error ?? "Failed to refresh.");
    });
  }

  function toggleSelected(id: string) {
    setCompareSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "secondary" : "ghost"}
            onClick={() => setTab(t.id)}
          >
            <t.icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={refresh} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{TABS.find((t) => t.id === tab)?.description}</p>

      {refreshError && <ErrorBanner error={refreshError} />}

      {tab === "pipeline" && <PipelineBoard candidates={data.candidates} jobs={data.jobs} onChanged={refresh} />}
      {tab === "jobs" && (
        <JobsView jobs={data.jobs} candidates={data.candidates} departments={data.departments} onChanged={refresh} />
      )}
      {tab === "candidates" && (
        <CandidatesView
          candidates={data.candidates}
          jobs={data.jobs}
          selectedIds={compareSelection}
          onToggleSelected={toggleSelected}
          onChanged={refresh}
        />
      )}
      {tab === "compare" && (
        <CompareView
          candidates={data.candidates}
          selectedIds={compareSelection}
          onToggleSelected={toggleSelected}
        />
      )}
    </div>
  );
}