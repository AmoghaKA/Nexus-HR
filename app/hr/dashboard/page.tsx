import type { Metadata } from "next";

import { computeHrDashboardData } from "@/lib/hr/analytics";
import { buildWorkforceBriefing } from "@/lib/ai/briefing";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { AIInsightCard } from "@/components/shared/ai-insight-card";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";

import { WorkforceTrendChart } from "@/components/hr/charts/workforce-trend-chart";
import { DepartmentCompositionChart } from "@/components/hr/charts/department-composition-chart";
import { AttendanceTrendChart } from "@/components/hr/charts/attendance-trend-chart";
import { PerformanceTrendChart } from "@/components/hr/charts/performance-trend-chart";
import { GoalTrendChart } from "@/components/hr/charts/goal-trend-chart";
import { RiskDistributionChart } from "@/components/hr/charts/risk-distribution-chart";
import { SkillCoverageChart } from "@/components/hr/charts/skill-coverage-chart";
import { SkillGapChart } from "@/components/hr/charts/skill-gap-chart";
import { RecruitmentPipeline } from "@/components/hr/panels/recruitment-pipeline";
import { OnboardingProgress } from "@/components/hr/panels/onboarding-progress";
import { HighRiskEmployees } from "@/components/hr/panels/high-risk-employees";
import { WorkforceBriefButton } from "@/components/hr/workforce-brief-button";

export const metadata: Metadata = { title: "Dashboard" };

export const dynamic = "force-dynamic";

export default async function HRDashboardPage() {
  let dashboard;
  let briefing;
  try {
    [dashboard, briefing] = await Promise.all([
      computeHrDashboardData(),
      buildWorkforceBriefing(),
    ]);
  } catch (error) {
    return (
      <ErrorState
        title="Couldn't load workforce data"
        message={
          error instanceof Error
            ? error.message
            : "We couldn't reach Supabase to build your dashboard. Please try again."
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="A live pulse of your workforce, computed from your HR data."
        badge={<Badge variant="secondary">Live data</Badge>}
        actions={<WorkforceBriefButton />}
      />

      <section className="space-y-4">
        <SectionHeading title="Workforce Overview" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.stats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Trends" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="Headcount trend"
            description="Active employees per month"
            className="lg:col-span-2"
          >
            <WorkforceTrendChart data={dashboard.headcountTrend} />
          </ChartCard>
          <ChartCard
            title="Attendance trend"
            description="Monthly attendance rate"
          >
            <AttendanceTrendChart data={dashboard.attendanceTrend} />
          </ChartCard>
          <ChartCard
            title="Average performance"
            description="Latest review ratings per month"
          >
            <PerformanceTrendChart data={dashboard.performanceTrend} />
          </ChartCard>
          <ChartCard
            title="Goal completion trend"
            description="On-time goal completion per month"
            className="lg:col-span-2"
          >
            <GoalTrendChart data={dashboard.goalTrend} />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Composition" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="Department distribution"
            description="People by team"
          >
            <DepartmentCompositionChart data={dashboard.departmentDistribution} />
          </ChartCard>
          <ChartCard
            title="Attrition risk distribution"
            description="Employees by latest risk band"
          >
            <RiskDistributionChart data={dashboard.riskDistribution} />
          </ChartCard>
          <ChartCard
            title="Skill coverage"
            description="Coverage of critical skills"
          >
            <SkillCoverageChart coverage={dashboard.skillCoverage} />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="AI Workforce Briefing" />
        {briefing.insights.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {briefing.insights.map((insight) => (
              <AIInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        ) : (
          <AIInsightCard
            insight={{
              id: "brief-healthy",
              title: "Workforce signals look steady",
              summary:
                "No standout negative signals detected across performance, attendance, goals, skills, onboarding, or recruitment.",
              recommendedAction: "Check back after the next review cycle for a refreshed read.",
              confidence: 0.6,
              category: "engagement",
              severity: "low",
              evidence: ["All monitored metrics are within expected ranges"],
            }}
          />
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading title="High Risk Employees" />
        <ChartCard
          title="Flagged for attention"
          description="Latest risk score ≥ 65 across the workforce"
        >
          <HighRiskEmployees employees={dashboard.highRisk} />
        </ChartCard>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Recruitment & Onboarding" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="Open roles funnel"
            description="Candidates by pipeline stage"
          >
            <RecruitmentPipeline stages={dashboard.pipeline} />
          </ChartCard>
          <ChartCard
            title="Team skill gaps"
            description="Coverage gaps in critical skills"
            className="lg:col-span-2"
          >
            <div className="grid items-center gap-6 sm:grid-cols-2">
              <SkillGapChart data={dashboard.skillGaps} />
              <ul className="space-y-3">
                {dashboard.skillGaps.map((gap) => (
                  <li
                    key={gap.skill}
                    className="flex items-start gap-2.5 rounded-lg border p-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning"
                    />
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
          title="Active plans"
          description="Progress through the first-month onboarding checklist"
        >
          <OnboardingProgress items={dashboard.onboarding} />
        </ChartCard>
      </section>
    </div>
  );
}