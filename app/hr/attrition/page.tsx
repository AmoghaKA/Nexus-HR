import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { AttritionAnalysis } from "@/components/hr/attrition-analysis";

export const metadata: Metadata = { title: "Attrition Intelligence" };

export default function AttritionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attrition Intelligence"
        description="Explainable AI Risk Estimates from deterministic workforce signals — attendance, leave, goals, performance, feedback, tenure, training, and engagement."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <AttritionAnalysis />
    </div>
  );
}