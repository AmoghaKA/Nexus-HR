import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  attritionByDepartment,
  attritionTrend,
  departmentComposition,
  highRiskEmployees,
  hrStats,
  onboardingProgress,
  recruitmentPipeline,
  skillGaps,
  workforceBriefing,
  workforceTrend,
} from "@/lib/data/hr";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { AIInsightCard } from "@/components/shared/ai-insight-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { WorkforceTrendChart } from "@/components/hr/charts/workforce-trend-chart";
import { DepartmentCompositionChart } from "@/components/hr/charts/department-composition-chart";
import { AttritionChart } from "@/components/hr/charts/attrition-chart";
import { AttritionTrendChart } from "@/components/hr/charts/attrition-trend-chart";
import { SkillGapChart } from "@/components/hr/charts/skill-gap-chart";
import { RecruitmentPipeline } from "@/components/hr/panels/recruitment-pipeline";
import { OnboardingProgress } from "@/components/hr/panels/onboarding-progress";
import { HighRiskEmployees } from "@/components/hr/panels/high-risk-employees";

export default function HRDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="A live pulse of your workforce, surfaced by WorkforceIQ."
        badge={<Badge variant="secondary">Demo data</Badge>}
        actions={
          <Button asChild variant="outline">
            <Link href="/hr/reports">
              View reports
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="space-y-4">
        <SectionHeading title="Workforce Overview" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {hrStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="Headcount trend"
            description="12-month workforce growth"
            className="lg:col-span-2"
          >
            <WorkforceTrendChart data={workforceTrend} />
          </ChartCard>
          <ChartCard
            title="Department composition"
            description="People by team"
          >
            <DepartmentCompositionChart data={departmentComposition} />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="AI Workforce Briefing" />
        <AIInsightCard
          insight={workforceBriefing}
          action={
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 self-start sm:self-auto"
            >
              <Link href="/hr/attrition">Review high-risk employees</Link>
            </Button>
          }
        />
      </section>

      <section className="space-y-4">
        <SectionHeading title="Attrition Risk" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="At-risk employees by department"
            description="Count of employees flagged above risk threshold"
            className="lg:col-span-2"
          >
            <AttritionChart data={attritionByDepartment} />
          </ChartCard>
          <ChartCard
            title="Attrition rate trend"
            description="Rolling monthly attrition rate"
          >
            <AttritionTrendChart data={attritionTrend} />
          </ChartCard>
        </div>
        <HighRiskEmployees employees={highRiskEmployees} />
      </section>

      <section className="space-y-4">
        <SectionHeading title="Recruitment Pipeline" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="Open roles funnel"
            description="Candidates by pipeline stage"
          >
            <RecruitmentPipeline stages={recruitmentPipeline} />
          </ChartCard>
          <ChartCard
            title="Team skill gaps"
            description="Coverage gaps in critical skills"
            className="lg:col-span-2"
          >
            <div className="grid items-center gap-6 sm:grid-cols-2 lg:grid-cols-[3fr_2fr]">
              <SkillGapChart data={skillGaps} />
              <ul className="space-y-3">
                {skillGaps.map((gap) => (
                  <li
                    key={gap.skill}
                    className="flex items-start gap-2.5 rounded-lg border p-3"
                  >
                    <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning" />
                    <div>
                      <p className="text-sm font-medium">{gap.skill}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {gap.suggestedAction}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Onboarding Progress" />
        <ChartCard
          title="Recent hires"
          description="Progress through the first-month onboarding checklist"
        >
          <OnboardingProgress items={onboardingProgress} />
        </ChartCard>
      </section>
    </div>
  );
}