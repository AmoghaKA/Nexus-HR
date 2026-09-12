import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Workforce" };

export default function WorkforcePage() {
  return (
    <FeaturePlaceholder
      title="Workforce"
      description="Headcount planning, org structure, and workforce modeling."
      highlights={[
        "Interactive org chart with headcount by role",
        "Hiring plans and budget scenarios",
        "Demand forecasting with capacity gap warnings",
        "AI-assisted scenario modeling for org changes",
      ]}
    />
  );
}