import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import {
  employeeBrief,
  employeeStats,
  learningRecommendations,
  myGoals,
  myOnboarding,
  performanceTrend,
  policyTopics,
  skillLevels,
  upcomingTasks,
} from "@/lib/data/employee";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { AIInsightCard } from "@/components/shared/ai-insight-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { PerformanceTrendChart } from "@/components/employee/charts/performance-trend-chart";
import { SkillsRadarChart } from "@/components/employee/charts/skills-radar-chart";
import { GoalList } from "@/components/employee/panels/goal-list";
import { LearningList } from "@/components/employee/panels/learning-list";
import { UpcomingTasks } from "@/components/employee/panels/upcoming-tasks";
import { OnboardingProgress } from "@/components/hr/panels/onboarding-progress";

export default function EmployeeDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Your personal view across goals, performance, skills, and growth."
        badge={<Badge variant="secondary">Demo data</Badge>}
        actions={
          <Button asChild variant="outline">
            <Link href="/employee/goals">
              Manage goals
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="space-y-4">
        <SectionHeading title="Your AI Workforce Brief" />
        <AIInsightCard
          insight={employeeBrief}
          tone="employee"
          action={
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 self-start sm:self-auto"
            >
              <Link href="/employee/learning">Start the learning path</Link>
            </Button>
          }
        />
      </section>

      <section className="space-y-4">
        <SectionHeading title="Snapshot" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {employeeStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Goals · Performance" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="My Goals"
            description="Quarterly objectives and their current progress"
          >
            <GoalList goals={myGoals} />
          </ChartCard>
          <ChartCard
            title="My Performance"
            description="Rolling performance trend across review cycles"
          >
            <PerformanceTrendChart data={performanceTrend} />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Skills · Learning" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="My Skills"
            description="Verified proficiency across core competencies"
          >
            <SkillsRadarChart data={skillLevels} />
          </ChartCard>
          <ChartCard
            title="Learning Recommendations"
            description="Suggested by your goals and skill gaps"
          >
            <LearningList items={learningRecommendations} />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Focus for the Week" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Upcoming Tasks" description="Deadlines that need you">
            <UpcomingTasks tasks={upcomingTasks} />
          </ChartCard>
          <ChartCard
            title="Onboarding Progress"
            description="Steps remaining in your ramp-up plan"
          >
            <OnboardingProgress items={myOnboarding} showStart={false} />
          </ChartCard>
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                HR Policy Assistant
                <span className="inline-flex items-center gap-1 rounded-full bg-info/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Ask AI
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ask questions about any company policy in plain language. This
                assistant will be enabled when the Gemini integration ships.
              </p>
              <ul className="mt-4 space-y-2 border-t pt-3">
                {policyTopics.slice(0, 3).map((topic) => (
                  <li key={topic.id}>
                    <Link
                      href="/employee/policies"
                      className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="font-medium group-hover:text-accent-foreground">
                        {topic.title}
                      </span>
                      <ArrowRight
                        className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent-foreground"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}