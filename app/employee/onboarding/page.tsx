import type { Metadata } from "next";

import { fetchMyOnboarding } from "@/lib/employee/data";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { OnboardingTasks } from "@/components/employee/onboarding/onboarding-tasks";
import { AdaptiveOnboardingStatus } from "@/components/employee/onboarding/adaptive-status";
import { SignInNotice } from "@/components/employee/sign-in-notice";

export const metadata: Metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const plans = await fetchMyOnboarding();
  if (!plans) return <SignInNotice />;

  const totalTasks = plans.reduce((sum, p) => sum + p.tasks.length, 0);
  const completedTasks = plans.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.status === "completed").length,
    0
  );
  const overallProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        description="Your ramp-up checklist: access, training, and first-project milestones."
        badge={<Badge variant="outline">Live data</Badge>}
      />

      {totalTasks > 0 && (
        <section className="sr-fade sr-fade-d1">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Overall Progress</p>
                <p className="text-xs text-muted-foreground">
                  {completedTasks} of {totalTasks} tasks completed across {plans.length} plan{plans.length !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-2xl font-semibold tracking-tight text-primary">
                {overallProgress}%
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={overallProgress} tone="auto" size="sm" showLabel={false} />
            </div>
          </Card>
        </section>
      )}

      <section className="sr-fade sr-fade-d2">
        <AdaptiveOnboardingStatus />
      </section>

      <section className="sr-fade sr-fade-d3">
        <OnboardingTasks plans={plans} />
      </section>
    </div>
  );
}
