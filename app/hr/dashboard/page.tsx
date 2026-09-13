import type { Metadata } from "next";
import Link from "next/link";
import { Bot, LayoutDashboard, TrendingDown, TrendingUp } from "lucide-react";

import { computeHrDashboardData } from "@/lib/hr/analytics";
import { buildWorkforceBriefing, computeWorkforceHealthScore } from "@/lib/ai/briefing";
import type { AiInsight } from "@/types";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { AIInsightCard } from "@/components/shared/ai-insight-card";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";

import { HealthScoreCard } from "@/components/hr/panels/health-score-card";
import { CommandCenterActions } from "@/components/hr/command-center-actions";
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

import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Workforce Command Center" };

export const dynamic = "force-dynamic";

const severityDot: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
  info: "bg-muted-foreground",
};

function RiskListItem({ insight, risk }: { insight?: AiInsight; risk?: { name: string; risk: number } }) {
  const tone = insight ? severityDot[insight.severity ?? "info"] : "bg-destructive";
  return (
    <li className="flex items-start gap-2.5 rounded-lg border bg-card/60 p-3">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", tone)} aria-hidden="true" />
      {insight ? (
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{insight.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{insight.summary}</p>
          {insight.recommendedAction && (
            <p className="mt-1 text-xs font-medium text-primary">{insight.recommendedAction}</p>
          )}
        </div>
      ) : (
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{risk?.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Risk score {risk?.risk}</p>
        </div>
      )}
    </li>
  );
}

function OpportunityListItem({ insight }: { insight: AiInsight }) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg border bg-card/60 p-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug">{insight.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{insight.summary}</p>
        {insight.recommendedAction && (
          <p className="mt-1 text-xs font-medium text-primary">{insight.recommendedAction}</p>
        )}
      </div>
    </li>
  );
}

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

  const health = computeWorkforceHealthScore(briefing.package);

  const topRisks = briefing.insights.filter(
    (i) => i.severity === "critical" || i.severity === "high"
  );
  const topOpportunities = briefing.insights.filter((i) => i.severity === "low" || i.severity === "info");

  return (
    <div className="space-y-10">
      <PageHeader
        title="AI Workforce Command Center"
        description="One live pulse of your workforce — health, risks, opportunities and the actions to take."
        badge={
          <Badge variant="secondary">
            <LayoutDashboard className="mr-1 h-3 w-3" aria-hidden="true" />
            Live data
          </Badge>
        }
        actions={<WorkforceBriefButton />}
      />

      <section>
        <div className="grid gap-4 lg:grid-cols-3">
          <HealthScoreCard score={health} />
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            <ChartCard
              title="Top Risks"
              description="Highest-severity signals flagged by the AI briefing"
            >
              {topRisks.length > 0 ? (
                <ul className="space-y-2.5">
                  {topRisks.slice(0, 4).map((insight) => (
                    <RiskListItem key={insight.id} insight={insight} />
                  ))}
                </ul>
              ) : dashboard.highRisk.length > 0 ? (
                <ul className="space-y-2.5">
                  {dashboard.highRisk.slice(0, 4).map((emp) => (
                    <RiskListItem
                      key={emp.id}
                      risk={{ name: emp.name, risk: emp.score }}
                    />
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                  <TrendingDown className="h-4 w-4" aria-hidden="true" />
                  No high-severity signals detected right now.
                </p>
              )}
            </ChartCard>
            <ChartCard
              title="Top Opportunities"
              description="Positive signals worth amplifying"
            >
              {topOpportunities.length > 0 ? (
                <ul className="space-y-2.5">
                  {topOpportunities.slice(0, 4).map((insight) => (
                    <OpportunityListItem key={insight.id} insight={insight} />
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  No standout positive signals this cycle.
                </p>
              )}
            </ChartCard>
          </div>
        </div>
      </section>

      {dashboard.stats.length > 0 && (
        <section className="space-y-4">
          <SectionHeading title="Workforce Overview" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboard.stats.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeading
          title="AI Actions"
          action={
            <Link
              href="/hr/copilot"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              Ask the AI Copilot
            </Link>
          }
        />
        <p className="text-sm text-muted-foreground">
          Generated on demand from live signals and persisted to the insights store. Advisory — review
          before acting.
        </p>
        <CommandCenterActions />
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
        <SectionHeading title="Explainable AI Briefing" />
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