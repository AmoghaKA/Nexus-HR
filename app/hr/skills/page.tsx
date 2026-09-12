import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { SkillsAnalysis } from "@/components/hr/skills-analysis";

export const metadata: Metadata = { title: "Skills" };

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        description="Company skill taxonomy, coverage, and AI-identified gaps mapped to upskilling tracks."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <SkillsAnalysis />
    </div>
  );
}