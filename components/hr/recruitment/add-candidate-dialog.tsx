"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";

import type { RecruitmentJob } from "@/lib/hr/recruitment";
import { createCandidate } from "@/lib/recruitment/actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorBanner } from "@/components/hr/ai-shared";

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: RecruitmentJob[];
  onCreated: () => void;
}

export function AddCandidateDialog({ open, onOpenChange, jobs, onCreated }: AddCandidateDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await createCandidate({ full_name: fullName, email, phone: phone || null, job_id: jobId, source: source || null });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to add the candidate.");
      return;
    }
    setFullName("");
    setEmail("");
    setPhone("");
    setJobId(null);
    setSource("");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a candidate</DialogTitle>
          <DialogDescription>
            Add a candidate to the pipeline. Upload their resume afterwards to unlock AI analysis and matching.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {error && <ErrorBanner error={error} />}

          <div className="space-y-2">
            <Label htmlFor="candidate-name">Full name</Label>
            <Input id="candidate-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ada Lovelace" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-email">Email</Label>
            <Input id="candidate-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="candidate-phone">Phone (optional)</Label>
              <Input id="candidate-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 1234" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidate-source">Source (optional)</Label>
              <Input id="candidate-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. LinkedIn" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Applying for</Label>
            <Select value={jobId ?? "none"} onValueChange={(v) => setJobId(v === "none" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick an open role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No role assigned</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || !fullName.trim() || !email.includes("@")} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Add candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}