"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";

import type { RecruitmentCandidate } from "@/lib/hr/recruitment";
import { uploadCandidateResume } from "@/lib/recruitment/actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/hr/ai-shared";

interface UploadResumeDialogProps {
  candidate: RecruitmentCandidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

export function UploadResumeDialog({ candidate, open, onOpenChange, onUploaded }: UploadResumeDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accepts = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const res = await uploadCandidateResume(candidate.id, formData);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to upload the resume.");
      return;
    }
    onOpenChange(false);
    onUploaded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload resume · {candidate.full_name}</DialogTitle>
          <DialogDescription>
            PDF, DOCX or plain text up to 10 MB. The text is extracted and stored so the AI can analyze and match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && <ErrorBanner error={error} />}

          {candidate.has_resume && (
            <p className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Existing resume: {candidate.resume_file_name ?? "uploaded"}
            </p>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground hover:border-primary hover:bg-accent/40"
          >
            <UploadCloud className="h-6 w-6" aria-hidden="true" />
            {file ? (
              <span className="font-medium text-card-foreground">{file.name}</span>
            ) : (
              <span>Click to choose a resume file</span>
            )}
            <span className="text-xs">Chosen files are read locally by the server — nothing else sees them.</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accepts}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || !file} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {busy ? "Uploading…" : "Upload resume"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}