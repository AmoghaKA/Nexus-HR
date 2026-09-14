"use client";

import { useState } from "react";
import { BookOpenCheck, ExternalLink, FileText, Loader2, Quote, Send, XCircle } from "lucide-react";

import type { AnswerPolicyQuestionActionResult } from "@/lib/ai/actions";
import { answerPolicyQuestion } from "@/lib/ai/actions";
import { getPolicySourceUrl } from "@/lib/policies/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAiRun } from "@/components/hr/ai-run";
import { ConfidenceBadge, ErrorBanner, LoadingRow, AiDisclaimer } from "@/components/hr/ai-shared";

type PolicyAnswer = NonNullable<AnswerPolicyQuestionActionResult["answer"]>;
type PolicySource = NonNullable<AnswerPolicyQuestionActionResult["sources"]>[number];

const SUGGESTIONS = [
  "How many remote work days can I take?",
  "Can I work remotely, and what are the requirements?",
  "What expenses can I claim and how?",
  "What should I do if I suspect a data breach?",
  "How do I report a workplace concern?",
  "What is the IT acceptable use policy?",
];

export function PolicyAssistant() {
  const { isPending, result, run } = useAiRun<AnswerPolicyQuestionActionResult>();
  const [question, setQuestion] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const submit = (value?: string) => {
    const trimmed = (value ?? question).trim();
    if (!trimmed || isPending) return;
    setQuestion("");
    run(() => answerPolicyQuestion(trimmed));
  };

  const openSource = async (policyId: string) => {
    if (openingId) return;
    setOpeningId(policyId);
    try {
      const res = await getPolicySourceUrl(policyId);
      if (res.ok) {
        window.open(res.url, "_blank", "noopener");
      } else {
        console.error(res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Ask a question about any company policy. The assistant retrieves relevant policy sections and answers
        from the published documents.
      </p>

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
          placeholder='Ask a question about company policy, e.g. "How many remote work days can I take?"'
          className="w-full max-w-xl rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" disabled={isPending || !question.trim()} onClick={() => submit(question)}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isPending ? "Asking…" : "Ask"}
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

      {isPending && <LoadingRow label="Retrieving relevant policy sections…" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Something went wrong answering your question."} />}
      {result?.ok && result.found === false && <NoAnswerCard />}
      {result?.ok && result.found !== false && result.answer && (
        <AnswerView answer={result.answer} sources={result.sources ?? []} openingId={openingId} onOpenSource={openSource} />
      )}
    </div>
  );
}

function NoAnswerCard() {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">No relevant policy section found</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            I couldn&apos;t find sufficient information in the available HR policies.
          </p>
          <div className="mt-2">
            <ConfidenceBadge confidence={0} />
          </div>
        </div>
      </div>
      <AiDisclaimer />
    </Card>
  );
}

function AnswerView({
  answer,
  sources,
  openingId,
  onOpenSource,
}: {
  answer: PolicyAnswer;
  sources: PolicySource[];
  openingId: string | null;
  onOpenSource: (policyId: string) => void;
}) {
  return (
    <Card className="ai-gradient-border overflow-hidden">
      <div className="flex items-center gap-2.5 border-b bg-gradient-to-r from-primary/[0.07] via-indigo-500/[0.05] to-transparent px-5 py-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-primary-foreground shadow-sm">
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold">Policy answer</p>
        <ConfidenceBadge confidence={answer.confidence} className="ml-auto" />
      </div>

      <div className="space-y-4 p-5">
        <div className="relative rounded-xl border bg-muted/30 p-4">
          <div
            className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary via-indigo-500 to-violet-500"
            aria-hidden="true"
          />
          <p className="pl-2 text-[15px] font-medium leading-relaxed text-card-foreground">{answer.answer}</p>
        </div>

        {answer.explanation && (
          <div className="rounded-xl border border-primary/15 bg-primary/[0.03] px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
              How this answer was determined
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{answer.explanation}</p>
          </div>
        )}

        {sources.length > 0 && (
          <div className="space-y-1.5 rounded-xl border bg-muted/40 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Source documents
            </p>
            <ul className="space-y-1.5">
              {sources.map((source) => (
                <li key={`${source.policyId}-${source.chunkIndex}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center rounded-full border bg-card px-2.5 py-0.5 text-[11px] font-medium text-card-foreground">
                    {source.title} §{source.chunkIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenSource(source.policyId)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    {openingId === source.policyId ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    )}
                    View Source
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {answer.citations.length > 0 && (
          <div className="space-y-1.5 rounded-xl border bg-muted/40 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cited passages</p>
            {answer.citations.map((c, i) => (
              <p key={`${c.policy}-${c.section}-${i}`} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
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
          <div className="text-[11px] leading-relaxed text-muted-foreground">
            <Badge variant="outline" className="mr-1.5">Note</Badge>
            {answer.disclaimer}
          </div>
        )}

        <AiDisclaimer />
      </div>
    </Card>
  );
}