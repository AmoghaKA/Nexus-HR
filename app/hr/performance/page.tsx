import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Performance" };

export default function PerformancePage() {
  return (
    <FeaturePlaceholder
      title="Performance"
      description="Review cycles, continuous feedback, and calibration across teams."
      highlights={[
        "Review cycles with self, peer, and manager inputs",
        "Quarterly calibration and rating distributions",
        "Continuous feedback pulse and sentiment trends",
        "AI summary drafting for review documents",
      ]}
    />
  );
}