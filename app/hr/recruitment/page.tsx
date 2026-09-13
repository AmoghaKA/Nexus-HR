import { Suspense } from "react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RecruitmentWorkspace } from "@/components/hr/recruitment/recruitment-workspace";
import { fetchRecruitmentData } from "@/lib/hr/recruitment";

export const metadata: Metadata = { title: "Recruitment" };

export const dynamic = "force-dynamic";

export default async function RecruitmentPage() {
  // Data is fetched server-side so the first paint is instantly interactive —
  // the workspace keeps a local copy and refreshes it after every mutation.
  const data = await fetchRecruitmentData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        description="Jobs, an applicant pipeline, and AI-powered resume analysis, role-fit scoring and comparison."
        badge={<Badge variant="secondary">AI-powered</Badge>}
      />
      <Suspense
        fallback={<EmptyState title="Loading recruitment workspace…" description="Pulling jobs, candidates and assessments." />}
      >
        <RecruitmentWorkspace initialData={data} />
      </Suspense>
    </div>
  );
}