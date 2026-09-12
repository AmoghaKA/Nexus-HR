"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  ListChecks,
  Loader2,
  MessageSquareText,
  Sparkles,
  UserCheck,
} from "lucide-react";

import type {
  EvaluateInterviewActionResult,
  GenerateInterviewQuestionsActionResult,
  PickerOption,
  RankCandidateActionResult,
} from "@/lib/ai/actions";
import {
  evaluateInterview,
  generateInterviewQuestions,
  listCandidates,
  listInterviews,
  listJobs,
  rankCandidate,
} from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAiRun, type AiRunStatus } from "@/components/hr/ai-run";
import {
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  ScoreBar,
  BulletList,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

const TABS = [
  { id: "rank", label: "Candidate ranking", icon: UserCheck, description: "AI fit-scoring for a candidate against their role." },
  { id: "questions", label: "Interview questions", icon: ClipboardList, description: "Generates a role-specific question set." },
  { id: "evaluate", label: "Interview evaluation", icon: ListChecks, description: "Consolidates submitted evaluations into one verdict." },
] as const;

// ---------------------------------------------------------------------------
// Main shell with tabs
// ---------------------------------------------------------------------------

export function RecruitmentAnalysis() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("rank");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
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
      </div>

      <p className="text-xs text-muted-foreground">{active.description}</p>

      {tab === "rank" && <RankPanel />}
      {tab === "questions" && <QuestionsPanel />}
      {tab === "evaluate" && <EvaluatePanel />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic picker + run panel
// ---------------------------------------------------------------------------

interface PanelProps<R extends AiRunStatus> {
  load: () => Promise<{ ok: boolean; items: PickerOption[]; error?: string }>;
  placeholder: string;
  emptyMessage: string;
  runLabel: string;
  loadingLabel: string;
  onRun: (id: string) => Promise<R>;
  render: (result: R) => React.ReactNode;
}

function Panel<R extends AiRunStatus>({
  load,
  placeholder,
  emptyMessage,
  runLabel,
  loadingLabel,
  onRun,
  render,
}: PanelProps<R>) {
  const { isPending, result, run } = useAiRun<R>();
  const [items, setItems] = useState<PickerOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    load().then((res) => {
      if (!mounted) return;
      if (res.ok) setItems(res.items);
      else setLoadError(res.error ?? "Failed to load options.");
    });
    return () => {
      mounted = false;
    };
  }, [load]);

  const isReady = items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full max-w-sm">
          {loadError && <ErrorBanner error={loadError} />}
          <Select value={selected} onValueChange={setSelected} disabled={!isReady}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isReady ? placeholder : "Loading…"} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                  {item.sub ? ` · ${item.sub}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || !selected}
          onClick={() => run(() => onRun(selected))}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isPending ? "Running…" : runLabel}
        </Button>
      </div>

      {isReady && items.length === 0 && (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}

      {isPending && <LoadingRow label={loadingLabel} />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}
      {result?.ok && render(result)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Candidate ranking
// ---------------------------------------------------------------------------

async function loadCandidates() {
  const res = await listCandidates();
  return { ok: res.ok, items: res.candidates, error: res.error };
}

function RankPanel() {
  return (
    <Panel<RankCandidateActionResult>
      load={loadCandidates}
      placeholder="Choose a candidate…"
      emptyMessage="No candidates yet."
      runLabel="Rank candidate"
      loadingLabel="Scoring candidate fit…"
      onRun={rankCandidate}
      render={(res) => <RankResult result={res} />}
    />
  );
}

function RankResult({ result }: { result: RankCandidateActionResult }) {
  const ranking = result.ranking!;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <p className="text-sm font-semibold">{ranking.candidate_name}</p>
          <p className="text-xs text-muted-foreground">{ranking.job_title}</p>
        </div>
        <Badge variant={ranking.recommended_stage === "reject" ? "danger" : ranking.overall_score >= 75 ? "success" : "warning"} className="ml-auto">
          {ranking.recommended_stage}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Fit score</span>
          <span className="font-medium">{ranking.overall_score}/100</span>
        </div>
        <ScoreBar
          value={ranking.overall_score}
          tone={ranking.overall_score >= 75 ? "success" : ranking.overall_score >= 50 ? "warning" : "destructive"}
        />
      </div>

      <Card className="p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{ranking.fit_summary}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-success">Strengths</p>
            <BulletList items={ranking.strengths} tone="muted" />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-destructive">Concerns</p>
            <BulletList items={ranking.concerns} tone="muted" />
          </div>
        </div>
        {ranking.recommended_action && (
          <p className="mt-3 border-l-2 border-primary/30 pl-3 text-xs leading-relaxed">
            <span className="font-semibold text-primary">Next step: </span>
            {ranking.recommended_action}
          </p>
        )}
      </Card>

      <AiDisclaimer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Interview questions
// ---------------------------------------------------------------------------

async function loadJobs() {
  const res = await listJobs();
  return { ok: res.ok, items: res.jobs, error: res.error };
}

function QuestionsPanel() {
  return (
    <Panel<GenerateInterviewQuestionsActionResult>
      load={loadJobs}
      placeholder="Choose a role…"
      emptyMessage="No open jobs yet."
      runLabel="Generate questions"
      loadingLabel="Crafting interview questions…"
      onRun={generateInterviewQuestions}
      render={(res) => <QuestionsResult result={res} />}
    />
  );
}

function QuestionsResult({ result }: { result: GenerateInterviewQuestionsActionResult }) {
  const questions = result.questions!;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="text-[11px]">
          <MessageSquareText className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {questions.sections.reduce((acc, s) => acc + s.questions.length, 0)} questions
        </Badge>
        <ConfidenceBadge confidence={questions.confidence} />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{questions.headline}</p>

      {questions.sections.map((section) => (
        <Card key={section.focus_area} className="ai-gradient-border p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{section.focus_area}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{section.rationale}</p>
          <ul className="mt-3 space-y-3">
            {section.questions.map((q) => (
              <li key={q.question}>
                <p className="text-sm font-medium text-card-foreground">{q.question}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Assesses: <span className="font-medium">{q.skill_assessed}</span>
                </p>
                {q.follow_ups.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {q.follow_ups.map((f) => (
                      <li key={f} className="text-xs text-muted-foreground">→ {f}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <AiDisclaimer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Interview evaluation
// ---------------------------------------------------------------------------

async function loadInterviews() {
  const res = await listInterviews();
  return { ok: res.ok, items: res.interviews, error: res.error };
}

function EvaluatePanel() {
  return (
    <Panel<EvaluateInterviewActionResult>
      load={loadInterviews}
      placeholder="Choose an interview…"
      emptyMessage="No interviews recorded yet."
      runLabel="Evaluate interview"
      loadingLabel="Consolidating evaluation feedback…"
      onRun={evaluateInterview}
      render={(res) => <EvaluateResult result={res} />}
    />
  );
}

function EvaluateResult({ result }: { result: EvaluateInterviewActionResult }) {
  const evaluation = result.evaluation!;
  const okVerdict = ["strong_yes", "yes"].includes(evaluation.recommendation);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={okVerdict ? "success" : evaluation.recommendation === "maybe" ? "warning" : "danger"}>
          {evaluation.recommendation.replace("_", " ")}
        </Badge>
        <span className="text-xs text-muted-foreground">Overall {evaluation.overall_score}/100</span>
        <ConfidenceBadge confidence={evaluation.confidence} />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{evaluation.headline}</p>

      <div className="grid gap-2 sm:grid-cols-3">
        {evaluation.dimensions.map((d) => (
          <Card key={d.dimension} className="p-4">
            <p className="text-xs font-medium">{d.dimension}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Rating</span>
                <span className="font-medium">{d.rating}/5</span>
              </div>
              <ScoreBar value={d.rating} max={5} tone={d.rating >= 4 ? "success" : d.rating === 3 ? "warning" : "destructive"} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{d.note}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-success">Highlights</p>
          <BulletList items={evaluation.highlights} tone="muted" />
        </Card>
        <Card className="p-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-destructive">Risks</p>
          <BulletList items={evaluation.risks} tone="muted" />
        </Card>
      </div>

      {evaluation.next_step && (
        <p className="border-l-2 border-primary/30 pl-3 text-xs leading-relaxed">
          <span className="font-semibold text-primary">Next step: </span>
          {evaluation.next_step}
        </p>
      )}

      <AiDisclaimer />
    </div>
  );
}