import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Policies" };

export default function PoliciesPage() {
  return (
    <FeaturePlaceholder
      title="Policies"
      description="Company policies that apply to you, in plain language."
      highlights={[
        "Policy library filtered to your role and region",
        "Acknowledgement tracking for new policies",
        "Plain-language summaries for every document",
        "AI assistant for policy questions",
      ]}
    />
  );
}