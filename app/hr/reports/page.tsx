import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <FeaturePlaceholder
      title="Reports"
      description="Scheduled and on-demand reports for executives and stakeholders."
      highlights={[
        "Standard catalogs: headcount, turnover, DEI, and engagement",
        "Custom report builder with saved views",
        "Email and Slack delivery schedules",
        "AI narrative summaries attached to exports",
      ]}
    />
  );
}