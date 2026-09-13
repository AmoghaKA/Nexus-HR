"use client";

import * as React from "react";
import { useState } from "react";
import { ClipboardList, Loader2, Plus, Save, Sparkles, X } from "lucide-react";

import type { RecruitmentJob } from "@/lib/hr/recruitment";
import type { InterviewQuestions } from "@/lib/ai/schemas";
import { generateInterviewQuestions } from "@/lib/ai/actions";
import { saveJobInterviewQuestionSet } from "@/lib/recruitment/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge, ErrorBanner, LoadingRow, AiDisclaimer } from "@/components/hr/ai-shared";

const INTERVIEW_STYLES = [
  { value: "mixed", label: "Mixed — technical + behavioral" },
  { value: "technical", label: "Technical depth focus" },
  { value: "behavioral", label: "Behavior / judgement focus" },
] as const;

const SENIORITY_LEVELS = ["Intern", "Entry", "Junior", "Mid", "Senior", "Lead", "Manager", "Director"];

function splitSkills(value: string | null): string[] {
  return (value ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface InterviewSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: RecruitmentJob;
  onSaved: () => void;
}

export function InterviewSetupDialog({ open, onOpenChange, job, onSaved }: InterviewSetupDialogProps) {
  const [interviewType, setInterviewType] = useState<string>("mixed");
  const [seniority, setSeniority] = useState<string>(job.seniority ?? "Mid");
  const [skills, setSkills] = useState<string[]>(splitSkills(job.required_skills));
  const [newSkill, setNewSkill] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestions | null>(job.question_set);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(Boolean(job.question_set));

  const questionsCount = questions?.sections.reduce((acc, s) => acc + s.questions.length, 0) ?? 0;

  function addSkill() {
    const skill = newSkill.trim();
    if (!skill || skills.includes(skill)) return;
    setSkills((prev) => [...prev, skill]);
    setNewSkill("");
  }

  async function runGenerate() {
    setGenerateBusy(true);
    setGenerateError(null);
    const res = await generateInterviewQuestions(job.id, {
      interviewType: interviewType as "technical" | "behavioral" | "mixed",
      seniority,
      requiredSkills: skills,
    });
    setGenerateBusy(false);
    if (res.ok && res.questions) {
      setQuestions(res.questions);
      setSaved(false);
    } else {
      setGenerateError(res.error ?? "Failed to generate questions.");
    }
  }

  async function runSave() {
    if (!questions) return;
    setSaveBusy(true);
    setSaveError(null);
    const res = await saveJobInterviewQuestionSet(job.id, questions);
    setSaveBusy(false);
    if (!res.ok) {
      setSaveError(res.error ?? "Failed to save the question set.");
      return;
    }
    setSaved(true);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            Interview setup · {job.title}
          </DialogTitle>
          <DialogDescription>
            Configure the interview brief — seniority, required skills and question style — and let the AI build a
            role-specific set across Technical, Behavioral and Scenario areas, each with follow-up probes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="interview-type">Question style</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger id="interview-type" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="seniority">Seniority level</Label>
              <Select value={seniority} onValueChange={setSeniority}>
                <SelectTrigger id="seniority" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SENIORITY_LEVELS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Required skills to probe</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-card-foreground"
                    onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
              {skills.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No skills selected — the AI will fall back to the job requirements.
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Add a skill…"
                className="h-9 text-xs"
              />
              <Button size="sm" variant="outline" type="button" onClick={addSkill}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={runGenerate} disabled={generateBusy}>
              {generateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generateBusy ? "Generating…" : "Generate questions"}
            </Button>
            {questions && (
              <Button size="sm" variant="outline" onClick={runSave} disabled={saveBusy || saved}>
                {saveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saved ? "Saved to role" : "Save to role"}
              </Button>
            )}
          </div>

          {generateError && <ErrorBanner error={generateError} />}
          {saveError && <ErrorBanner error={saveError} />}

          {generateBusy && <LoadingRow label="Crafting the role-specific interview question set…" />}

          {questions && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{questionsCount} questions</Badge>
                <ConfidenceBadge confidence={questions.confidence} />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{questions.headline}</p>

              {questions.sections.map((section) => (
                <Card key={section.focus_area} className="ai-gradient-border p-4">
                  <p className="text-sm font-semibold">{section.focus_area}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{section.rationale}</p>
                  <ul className="mt-3 space-y-3">
                    {section.questions.map((q) => (
                      <li key={q.question}>
                        <p className="text-sm font-medium">{q.question}</p>
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

              {saved && (
                <p className="text-xs text-muted-foreground">
                  This set is now attached to the role and will be used for every candidate interview.
                </p>
              )}

              <AiDisclaimer />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}