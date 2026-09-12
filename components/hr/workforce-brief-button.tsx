"use client";

import { useState, useTransition } from "react";
import { FileText, Loader2, ShieldAlert, Sparkles } from "lucide-react";

import { generateWorkforceBrief, type GenerateBriefResult } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const severityDot: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
  info: "bg-muted-foreground",
};

export function WorkforceBriefButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<GenerateBriefResult | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      startTransition(async () => {
        setResult(null);
        setResult(await generateWorkforceBrief());
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Generate Workforce Brief
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Workforce Brief
          </DialogTitle>
          <DialogDescription>
            Live Supabase signals → Gemini reasoning → structured, explainable insights.
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Gathering signals and running Gemini…
          </div>
        )}

        {!isPending && result && !result.ok && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {result.error}
          </div>
        )}

        {!isPending && result?.ok && result.insights && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {result.brief?.generatedAt
                  ? new Date(result.brief.generatedAt).toLocaleString()
                  : "Generated just now"}
              </Badge>
              <Badge variant="secondary">
                {result.insights.length} insight{result.insights.length === 1 ? "" : "s"}
              </Badge>
              {typeof result.saved === "number" && (
                <Badge variant="success">
                  {result.saved} saved to ai_insights
                </Badge>
              )}
              {result.persistError && (
                <Badge variant="outline" className="text-destructive">
                  Insights not persisted
                </Badge>
              )}
            </div>

            {result.persistError && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-xs text-warning">
                {result.persistError}
              </div>
            )}

            <div className="space-y-3">
              {result.insights.map((insight, index) => (
                <div key={`${insight.title}-${index}`} className="rounded-lg border bg-card/60 p-4">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDot[insight.severity] ?? "bg-muted-foreground"}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold leading-snug">{insight.title}</p>
                        <Badge variant="outline" className="ml-auto shrink-0">
                          {Math.round(insight.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {insight.summary}
                      </p>
                    </div>
                  </div>

                  {insight.evidence.length > 0 && (
                    <ul className="mt-2.5 space-y-1">
                      {insight.evidence.map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {insight.reasoning && (
                    <p className="mt-2.5 border-l-2 border-muted pl-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-card-foreground">Why: </span>
                      {insight.reasoning}
                    </p>
                  )}

                  {insight.recommended_action && (
                    <p className="mt-2.5 text-xs font-medium text-primary">
                      {insight.recommended_action}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Insights are AI-generated estimates from workforce data. They are not guarantees and should be
              reviewed by HR before any action.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}