import type { Metadata } from "next";

import { fetchMySkills } from "@/lib/employee/data";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SkillsTable, type SkillRow } from "@/components/employee/panels/skills-table";
import { SkillPlanPanel } from "@/components/employee/skills/skill-plan-panel";
import { SignInNotice } from "@/components/employee/sign-in-notice";

export const metadata: Metadata = { title: "My Skills" };
export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const data = await fetchMySkills();
  if (!data) return <SignInNotice />;

  const rows: SkillRow[] = data.skills.map((s) => ({
    name: s.name,
    proficiency: s.proficiency,
    years: s.years,
    verified: s.verified,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Skills"
        description="Your verified skill profile with proficiency levels and growth areas."
        badge={<Badge variant="outline">Live data</Badge>}
      />

      <section className="space-y-4">
        <SectionHeading title="Your skill profile" />
        <Card className="p-4">
          <SkillsTable skills={rows} />
          {rows.length === 0 && (
            <EmptyState
              title="No skills added yet"
              description="Your manager or HR can add skills to your profile."
            />
          )}
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeading title="AI Skill Plan" />
        <Card className="p-5">
          <SkillPlanPanel />
        </Card>
      </section>
    </div>
  );
}