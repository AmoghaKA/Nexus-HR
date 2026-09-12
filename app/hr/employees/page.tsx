import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  return (
    <FeaturePlaceholder
      title="Employees"
      description="The organization directory with rich profiles, teams, and history."
      highlights={[
        "Searchable employee directory with advanced filters",
        "Rich profiles: role, team, skills, goals, and reviews",
        "Manager and reporting-line org explorer",
        "Lifecycle timeline from hire to offboarding",
      ]}
    />
  );
}