import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "My Skills" };

export default function SkillsPage() {
  return (
    <FeaturePlaceholder
      title="My Skills"
      description="Your verified skills, proficiency levels, and growth areas."
      highlights={[
        "Skill profile with proficiency self-assessments",
        "Manager and peer verification workflow",
        "Growth areas surfaced from your skill gaps",
        "AI recommendations for the next skill to build",
      ]}
    />
  );
}