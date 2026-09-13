import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { PolicyAssistant } from "@/components/policies/policy-qa";

export const metadata: Metadata = { title: "Policies" };

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        description="Ask questions about company policies and get answers grounded in the published documents."
        badge={<Badge variant="outline">AI assistant</Badge>}
      />
      <PolicyAssistant />
    </div>
  );
}