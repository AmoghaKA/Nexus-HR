import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "My Goals" };

export default function GoalsPage() {
  return (
    <FeaturePlaceholder
      title="My Goals"
      description="Objectives for the current cycle with progress updates and OKR alignment."
      highlights={[
        "Create, update, and close personal goals",
        "Link goals to team and company objectives",
        "Progress check-ins visible to your manager",
        "AI assistance in drafting measurable goals",
      ]}
    />
  );
}