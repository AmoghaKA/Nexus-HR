"use client";

import * as React from "react";
import { useState } from "react";
import { MapPin, Plus, Pencil, UsersRound, ClipboardList, Briefcase } from "lucide-react";

import type { RecruitableDepartment, RecruitmentCandidate, RecruitmentJob } from "@/lib/hr/recruitment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { JobFormDialog } from "@/components/hr/recruitment/job-form-dialog";
import { InterviewSetupDialog } from "@/components/hr/recruitment/interview-questions-dialog";

interface JobsViewProps {
  jobs: RecruitmentJob[];
  candidates: RecruitmentCandidate[];
  departments: RecruitableDepartment[];
  onChanged: () => void;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "danger"> = {
  draft: "secondary",
  published: "success",
  closed: "outline",
  filled: "default",
};

function parseSkills(value: string | null): string[] {
  return (value ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function JobsView({ jobs, candidates, departments, onChanged }: JobsViewProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<RecruitmentJob | null>(null);
  const [questionsFor, setQuestionsFor] = useState<RecruitmentJob | null>(null);

  const candidatesByJob = new Map<string, number>();
  for (const c of candidates) {
    if (c.job_id) candidatesByJob.set(c.job_id, (candidatesByJob.get(c.job_id) ?? 0) + 1);
  }

  function openCreate() {
    setEditingJob(null);
    setFormOpen(true);
  }

  function openEdit(job: RecruitmentJob) {
    setEditingJob(job);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Create your first role with its requirements — the AI matching engine will score candidates against these."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => {
            const required = parseSkills(job.required_skills);
            const preferred = parseSkills(job.preferred_skills);
            return (
              <Card key={job.id} className="flex flex-col justify-between p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug">{job.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[job.department, job.seniority, job.employment_type?.replace("_", " ")].filter(Boolean).join(" · ") || "Uncategorised"}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[job.status] ?? "secondary"} className="capitalize">
                      {job.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {job.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <UsersRound className="h-3 w-3" aria-hidden="true" />
                      {candidatesByJob.get(job.id) ?? job.candidate_count} candidate
                      {(candidatesByJob.get(job.id) ?? job.candidate_count) === 1 ? "" : "s"}
                    </span>
                  </div>

                  {job.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                  )}

                  {required.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Required</p>
                      <div className="flex flex-wrap gap-1.5">
                        {required.map((s) => (
                          <Badge key={s} variant="default">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {preferred.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {preferred.map((s) => (
                        <Badge key={s} variant="outline">{s}☆</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => openEdit(job)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setQuestionsFor(job)}>
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                    Questions
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {formOpen && (
        <JobFormDialog
          open
          onOpenChange={setFormOpen}
          departments={departments}
          job={editingJob}
          onSaved={onChanged}
        />
      )}

      {questionsFor && (
        <InterviewSetupDialog
          open={Boolean(questionsFor)}
          onOpenChange={(open) => setQuestionsFor(open ? questionsFor : null)}
          job={questionsFor}
          onSaved={onChanged}
        />
      )}
    </div>
  );
}