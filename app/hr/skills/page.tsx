import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { SkillGraphWorkspace } from "@/components/hr/skills/skill-graph-workspace";
import { fetchSkillGraphData } from "@/lib/hr/skills";

export const metadata: Metadata = { title: "Skills" };

const EMPTY_GRAPH = {
  totalSkills: 0,
  activeCount: 0,
  coveredHeadcount: 0,
  requiredHeadcount: 0,
  coverage_pct: 0,
  topGap: 0,
  rows: [],
  topGaps: [],
};

export default async function SkillsPage() {
  const graph = await fetchSkillGraphData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        description="Employees → Skills → Roles → Business requirements: interactive skill graph with AI-identified coverage gaps and upskilling recommendations."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <SkillGraphWorkspace initialGraph={graph ?? EMPTY_GRAPH} />
    </div>
  );
}
