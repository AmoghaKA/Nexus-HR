import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { RecruitmentAnalysis } from "@/components/hr/recruitment-analysis";

export const metadata: Metadata = { title: "Recruitment" };

export default function RecruitmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        description="AI-assisted role-fit scoring, question sets, and consolidated interview evaluations."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <RecruitmentAnalysis />
    </div>
  );
}