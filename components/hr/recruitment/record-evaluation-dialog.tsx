"use client";

import * as React from "react";
import { useState } from "react";
import { ClipboardCheck, Loader2, Plus, Trash2 } from "lucide-react";

import type { CandidateInterview } from "@/lib/hr/recruitment";
import { recordInterviewEvaluationRows } from "@/lib/recruitment/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorBanner } from "@/components/hr/ai-shared";

const RATINGS = [1, 2, 3, 4, 5];

interface EvalRow {
  question: string;
  response: string;
  rating: string;
  notes: string;
}

interface RecordEvaluationDialogProps {
  interview: CandidateInterview;
  candidateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function RecordEvaluationDialog({ interview, candidateName, open, onOpenChange, onSaved }: RecordEvaluationDialogProps) {
  const sourceQuestions = interview.questions.length > 0 ? interview.questions : [{ id: "free", title: null, question: "", order_index: 0 }];
  const [rows, setRows] = useState<EvalRow[]>(() =>
    sourceQuestions.map((q) => ({ question: q.question, response: "", rating: "", notes: "" }))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<EvalRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addFreeRow() {
    setRows((prev) => [...prev, { question: "", response: "", rating: "", notes: "" }]);
  }

  async function runSave() {
    const payload = rows
      .filter((r) => r.question.trim())
      .map((r) => ({
        question: r.question.trim(),
        candidate_response: r.response.trim(),
        rating: r.rating ? Number(r.rating) : null,
        notes: r.notes.trim(),
      }));
    if (payload.length === 0) {
      setError("Record a response for at least one question.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await recordInterviewEvaluationRows(interview.id, payload);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to save the evaluation.");
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            Record interview evaluation · {candidateName}
          </DialogTitle>
          <DialogDescription>
            For each question, capture the candidate&apos;s response, a 1–5 rating and your notes. AI turns this into an advisory interview insight.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {interview.questions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              This interview has no saved questions — add your own below.
            </p>
          )}

          {rows.map((row, index) => (
            <div key={index} className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question {index + 1}</p>
                {index >= sourceQuestions.length && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <Textarea
                value={row.question}
                onChange={(e) => updateRow(index, { question: e.target.value })}
                placeholder="Interview question"
                className="min-h-[60px] text-sm"
              />

              <div className="space-y-1.5">
                <Label htmlFor={`response-${index}`}>Candidate response</Label>
                <Textarea
                  id={`response-${index}`}
                  value={row.response}
                  onChange={(e) => updateRow(index, { response: e.target.value })}
                  placeholder="How did the candidate answer?"
                  className="min-h-[80px] text-sm"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <div className="space-y-1.5">
                  <Label htmlFor={`rating-${index}`}>Rating</Label>
                  <Select value={row.rating} onValueChange={(v) => updateRow(index, { rating: v })}>
                    <SelectTrigger id={`rating-${index}`} className="h-9 text-xs">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {RATINGS.map((r) => (
                        <SelectItem key={r} value={String(r)}>{r} / 5</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`notes-${index}`}>Notes</Label>
                  <Input
                    id={`notes-${index}`}
                    value={row.notes}
                    onChange={(e) => updateRow(index, { notes: e.target.value })}
                    placeholder="Optional interviewer notes"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button size="sm" variant="outline" onClick={addFreeRow}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add question
          </Button>

          {error && <ErrorBanner error={error} />}

          <Button size="sm" className="w-full" onClick={runSave} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            {busy ? "Saving evaluation…" : "Save evaluation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}