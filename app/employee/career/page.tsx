import type { Metadata } from "next";

import { fetchMySkills } from "@/lib/employee/data";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { CareerPlan } from "@/components/employee/career-plan";
import { SignInNotice } from "@/components/employee/sign-in-notice";

export const metadata: Metadata = { title: "Career Path" };
export const dynamic = "force-dynamic";

export default async function CareerPage() {
  const data = await fetchMySkills();
  if (!data) return <SignInNotice />;

  const skills = data.skills.map((s) => s.name);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Path"
        description="Personalized career paths from your profile — AI-recommended next roles, the steps to get there, and your current skill gaps."
        badge={<Badge variant="outline">AI-powered</Badge>}
      />
      <CareerPlan skills={skills} />
    </div>
  );
}