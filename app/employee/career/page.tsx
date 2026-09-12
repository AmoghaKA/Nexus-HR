import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { CareerPlan } from "@/components/employee/career-plan";

export const metadata: Metadata = { title: "Career Path" };

export default function CareerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Path"
        description="Personalized career paths from your profile — AI-recommended next roles and the steps to get there."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <CareerPlan />
    </div>
  );
}