import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "AI Copilot" };

export default function CopilotPage() {
  return (
    <FeaturePlaceholder
      title="AI Copilot"
      description="A Gemini-powered assistant that answers workforce questions across all your HR data."
      highlights={[
        "Natural-language questions over employees, attrition, and skills",
        "Meeting-prep briefs for 1:1s and reviews",
        "Policy lookups grounded in company documents",
        "Drafting support for reports, reviews, and job descriptions",
      ]}
    />
  );
}