"use client";

import { useState } from "react";
import { FileSearch, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import type { PolicyIndexRow } from "@/lib/policies/actions";
import { deletePolicy, getPolicySourceUrl } from "@/lib/policies/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBanner } from "@/components/hr/ai-shared";
import { PolicyUploadDialog } from "@/components/hr/policies/policy-upload-dialog";

interface PolicyLibraryProps {
  policies: PolicyIndexRow[];
}

const CATEGORY_LABELS: Record<string, string> = {
  hr: "HR & People",
  finance: "Finance",
  it: "IT",
  security: "Security",
  conduct: "Code of Conduct",
};

function categoryVariant(category: string | null): "default" | "secondary" | "success" | "warning" | "danger" | "outline" {
  switch (category) {
    case "hr":
      return "default";
    case "finance":
      return "success";
    case "it":
      return "secondary";
    case "security":
      return "warning";
    case "conduct":
      return "danger";
    default:
      return "outline";
  }
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  const label = CATEGORY_LABELS[category] ?? category;
  return <Badge variant={categoryVariant(category)}>{label}</Badge>;
}

export function PolicyLibrary({ policies }: PolicyLibraryProps) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sourceToOpen, setSourceToOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openSource = async (policyId: string) => {
    if (sourceToOpen || deletingId) return;
    setSourceToOpen(policyId);
    setError(null);
    try {
      const res = await getPolicySourceUrl(policyId);
      if (res.ok) {
        window.open(res.url, "_blank", "noopener");
      } else {
        setError(res.error ?? "Could not open the source document.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the source document.");
    } finally {
      setSourceToOpen(null);
    }
  };

  const remove = async (policyId: string) => {
    if (deletingId) return;
    setDeletingId(policyId);
    setError(null);
    const res = await deletePolicy(policyId);
    setDeletingId(null);
    if (!res.ok) {
      setError(res.error ?? "Failed to delete the policy.");
      return;
    }
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Policy library</CardTitle>
            <CardDescription>
              Uploaded & indexed policy documents. Questions are answered only from these documents.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" />
            Upload policy
          </Button>
        </CardHeader>

        {error && (
          <div className="px-6 pb-2">
            <ErrorBanner error={error} />
          </div>
        )}

        {policies.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No indexed policies yet"
            description="Upload your first policy document (PDF, TXT or DOCX) to make it available to the assistant."
            action={
              <Button variant="secondary" size="sm" onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4" />
                Upload policy
              </Button>
            }
          />
        ) : (
          <CardContent className="overflow-x-auto px-6 pb-6">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-3 font-medium">Document</th>
                  <th className="px-2 py-3 font-medium">Version</th>
                  <th className="px-2 py-3 font-medium">Chunks</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Updated</th>
                  <th className="px-2 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => {
                  const busy = deletingId === policy.id;
                  return (
                    <tr key={policy.id} className="border-b last:border-b-0">
                      <td className="px-2 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium">{policy.title}</span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{policy.fileName ?? "Seeded document"}</span>
                            <CategoryBadge category={policy.category} />
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-muted-foreground">v{policy.version}</td>
                      <td className="whitespace-nowrap px-2 py-3">
                        {policy.chunkCount > 0 ? (
                          <span className="text-xs text-muted-foreground">{policy.chunkCount} sections</span>
                        ) : (
                          <Badge variant="outline">not chunked</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">
                        <Badge variant="outline">{policy.status}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-muted-foreground">
                        {new Date(policy.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy || !policy.filePath || sourceToOpen === policy.id}
                            onClick={() => openSource(policy.id)}
                            aria-label="View source"
                          >
                            {sourceToOpen === policy.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileSearch className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy || !!sourceToOpen}
                            onClick={() => remove(policy.id)}
                            className="text-destructive hover:text-destructive"
                            aria-label="Delete policy"
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>

      <PolicyUploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploaded={() => router.refresh()}
      />
    </>
  );
}