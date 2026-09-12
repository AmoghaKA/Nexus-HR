import * as React from "react";
import { ArrowDown, ArrowUp, Lightbulb, Minus, Sparkles } from "lucide-react";

import type { AiInsight } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface AIInsightCardProps {
  insight: AiInsight;
  tone?: "default" | "employee";
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

const signalIcon = {
  positive: ArrowUp,
  negative: ArrowDown,
  neutral: Minus,
};

export function AIInsightCard({
  insight,
  tone = "default",
  action,
  footer,
}: AIInsightCardProps) {
  const isEmployee = tone === "employee";
  return (
    <Card
      className={cn(
        "ai-gradient-border relative overflow-hidden p-6",
        !isEmployee && "shadow-md"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl",
          isEmployee
            ? "bg-info/15"
            : "bg-gradient-to-br from-primary/15 via-indigo-500/10 to-violet-500/20"
        )}
      />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              isEmployee
                ? "bg-info/12 text-info"
                : "bg-gradient-to-r from-primary to-violet-500 text-primary-foreground"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI Workforce Briefing
          </span>
          <Badge variant="outline" className="bg-card">
            {Math.round(insight.confidence * 100)}% confidence
          </Badge>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight">
            {insight.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {insight.summary}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {insight.signals.map((signal) => {
            const Icon = signalIcon[signal.severity];
            return (
              <div
                key={signal.label}
                className="flex items-center gap-2 rounded-lg border bg-card/60 px-3 py-2.5"
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    signal.severity === "positive" && "text-success",
                    signal.severity === "negative" && "text-destructive",
                    signal.severity === "neutral" && "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium leading-tight text-card-foreground">
                  {signal.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Recommended action
              </p>
              <p className="text-sm font-medium text-card-foreground">
                {insight.recommendedAction}
              </p>
            </div>
          </div>
          {action}
        </div>

        {footer}
      </div>
    </Card>
  );
}