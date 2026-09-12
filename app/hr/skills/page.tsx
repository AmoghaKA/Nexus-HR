import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Skills" };

export default function SkillsPage() {
  return (
    <FeaturePlaceholder
      title="Skills"
      description="The company skill taxonomy, coverage, and gap analysis."
      highlights={[
        "Skill catalog with proficiency levels and verification",
        "Organization-wide coverage heatmaps",
        "Gap analysis mapped to growth plans and hiring",
        "AI-suggested upskilling tracks per team",
      ]}
    />
  );
}