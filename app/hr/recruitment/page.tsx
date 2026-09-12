import type { Metadata } from "next";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Recruitment" };

export default function RecruitmentPage() {
  return (
    <FeaturePlaceholder
      title="Recruitment"
      description="End-to-end candidate pipeline management, sourcing, and offers."
      highlights={[
        "Candidate profiles and pipeline stages per open role",
        "Interview scheduling and feedback capture",
        "Offer management integrated with onboarding",
        "AI-assisted role-fit scoring and bias-checked shortlists",
      ]}
    />
  );
}