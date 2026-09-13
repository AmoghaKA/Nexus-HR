"use client";

import { useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";

import { uploadPolicy } from "@/lib/policies/actions";
import { Modal } from "@/components/shared/modal";
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

interface PolicyUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "hr", label: "HR & People" },
  { value: "finance", label: "Finance" },
  { value: "it", label: "IT" },
  { value: "security", label: "Security" },
  { value: "conduct", label: "Code of Conduct" },
];

interface SelectedFile {
  fileName: string;
  mimeType: string;
  base64: string;
}

export function PolicyUploadDialog({ open, onOpenChange, onUploaded }: PolicyUploadDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setCategory("");
    setFile(null);
    setError(null);
  };

  const handleFile = (input: File | null) => {
    setFile(null);
    if (!input) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setFile({ fileName: input.name, mimeType: input.type, base64 });
    };
    reader.readAsDataURL(input);
  };

  const canSubmit = Boolean(title.trim() && file?.base64);

  const submit = async () => {
    if (!canSubmit || !file) return;
    setSubmitting(true);
    setError(null);
    const res = await uploadPolicy({
      title: title.trim(),
      category: category || null,
      fileName: file.fileName,
      mimeType: file.mimeType,
      base64: file.base64,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to index the policy document.");
      return;
    }
    reset();
    onUploaded?.();
    onOpenChange(false);
  };

  return (
    <Modal
      size="md"
      open={open}
      onOpenChange={onOpenChange}
      title="Upload a policy document"
      description="PDF, TXT or DOCX. Text is extracted, chunked, and made available to the reasoning agent."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting || !canSubmit} onClick={submit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {submitting ? "Indexing…" : "Index policy"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBanner error={error} />}

        <div className="space-y-2">
          <Label htmlFor="policy-title">Policy title</Label>
          <Input
            id="policy-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Remote Work Policy"
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Optional — category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Source document</Label>
          <Input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          {file && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {file.fileName}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}