"use client";

import { useState, useTransition } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";

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

export function WorkforceBriefButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<GenerateBriefResult | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      startTransition(async () => {
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Workforce Brief
          </DialogTitle>
          <DialogDescription>
            Summarized workforce signals gathered live from Supabase. This
            structured document is what the Gemini service will turn into an
            executive briefing.
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Gathering workforce signals…
          </div>
        )}

        {!isPending && result && !result.ok && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {result.error}
          </div>
        )}

        {!isPending && result?.ok && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {new Date(result.generatedAt!).toLocaleString()}
              </Badge>
              <Badge variant="secondary">
                {result.insightCount} signals surfaced
              </Badge>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-card-foreground">
                {result.prompt}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}