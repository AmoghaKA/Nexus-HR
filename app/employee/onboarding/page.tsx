import type { Metadata } from "next";

import { fetchMyOnboarding } from "@/lib/employee/data";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { OnboardingTasks } from "@/components/employee/onboarding/onboarding-tasks";
import { SignInNotice } from "@/components/employee/sign-in-notice";

export const metadata: Metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const plans = await fetchMyOnboarding();
  if (!plans) return <SignInNotice />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        description="Your ramp-up checklist: access, training, and first-project milestones."
        badge={<Badge variant="outline">Live data</Badge>}
      />
      <OnboardingTasks plans={plans} />
    </div>
  );
}