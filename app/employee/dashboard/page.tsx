import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fetchMyDashboard } from "@/lib/employee/data";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { PerformanceTrendChart } from "@/components/employee/charts/performance-trend-chart";
import { SkillsRadarChart } from "@/components/employee/charts/skills-radar-chart";
import { GoalList } from "@/components/employee/panels/goal-list";
import { LearningList } from "@/components/employee/panels/learning-list";
import { UpcomingTasks } from "@/components/employee/panels/upcoming-tasks";
import { AttendanceSummary } from "@/components/employee/panels/attendance-summary";
import { OnboardingProgress } from "@/components/hr/panels/onboarding-progress";
import { BriefPanel } from "@/components/employee/brief-panel";
import { SignInNotice } from "@/components/employee/sign-in-notice";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function EmployeeDashboardPage() {
  const dashboard = await fetchMyDashboard();
  if (!dashboard) return <SignInNotice />;

  const firstName = dash(dashboard.employee.name).split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${firstName}. Your personal view across goals, performance, skills, and growth.`}
        badge={<Badge variant="outline">Live data</Badge>}
        actions={
          <Button asChild variant="outline">
            <Link href="/employee/goals">
              Manage goals
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="sr-fade sr-fade-d1 space-y-4">
        <SectionHeading title="Your AI Workforce Brief" />
        <BriefPanel />
      </section>

      <section className="sr-fade sr-fade-d2 space-y-4">
        <SectionHeading title="Snapshot" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.stats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>
      </section>

      <section className="sr-fade sr-fade-d3 space-y-4">
        <SectionHeading title="Goals · Performance" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="My Goals" description="Overdue and upcoming goals with current progress">
            {dashboard.goals.length > 0 ? (
              <GoalList goals={dashboard.goals} />
            ) : (
              <EmptyState
                title="No goals yet"
                description="Create your first goal to start tracking progress."
                action={
                  <Button asChild size="sm">
                    <Link href="/employee/goals">Create a goal</Link>
                  </Button>
                }
              />
            )}
          </ChartCard>
          <ChartCard title="My Performance" description="Rating trend across review cycles">
            {dashboard.performanceTrend.length > 0 ? (
              <PerformanceTrendChart data={dashboard.performanceTrend} />
            ) : (
              <EmptyState
                title="No reviews yet"
                description="Your performance history will appear here after the first review cycle."
              />
            )}
          </ChartCard>
        </div>
      </section>

      <section className="sr-fade sr-fade-d4 space-y-4">
        <SectionHeading title="Skills · Learning" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="My Skills" description="Proficiency across your skill profile">
            {dashboard.skillLevels.length > 0 ? (
              <SkillsRadarChart data={dashboard.skillLevels} />
            ) : (
              <EmptyState
                title="No skills yet"
                description="Your manager can add skills to your profile."
              />
            )}
          </ChartCard>
          <ChartCard
            title="Learning Recommendations"
            description="Enrolled courses and suggested next steps"
          >
            {dashboard.learningItems.length > 0 ? (
              <LearningList items={dashboard.learningItems} />
            ) : (
              <EmptyState
                title="No recommendations yet"
                description="Ask the AI learning planner to suggest courses for your goals."
              />
            )}
          </ChartCard>
        </div>
      </section>

      <section className="sr-fade sr-fade-d5 space-y-4">
        <SectionHeading title="Focus for the Week" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Upcoming Tasks" description="Deadlines that need you">
            {dashboard.upcomingTasks.length > 0 ? (
              <UpcomingTasks tasks={dashboard.upcomingTasks} />
            ) : (
              <EmptyState title="All clear" description="Nothing due in the next 30 days." />
            )}
          </ChartCard>
          <ChartCard title="Onboarding Progress" description="Steps remaining in your ramp-up plan">
            {dashboard.onboardingItems.length > 0 ? (
              <OnboardingProgress items={dashboard.onboardingItems} showStart={false} />
            ) : (
              <EmptyState title="All onboarded" description="No active onboarding plans." />
            )}
          </ChartCard>
          <ChartCard title="Attendance" description="Recent presence and attendance rate">
            <AttendanceSummary
              rate={dashboard.attendanceRate}
              recent={dashboard.recentAttendance}
            />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}

function dash(value: string): string {
  return value === "Unknown" || !value.trim() ? "" : value;
}