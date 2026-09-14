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
import { InsightCard } from "@/components/hr/ai-shared";

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
            Live Supabase signals → Qwen reasoning → structured, explainable insights.
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Gathering signals and running Qwen…
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
                <InsightCard key={`${insight.title}-${index}`} insight={insight} index={index} />
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