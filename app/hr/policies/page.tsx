import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { PolicyQA } from "@/components/hr/policy-qa";

export const metadata: Metadata = { title: "Policies" };

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        description="Versioned company policies with AI question-answering grounded in the published documents."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <PolicyQA />
    </div>
  );
}