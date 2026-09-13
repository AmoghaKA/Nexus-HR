"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Award, BarChart3, CalendarDays, ClipboardList, FileText, GraduationCap, Loader2, Mail, Phone, Plus, Sparkles, User } from "lucide-react";

import type { CandidateInterview, RecruitmentCandidate } from "@/lib/hr/recruitment";
import { updateCandidateStatus } from "@/lib/recruitment/actions";
import { analyzeResume, generateInterviewInsight, matchCandidate, type AnalyzeResumeActionResult, type GenerateInterviewInsightActionResult, type MatchCandidateActionResult } from "@/lib/ai/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAiRun } from "@/components/hr/ai-run";
import {
  AiDisclaimer,
  BulletList,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  ScoreBar,
} from "@/components/hr/ai-shared";
import { MatchBadge, RecommendationBadge, STAGE_META } from "@/components/hr/recruitment/recruitment-ui";
import { ScheduleInterviewDialog } from "@/components/hr/recruitment/schedule-interview-dialog";
import { RecordEvaluationDialog } from "@/components/hr/recruitment/record-evaluation-dialog";

interface CandidateDetailProps {
  candidate: RecruitmentCandidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

const PIPELINE_CHOICES = ["applied", "screening", "interview", "evaluation", "shortlisted", "hired", "rejected", "withdrawn"];

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value == null ? "—" : `${value}`}</span>
      </div>
      <ScoreBar value={value ?? 0} tone={value == null ? "primary" : value >= 80 ? "success" : value >= 55 ? "warning" : "destructive"} />
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

const INTERVIEW_STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "danger" }> = {
  scheduled: { label: "Scheduled", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "secondary" },
  no_show: { label: "No-show", variant: "danger" },
};

function InsightCard({ insight }: { insight: NonNullable<CandidateInterview["ai_insight"]> }) {
  const dims = [
    { key: "Technical competency", value: insight.technical_competency },
    { key: "Communication", value: insight.communication },
    { key: "Problem solving", value: insight.problem_solving },
    { key: "Role fit", value: insight.role_fit },
  ] as const;
  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-primary/40">
          <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
          AI-generated interview insight
        </Badge>
        <ConfidenceBadge confidence={insight.confidence} />
      </div>
      <p className="text-xs text-muted-foreground">
        Advisory only — AI never decides. HR reviews this summary and makes the final call.
      </p>
      <p className="text-sm font-medium text-card-foreground">{insight.headline}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall impression</span>
            <span className="font-semibold">{insight.overall_score}/100</span>
          </div>
          <ScoreBar
            value={insight.overall_score}
            tone={insight.overall_score >= 70 ? "success" : insight.overall_score >= 50 ? "warning" : "destructive"}
          />
        </div>
        {dims.map((d) => (
          <div key={d.key} className="rounded-md bg-card p-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{d.key}</p>
              <Badge variant="secondary">{d.value.rating}/5</Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-card-foreground">{d.value.note}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Strengths</p>
        <BulletList items={insight.strengths} tone="primary" />
      </div>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Concerns</p>
        <BulletList items={insight.concerns} tone="muted" empty="None flagged." />
      </div>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Evidence</p>
        <BulletList items={insight.evidence} tone="muted" empty="No evidence recorded yet." />
      </div>
      <AiDisclaimer />
    </div>
  );
}

export function CandidateDetail({ candidate, open, onOpenChange, onChanged }: CandidateDetailProps) {
  const analyze = useAiRun<AnalyzeResumeActionResult>();
  const match = useAiRun<MatchCandidateActionResult>();
  const insight = useAiRun<GenerateInterviewInsightActionResult>();
  const [stage, setStage] = useState(candidate.status);
  const [stageBusy, setStageBusy] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [recording, setRecording] = useState<CandidateInterview | null>(null);
  const [insightForId, setInsightForId] = useState<string | null>(null);

  const assessment = candidate.assessment;

  async function changeStage(status: string) {
    setStage(status);
    setStageBusy(true);
    setStageError(null);
    const res = await updateCandidateStatus(candidate.id, status);
    setStageBusy(false);
    if (!res.ok) {
      setStageError(res.error ?? "Failed to update the stage.");
      setStage(candidate.status);
      return;
    }
    onChanged();
  }

  async function runInsight(interviewId: string) {
    setInsightForId(interviewId);
    insight.run(() => generateInterviewInsight(interviewId));
  }

  const refreshedInsightId = React.useRef<string | null>(null);
  useEffect(() => {
    if (insight.result?.ok && insightForId && refreshedInsightId.current !== insightForId) {
      refreshedInsightId.current = insightForId;
      onChanged();
    }
  }, [insight.result, insightForId, onChanged]);

  const isBusy = analyze.isPending || match.isPending;
  const isNewAnalysis = analyze.isPending && !analyze.result;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <User className="h-5 w-5" aria-hidden="true" />
            {candidate.full_name}
            {assessment && <RecommendationBadge recommendation={assessment.recommendation} />}
          </DialogTitle>
          <DialogDescription>
            {[candidate.current_title, candidate.job_title].filter(Boolean).join(" · ") || "No current title"} — applying for{" "}
            {candidate.job_title ?? "no role"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {stageError && <ErrorBanner error={stageError} />}

          <div className="flex flex-wrap items-center gap-2">
            <Select value={stage} onValueChange={(v) => changeStage(v)} disabled={stageBusy}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_CHOICES.map((s) => (
                  <SelectItem key={s} value={s}>{STAGE_META[s]?.label ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stageBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{candidate.email}</p>
            {candidate.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{candidate.phone}</p>}
            <p className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Applied {new Date(candidate.applied_at).toLocaleDateString()}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!candidate.has_resume || isBusy}
              title={candidate.has_resume ? "Extract structured profile from the uploaded resume" : "Upload a resume first"}
              onClick={() => analyze.run(() => analyzeResume(candidate.id))}
            >
              {analyze.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Analyze resume
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!candidate.has_resume || isBusy}
              title="Score the candidate against their role"
              onClick={() => match.run(() => matchCandidate(candidate.id))}
            >
              {match.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
              Score match
            </Button>
          </div>

          {!candidate.has_resume && (
            <p className="text-xs text-muted-foreground">
              No resume uploaded yet — upload one to enable resume analysis and AI matching.
            </p>
          )}

          {isNewAnalysis && <LoadingRow label="Extracting a structured profile from the resume…" />}
          {analyze.result && !analyze.result.ok && <ErrorBanner error={analyze.result.error ?? "Failed to analyze the resume."} />}
          {match.result && !match.result.ok && <ErrorBanner error={match.result.error ?? "Failed to score the candidate."} />}

          {(candidate.summary || candidate.experience_years != null || candidate.education || candidate.skills.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {candidate.summary && (
                <Panel icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />} title="Summary">
                  <p className="text-sm leading-relaxed text-card-foreground">{candidate.summary}</p>
                </Panel>
              )}
              {candidate.skills.length > 0 && (
                <Panel icon={<Award className="h-3.5 w-3.5" aria-hidden="true" />} title="Skills">
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </Panel>
              )}
              {candidate.experience_years != null && (
                <Panel icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />} title="Experience">
                  <p className="text-sm">{candidate.experience_years} years total</p>
                  {candidate.relevant_experience && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{candidate.relevant_experience}</p>
                  )}
                </Panel>
              )}
              {candidate.education && (
                <Panel icon={<GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />} title="Education">
                  <p className="text-sm">{candidate.education}</p>
                </Panel>
              )}
              {candidate.certifications && (
                <Panel icon={<Award className="h-3.5 w-3.5" aria-hidden="true" />} title="Certifications">
                  <p className="text-sm">{candidate.certifications}</p>
                </Panel>
              )}
            </div>
          )}

          {candidate.projects && (
            <Panel icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />} title="Projects">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">{candidate.projects}</p>
            </Panel>
          )}

          {assessment && (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <MatchBadge score={assessment.overall_match} />
                <RecommendationBadge recommendation={assessment.recommendation} />
                <ConfidenceBadge confidence={assessment.confidence ?? undefined} />
                {assessment.updated_at && (
                  <span className="text-[11px] text-muted-foreground">
                    Scored {new Date(assessment.updated_at).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ScoreRow label="Overall match" value={assessment.overall_match} />
                <ScoreRow label="Skills" value={assessment.skill_match} />
                <ScoreRow label="Experience" value={assessment.experience_match} />
                <ScoreRow label="Role relevance" value={assessment.role_relevance} />
                <ScoreRow label="Education" value={assessment.education_match} />
              </div>

              {assessment.summary && (
                <p className="text-sm leading-relaxed text-card-foreground">{assessment.summary}</p>
              )}

              {assessment.why_matches.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why they match</p>
                  <BulletList items={assessment.why_matches} />
                </div>
              )}
              {assessment.missing_requirements.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gaps</p>
                  <BulletList items={assessment.missing_requirements} tone="muted" />
                </div>
              )}
              {assessment.relevant_evidence.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Evidence</p>
                  <BulletList items={assessment.relevant_evidence} tone="muted" />
                </div>
              )}
              {assessment.interview_focus.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interview focus</p>
                  <BulletList items={assessment.interview_focus} tone="muted" />
                </div>
              )}
              {assessment.next_step && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Next step</p>
                  <p className="text-sm leading-relaxed">{assessment.next_step}</p>
                </div>
              )}
              <AiDisclaimer />
            </div>
          )}

          {!assessment && candidate.has_resume && (
            <p className="text-xs text-muted-foreground">
              Run <span className="font-medium text-card-foreground">Analyze resume</span> and then{" "}
              <span className="font-medium text-card-foreground">Score match</span> to see this candidate&apos;s evidence-based fit.
            </p>
          )}

          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                Interviews
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={!candidate.job_id}
                onClick={() => setScheduleOpen(true)}
                title={candidate.job_id ? "Create an interview with the role's AI question set" : "Assign a job to the candidate first"}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Schedule interview
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Pipeline stage is the HR decision — the AI interview insight below is advisory only.
            </p>

            {candidate.interviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No interviews yet. Schedule one to attach the role&apos;s question set and collect evaluations.
              </p>
            ) : (
              <ul className="space-y-3">
                {candidate.interviews.map((int) => {
                  const meta = INTERVIEW_STATUS_META[int.status] ?? { label: int.status, variant: "secondary" as const };
                  const records = int.evaluation_records;
                  const showInsight = insightForId === int.id;
                  return (
                    <li key={int.id} className="space-y-2 rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <span className="text-xs capitalize text-muted-foreground">{int.interview_type ?? "Interview"}</span>
                        {int.scheduled_at && (
                          <span className="text-xs text-muted-foreground">{new Date(int.scheduled_at).toLocaleString()}</span>
                        )}
                        {int.interviewer_name && <span className="text-xs text-muted-foreground">· {int.interviewer_name}</span>}
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {int.questions.length} questions · {records.length} evaluated
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={int.status === "cancelled" || int.status === "no_show"}
                          onClick={() => setRecording(int)}
                        >
                          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                          Record evaluation
                        </Button>
                        {records.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={insight.isPending && showInsight}
                            onClick={() => runInsight(int.id)}
                          >
                            {insight.isPending && showInsight ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            {int.ai_insight ? "Regenerate insight" : "Generate insight"}
                          </Button>
                        )}
                      </div>

                      {showInsight && insight.isPending && <LoadingRow label="Analyzing the recorded responses…" />}
                      {showInsight && insight.result && !insight.result.ok && (
                        <ErrorBanner error={insight.result.error ?? "Failed to generate the insight."} />
                      )}

                      <div className="space-y-2">
                        {int.questions.length > 0 && (
                          <details>
                            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                              Review {int.questions.length} interview questions
                            </summary>
                            <ul className="mt-2 space-y-1.5">
                              {int.questions.map((q, i) => (
                                <li key={q.id} className="text-sm leading-relaxed">
                                  <span className="text-muted-foreground">{i + 1}.</span> {q.question}
                                  {q.title && <span className="ml-1 text-[11px] text-muted-foreground">({q.title})</span>}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                        {records.length > 0 && (
                          <details>
                            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                              Review {records.length} recorded responses
                            </summary>
                            <ul className="mt-2 space-y-2">
                              {records.map((r) => (
                                <li key={r.id} className="rounded-md bg-muted/40 p-2">
                                  <p className="text-sm font-medium">{r.question}</p>
                                  {r.candidate_response && (
                                    <p className="mt-1 text-sm leading-relaxed text-card-foreground">{r.candidate_response}</p>
                                  )}
                                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                    <Badge variant="secondary">{r.rating != null ? `${r.rating}/5` : "No rating"}</Badge>
                                    {r.notes && <span>{r.notes}</span>}
                                    {r.interviewer_name && <span>· {r.interviewer_name}</span>}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>

                      {(() => {
                      const live = showInsight && insight.result?.ok ? insight.result.insight : null;
                      const card = int.ai_insight ?? live;
                      return card ? <InsightCard insight={card} /> : null;
                    })()}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>

      <ScheduleInterviewDialog
        candidate={candidate}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onCreated={onChanged}
      />
      {recording && (
        <RecordEvaluationDialog
          interview={recording}
          candidateName={candidate.full_name}
          open
          onOpenChange={(next) => {
            if (!next) setRecording(null);
          }}
          onSaved={onChanged}
        />
      )}
    </Dialog>
  );
}