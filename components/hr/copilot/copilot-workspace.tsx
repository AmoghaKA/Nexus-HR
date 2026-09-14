"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, RotateCcw, Send, Sparkles, User, Zap } from "lucide-react";
import Link from "next/link";

import type { AnswerCopilotQuestionActionResult } from "@/lib/ai/actions";
import { answerCopilotQuestion } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AiDisclaimer,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  RecommendedActions,
} from "@/components/hr/ai-shared";

const SUGGESTED_PROMPTS = [
  "Which department has the highest attrition risk and why?",
  "Analyze attrition risk in Engineering and recommend actions",
  "Find skill gaps and flag the ones critical for our AI roadmap",
  "Which employees show declining performance alongside worse attendance?",
  "Who are the strongest candidates for the open roles?",
  "Are any new hires falling behind on onboarding?",
];

const INTENT_LABELS: Record<string, string> = {
  attrition_risk_by_dept: "Department risk",
  attrition_trend_dept: "Risk drivers",
  performance_attendance_decline: "Performance & attendance",
  skill_gaps: "Skill gaps",
  recruitment_candidates: "Recruitment",
  onboarding_at_risk: "Onboarding",
  workforce_risk_summary: "Risk summary",
  department_recommendations: "Recommendations",
  workforce_briefing: "Briefing",
  general: "Workforce",
};

type ThreadMsg =
  | { role: "user"; question: string }
  | { role: "assistant"; answer: NonNullable<AnswerCopilotQuestionActionResult["answer"]>; intent: string };

export function CopilotWorkspace() {
  const [thread, setThread] = useState<ThreadMsg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, pending]);

  const submit = async (raw: string) => {
    const question = raw.trim();
    if (!question || pending) return;

    const history = thread
      .filter((m): m is { role: "user"; question: string } => m.role === "user")
      .slice(-4)
      .map((m) => m.question);

    setThread((prev) => [...prev, { role: "user", question }]);
    setInput("");
    setError(null);
    setPending(true);

    const result: AnswerCopilotQuestionActionResult = await answerCopilotQuestion(question, history);
    setPending(false);

    if (result.ok && result.answer) {
      setThread((prev) => [...prev, { role: "assistant", answer: result.answer!, intent: result.intent ?? "general" }]);
    } else {
      setError(result.error ?? "The copilot could not answer that right now. Please try again.");
    }
  };

  const reset = () => {
    setThread([]);
    setError(null);
    setInput("");
  };

  return (
    <Card className="ai-gradient-border flex min-h-[70vh] flex-col gap-0 overflow-hidden">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex max-h-[58vh] min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {thread.length === 0 && !pending ? (
            <EmptyState onPick={submit} />
          ) : (
            <>
              {thread.map((msg, i) => (
                <ChatMessage key={i} msg={msg} />
              ))}
              {pending && (
                <div className="flex items-start gap-3">
                  <BotIcon />
                  <LoadingRow label="Reading workforce signals and composing an answer…" className="flex-1" />
                </div>
              )}
              <div ref={scrollRef} />
            </>
          )}
        </div>

        {error && <ErrorBanner error={error} />}

        <div className="mt-auto space-y-3 pt-2">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(input);
                }
              }}
              rows={2}
              placeholder='Ask the workforce copilot, e.g. "Which department has the highest attrition risk?"'
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="icon" disabled={pending || !input.trim()} onClick={() => void submit(input)} aria-label="Ask">
              {pending ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" aria-hidden="true" />
              Analyzes live workforce data
            </Badge>
            <Badge variant="outline" className="bg-card">
              Advisory only
            </Badge>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              New conversation
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BotIcon() {
  return (
    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
      <Bot className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Bot className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-card-foreground">Workforce Copilot</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Ask natural-language questions about attrition, performance, skills, recruitment, and onboarding. Answers
          include evidence, reasoning, and recommended actions grounded in your live Supabase data.
        </p>
      </div>
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className="group flex items-start justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span className="leading-relaxed">{p}</span>
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ msg }: { msg: ThreadMsg }) {
  if (msg.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-primary/20 bg-primary/[0.06] px-4 py-2.5 text-sm leading-relaxed text-card-foreground">
          {msg.question}
        </div>
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <User className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <BotIcon />
      <div className="min-w-0 flex-1">
        <AnswerView answer={msg.answer} intent={msg.intent} />
      </div>
    </div>
  );
}

function IntentBadge({ intent }: { intent: string }) {
  return (
    <Badge variant="secondary" className="capitalize">
      {INTENT_LABELS[intent] ?? intent.replace(/_/g, " ")}
    </Badge>
  );
}

function EntityChips({
  title,
  items,
  hrefFor,
}: {
  title: string;
  items: { name: string; note?: string; id?: string }[];
  hrefFor?: (id?: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/40 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 12).map((item, i) => (
          <span
            key={`${item.name}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            {hrefFor && item.id ? (
              <Link
                href={hrefFor(item.id)}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {item.name}
              </Link>
            ) : (
              <span className="font-medium text-card-foreground">{item.name}</span>
            )}
            {item.note && <span className="text-[10px]">· {item.note}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
  );
}

function AnswerView({
  answer,
  intent,
}: {
  answer: NonNullable<AnswerCopilotQuestionActionResult["answer"]>;
  intent: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl rounded-tl-sm border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b bg-gradient-to-r from-primary/[0.07] via-indigo-500/[0.05] to-transparent px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-violet-500 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Copilot
        </span>
        <IntentBadge intent={intent} />
        <span className="hidden text-xs text-muted-foreground sm:inline">Nexus HR</span>
        <ConfidenceBadge confidence={answer.confidence} className="ml-auto" />
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <p className="text-[15px] leading-relaxed text-card-foreground">{answer.answer}</p>

        {answer.evidence.length > 0 && (
          <section className="space-y-2">
            <SectionLabel label="Evidence" />
            <div className="grid gap-2 sm:grid-cols-2">
              {answer.evidence.map((e, i) => (
                <div key={`${e.label}-${i}`} className="rounded-xl border bg-muted/30 px-3.5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {e.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-card-foreground">
                    {e.value}
                  </p>
                  {e.detail && (
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{e.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {answer.reasoning && (
          <section className="space-y-2">
            <SectionLabel label="Reasoning" />
            <div className="relative overflow-hidden rounded-xl border bg-primary/[0.03] p-4">
              <div
                className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary via-indigo-500 to-violet-500"
                aria-hidden="true"
              />
              <p className="pl-2 text-sm leading-relaxed text-muted-foreground">{answer.reasoning}</p>
            </div>
          </section>
        )}

        {answer.recommended_actions.length > 0 && (
          <section className="space-y-2">
            <SectionLabel label="Recommended actions" />
            <RecommendedActions actions={answer.recommended_actions} />
          </section>
        )}

        <section className="space-y-2">
          <EntityChips title="Departments" items={answer.relevant_departments} />
          <EntityChips title="Employees" items={answer.relevant_employees} hrefFor={(id) => `/hr/employees/${id}`} />
          <EntityChips title="Candidates" items={answer.relevant_candidates} hrefFor={() => "/hr/recruitment"} />
        </section>

        <Separator />
        <AiDisclaimer />
      </div>
    </div>
  );
}