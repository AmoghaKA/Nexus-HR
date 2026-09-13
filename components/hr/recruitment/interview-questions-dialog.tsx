"use client";

import { ClipboardList, Loader2, Sparkles } from "lucide-react";

import { generateInterviewQuestions, type GenerateInterviewQuestionsActionResult } from "@/lib/ai/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import { ConfidenceBadge, ErrorBanner, LoadingRow, AiDisclaimer } from "@/components/hr/ai-shared";

interface InterviewQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}

export function InterviewQuestionsDialog({ open, onOpenChange, jobId, jobTitle }: InterviewQuestionsDialogProps) {
  const { isPending, result, run } = useAiRun<GenerateInterviewQuestionsActionResult>();

  const questions = result?.ok ? result.questions : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            Interview questions · {jobTitle}
          </DialogTitle>
          <DialogDescription>
            A role-specific question set across technical, behavioral and fit areas — grounded in the job requirements and free of protected-characteristic probes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button size="sm" disabled={isPending || Boolean(questions)} onClick={() => run(() => generateInterviewQuestions(jobId))}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isPending ? "Generating…" : questions ? "Questions generated" : "Generate questions"}
          </Button>

          {!isPending && !questions && (
            <p className="text-xs text-muted-foreground">Ask the AI to build a question set the team can use in interviews.</p>
          )}

          {isPending && <LoadingRow label="Crafting interview questions…" />}
          {result && !result.ok && <ErrorBanner error={result.error ?? "Failed to generate questions."} />}

          {questions && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">
                  {questions.sections.reduce((acc, s) => acc + s.questions.length, 0)} questions
                </Badge>
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

              <AiDisclaimer />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}