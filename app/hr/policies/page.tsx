import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Policies" };

export default function PoliciesPage() {
  return (
    <FeaturePlaceholder
      title="Policies"
      description="Versioned company policies with publishing and acknowledgement."
      highlights={[
        "Policy library with version history and approval flow",
        "Targeted publishing to teams and regions",
        "Acknowledgement tracking and reminders",
        "AI question-answering over policy documents",
      ]}
    />
  );
}