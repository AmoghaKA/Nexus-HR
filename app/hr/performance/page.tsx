import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { PerformanceAnalysis } from "@/components/hr/performance-analysis";

export const metadata: Metadata = { title: "Performance" };

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="Review cycles, continuous feedback, and AI-summarized organizational performance."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <PerformanceAnalysis />
    </div>
  );
}