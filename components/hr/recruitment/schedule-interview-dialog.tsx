"use client";

import * as React from "react";
import { useState } from "react";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";

import type { RecruitmentCandidate } from "@/lib/hr/recruitment";
import { createInterview } from "@/lib/recruitment/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorBanner } from "@/components/hr/ai-shared";

const INTERVIEW_TYPES = [
  { value: "video", label: "Video call" },
  { value: "phone", label: "Phone screen" },
  { value: "onsite", label: "On-site" },
  { value: "panel", label: "Panel" },
];

interface ScheduleInterviewDialogProps {
  candidate: RecruitmentCandidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function ScheduleInterviewDialog({ candidate, open, onOpenChange, onCreated }: ScheduleInterviewDialogProps) {
  const [interviewType, setInterviewType] = useState("video");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setupCount = candidate.question_set?.sections.reduce((acc, s) => acc + s.questions.length, 0) ?? 0;

  async function runCreate() {
    if (!candidate.job_id) return;
    setBusy(true);
    setError(null);
    const res = await createInterview(candidate.id, {
      interview_type: interviewType,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to set up the interview.");
      return;
    }
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
            Schedule interview · {candidate.full_name}
          </DialogTitle>
          <DialogDescription>
            {candidate.job_title ?? "Role not assigned"} — the interview is created with the role&apos;s AI question set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!candidate.job_id && (
            <p className="text-sm text-muted-foreground">
              This candidate has no assigned role yet. Assign a job before scheduling an interview.
            </p>
          )}

          {candidate.job_id && (
            <>
              <div className="flex items-center gap-2 text-xs">
                {setupCount > 0 ? (
                  <Badge variant="outline">{setupCount} questions from the saved role set</Badge>
                ) : (
                  <Badge variant="warning" className="text-[11px]">
                    <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
                    No saved set — a role-specific AI set will be generated automatically.
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interview-type">Interview type</Label>
                <Select value={interviewType} onValueChange={setInterviewType}>
                  <SelectTrigger id="interview-type" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scheduled-at">Scheduled time</Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  className="h-9 text-xs"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              {error && <ErrorBanner error={error} />}

              <Button size="sm" className="w-full" onClick={runCreate} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                {busy ? "Creating interview…" : "Create interview"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}