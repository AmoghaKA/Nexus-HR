import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Learning" };

export default function LearningPage() {
  return (
    <FeaturePlaceholder
      title="Learning"
      description="Courses, books, and paths tailored to your goals and career direction."
      highlights={[
        "Curated catalog with pickups across providers",
        "AI-matched recommendations from your skills and goals",
        "Learning paths with progress tracking",
        "Claim and track your L&D budget",
      ]}
    />
  );
}