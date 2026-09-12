import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "My Performance" };

export default function PerformancePage() {
  return (
    <FeaturePlaceholder
      title="My Performance"
      description="Your review history, feedback, and performance trend over time."
      highlights={[
        "Review documents across all completed cycles",
        "Feedback received and growth themes",
        "Self-reflection templates",
        "AI review summaries and development suggestions",
      ]}
    />
  );
}