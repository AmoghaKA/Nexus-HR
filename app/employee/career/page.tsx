import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Career Path" };

export default function CareerPage() {
  return (
    <FeaturePlaceholder
      title="Career Path"
      description="See where you can grow and what it takes to get there."
      highlights={[
        "Role levels and competency frameworks",
        "Personalized career paths from your profile",
        "Skills and experiences required at each step",
        "AI career coaching based on your trajectory",
      ]}
    />
  );
}