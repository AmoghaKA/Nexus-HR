"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

import type { RecruitableDepartment, RecruitmentJob } from "@/lib/hr/recruitment";
import { createJob, updateJob, type JobInput } from "@/lib/recruitment/actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const SENIORITY_OPTIONS = ["Entry level", "Junior", "Mid-level", "Senior", "Lead", "Manager", "Director", "Executive"];

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: RecruitableDepartment[];
  job?: RecruitmentJob | null;
  onSaved: () => void;
}

const EMPTY: JobInput = {
  title: "",
  department_id: null,
  status: "published",
  employment_type: "full_time",
  location: "",
  headcount: 1,
  description: "",
  required_skills: "",
  preferred_skills: "",
  experience: "",
  education: "",
  seniority: "",
};

export function JobFormDialog({ open, onOpenChange, departments, job, onSaved }: JobFormDialogProps) {
  const [form, setForm] = useState<JobInput>(() =>
    job
      ? {
          title: job.title ?? "",
          department_id: job.department_id,
          status: job.status,
          employment_type: job.employment_type,
          location: job.location ?? "",
          headcount: job.headcount ?? 1,
          description: job.description ?? "",
          required_skills: job.required_skills ?? "",
          preferred_skills: job.preferred_skills ?? "",
          experience: job.experience ?? "",
          education: job.education ?? "",
          seniority: job.seniority ?? "",
        }
      : EMPTY
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof JobInput>(key: K, value: JobInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = job ? await updateJob(job.id, form) : await createJob(form);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to save the job.");
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{job ? `Edit ${job.title}` : "Create a job"}</DialogTitle>
          <DialogDescription>
            Define the role, its requirements, and the skills the AI matching engine should score against.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {error && <ErrorBanner error={error} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-title">Title</Label>
              <Input id="job-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Senior Backend Engineer" />
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.department_id ?? "none"} onValueChange={(v) => set("department_id", v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Seniority</Label>
              <Select value={form.seniority || "none"} onValueChange={(v) => set("seniority", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose seniority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {SENIORITY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employment type</Label>
              <Select value={form.employment_type ?? "full_time"} onValueChange={(v) => set("employment_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["full_time", "Full-time"],
                    ["part_time", "Part-time"],
                    ["contract", "Contract"],
                    ["intern", "Internship"],
                  ].map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-location">Location</Label>
              <Input id="job-location" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Berlin (hybrid)" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-headcount">Open headcount</Label>
              <Input id="job-headcount" type="number" min={1} value={form.headcount ?? 1} onChange={(e) => set("headcount", Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-experience">Experience requirement</Label>
              <Input id="job-experience" value={form.experience ?? ""} onChange={(e) => set("experience", e.target.value)} placeholder="e.g. 5+ years" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-education">Education requirement</Label>
              <Input id="job-education" value={form.education ?? ""} onChange={(e) => set("education", e.target.value)} placeholder="e.g. Bachelor's in CS or equivalent" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-required">Required skills</Label>
              <Textarea id="job-required" rows={2} value={form.required_skills ?? ""} onChange={(e) => set("required_skills", e.target.value)} placeholder="Comma or line separated, e.g. TypeScript, React, Node.js" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-preferred">Preferred skills</Label>
              <Textarea id="job-preferred" rows={2} value={form.preferred_skills ?? ""} onChange={(e) => set("preferred_skills", e.target.value)} placeholder="Nice-to-haves, e.g. Supabase, Kubernetes" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-description">Description</Label>
              <Textarea id="job-description" rows={4} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="What the role is about…" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || !form.title.trim()} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {job ? "Save changes" : "Create job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}