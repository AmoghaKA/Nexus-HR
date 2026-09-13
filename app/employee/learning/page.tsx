import type { Metadata } from "next";

import { fetchMyLearning } from "@/lib/employee/data";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrainingStatusList } from "@/components/employee/panels/training-status-list";
import { LearningPlanPanel } from "@/components/employee/learning/learning-plan-panel";
import { SignInNotice } from "@/components/employee/sign-in-notice";

export const metadata: Metadata = { title: "Learning" };
export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const data = await fetchMyLearning();
  if (!data) return <SignInNotice />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning"
        description="Enrolled training, recommended next steps, and your personalized AI learning plan."
        badge={<Badge variant="outline">Live data</Badge>}
      />

      <section className="space-y-4">
        <SectionHeading title="Your training" />
        {data.training.length > 0 ? (
          <TrainingStatusList training={data.training} />
        ) : (
          <EmptyState
            title="Not enrolled yet"
            description="Once your manager assigns a course, it will appear here."
          />
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading title="AI Learning Plan" />
        <Card className="p-5">
          <LearningPlanPanel />
        </Card>
      </section>
    </div>
  );
}