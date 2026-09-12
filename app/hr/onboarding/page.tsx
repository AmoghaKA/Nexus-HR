import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <FeaturePlaceholder
      title="Onboarding"
      description="Structured ramp-up plans that get new hires productive fast."
      highlights={[
        "Configurable onboarding templates per role",
        "Task checklists, owners, and due dates",
        "New-hire progress tracking and nudges",
        "AI-generated personalized ramp-up plans",
      ]}
    />
  );
}