"use client";

import { useState } from "react";
import { BookOpenCheck, Loader2, Quote, Send } from "lucide-react";

import type { AnswerPolicyQuestionActionResult } from "@/lib/ai/actions";
import { answerPolicyQuestion } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import { ConfidenceBadge, ErrorBanner, LoadingRow, AiDisclaimer } from "@/components/hr/ai-shared";

const SUGGESTIONS = [
  "How many days of annual leave do I get?",
  "Can I work remotely, and what are the requirements?",
  "What expenses can I claim and how?",
  "What should I do if I suspect a data breach?",
  "How do I report a workplace concern?",
];

export function PolicyQA() {
  const { isPending, result, run } = useAiRun<AnswerPolicyQuestionActionResult>();
  const [question, setQuestion] = useState("");

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || isPending) return;
    setQuestion(trimmed);
    run(() => answerPolicyQuestion(trimmed));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(question);
            }
          }}
          rows={3}
          placeholder='Ask a question about company policy, e.g. "What is the remote work policy?"'
          className="w-full max-w-xl rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" disabled={isPending || !question.trim()} onClick={() => submit(question)}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isPending ? "Searching policies…" : "Ask"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => submit(s)}
            className="rounded-full border bg-card px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      {isPending && <LoadingRow label="Retrieving policy context and generating an answer…" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.answer && <AnswerView answer={result.answer} />}
    </div>
  );
}

function AnswerView({ answer }: { answer: NonNullable<AnswerPolicyQuestionActionResult["answer"]> }) {
  return (
    <Card className="ai-gradient-border space-y-4 p-5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">Policy answer</p>
            <ConfidenceBadge confidence={answer.confidence} />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-card-foreground">{answer.answer}</p>
        </div>
      </div>

      {answer.citations.length > 0 && (
        <div className="space-y-1.5 rounded-lg border bg-muted/40 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sources</p>
          {answer.citations.map((c) => (
            <p key={`${c.policy}-${c.section}`} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Quote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-medium text-card-foreground">{c.policy}</span>
                {c.section ? ` — ${c.section}` : ""}
              </span>
            </p>
          ))}
        </div>
      )}

      {answer.disclaimer && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <Badge variant="outline" className="mr-1.5">Note</Badge>
          {answer.disclaimer}
        </p>
      )}

      <AiDisclaimer />
    </Card>
  );
}