import type { Metadata } from "next";

import { fetchMyPerformance } from "@/lib/employee/data";

import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PerformanceTrendChart } from "@/components/employee/charts/performance-trend-chart";
import { ReviewHistory } from "@/components/employee/panels/review-history";
import { FeedbackList } from "@/components/employee/panels/feedback-list";
import { AttendanceSummary } from "@/components/employee/panels/attendance-summary";
import { PerformanceCoachPanel } from "@/components/employee/performance/performance-coach-panel";
import { SignInNotice } from "@/components/employee/sign-in-notice";

export const metadata: Metadata = { title: "My Performance" };
export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const data = await fetchMyPerformance();
  if (!data) return <SignInNotice />;

  const trend = data.reviews
    .filter((r) => r.rating != null)
    .sort((a, b) => String(a.periodEnd).localeCompare(String(b.periodEnd)))
    .map((r) => ({
      month: monthLabel(r.periodEnd),
      value: r.rating as number,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Performance"
        description="Review history, feedback, attendance, and your personal AI performance coach."
        badge={<Badge variant="outline">Live data</Badge>}
      />

      <section className="sr-fade sr-fade-d1 space-y-4">
        <SectionHeading title="Performance Trend" />
        <ChartCard title="Rating over time" description="Your ratings across review cycles">
          {trend.length > 0 ? (
            <PerformanceTrendChart data={trend} />
          ) : (
            <EmptyState
              title="No reviews yet"
              description="Your rating trend will appear here after the first review."
            />
          )}
        </ChartCard>
      </section>

      <section className="sr-fade sr-fade-d2 space-y-4">
        <SectionHeading title="AI Performance Coach" />
        <Card className="p-5">
          <PerformanceCoachPanel />
        </Card>
      </section>

      <section className="sr-fade sr-fade-d3 space-y-4">
        <SectionHeading title="Review History" />
        <ReviewHistory reviews={data.reviews} />
      </section>

      <section className="sr-fade sr-fade-d4 space-y-4">
        <SectionHeading title="Feedback" />
        <FeedbackList feedback={data.feedback} />
      </section>

      <section className="sr-fade sr-fade-d5 space-y-4">
        <SectionHeading title="Attendance" />
        <Card className="p-5">
          <AttendanceSummary rate={data.attendanceRate} recent={data.recentAttendance} />
        </Card>
      </section>
    </div>
  );
}

function monthLabel(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}