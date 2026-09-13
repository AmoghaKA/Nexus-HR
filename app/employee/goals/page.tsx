import type { Metadata } from "next";

import { fetchMyGoalsDetail } from "@/lib/employee/data";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { GoalManager } from "@/components/employee/goals/goal-manager";
import { SignInNotice } from "@/components/employee/sign-in-notice";

export const metadata: Metadata = { title: "My Goals" };
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await fetchMyGoalsDetail();
  if (!goals) return <SignInNotice />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Goals"
        description="Track progress, log achievements, and let AI help you sharpen objectives."
        badge={<Badge variant="outline">Live data</Badge>}
      />
      <GoalManager goals={goals} />
    </div>
  );
}