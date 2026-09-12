import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <FeaturePlaceholder
      title="Onboarding"
      description="Your ramp-up checklist: access, training, and first-project milestones."
      highlights={[
        "Step-by-step onboarding checklist with owners",
        "Company and team training modules",
        "Buddy and mentor assignments",
        "AI-generated personalized ramp-up plan",
      ]}
    />
  );
}