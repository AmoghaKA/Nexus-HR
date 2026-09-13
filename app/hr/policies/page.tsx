import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PolicyLibrary } from "@/components/hr/policies/policy-library";
import { PolicyAssistant } from "@/components/policies/policy-qa";
import { listPolicies } from "@/lib/policies/actions";

export const metadata: Metadata = { title: "Policies" };

export default async function PoliciesPage() {
  const res = await listPolicies();
  const policies = res.ok ? res.policies : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        description="Upload policy documents (PDF, TXT, DOCX). The policy reasoning agent answers HR and employee questions only from the indexed documents."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <PolicyLibrary policies={policies} />
      <section className="space-y-3">
        <SectionHeading title="Test the reasoning agent" />
        <Card>
          <CardContent className="pt-6">
            <PolicyAssistant />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}