import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { PerformanceAnalysis } from "@/components/hr/performance-analysis";

export const metadata: Metadata = { title: "Performance Intelligence" };

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Intelligence"
        description="Average performance, trends, goal completion, top performers, and support needs — with AI analysis that recommends actions to HR."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <PerformanceAnalysis />
    </div>
  );
}