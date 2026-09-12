import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { AttritionAnalysis } from "@/components/hr/attrition-analysis";

export const metadata: Metadata = { title: "Attrition" };

export default function AttritionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attrition"
        description="Predictive attrition risk scoring with explainable drivers and AI-recommended interventions."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <AttritionAnalysis />
    </div>
  );
}