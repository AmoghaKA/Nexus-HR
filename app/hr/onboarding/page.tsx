import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { OnboardingWorkspace } from "@/components/hr/onboarding/onboarding-workspace";
import { fetchOnboardingOverview } from "@/lib/hr/onboarding";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const overview = await fetchOnboardingOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        description="AI-generated personalized ramp-up plans that get new hires productive fast."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <OnboardingWorkspace initialEmployees={overview ?? []} />
    </div>
  );
}