import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { OnboardingPlanRunner } from "@/components/hr/onboarding-plan";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        description="AI-generated personalized ramp-up plans that get new hires productive fast."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <OnboardingPlanRunner />
    </div>
  );
}