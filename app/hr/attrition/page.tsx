import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Attrition" };

export default function AttritionPage() {
  return (
    <FeaturePlaceholder
      title="Attrition"
      description="Predictive attrition risk scoring with explainable drivers and interventions."
      highlights={[
        "Per-employee risk scores with driver explanations",
        "Department and segment rollups with alerts",
        "AI-recommended retention interventions",
        "Retention campaigns with outcome tracking",
      ]}
    />
  );
}