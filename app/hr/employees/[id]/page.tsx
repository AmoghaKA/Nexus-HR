import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Mail, MapPin } from "lucide-react";

import { fetchEmployeeDetail } from "@/lib/hr/directory";
import { PageHeader } from "@/components/shared/page-header";
import { ChartCard } from "@/components/shared/chart-card";
import { RiskBadge } from "@/components/shared/risk-badge";
import { ProgressBar } from "@/components/shared/progress-bar";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmployeeAnalysisDialog } from "@/components/hr/employee-analysis-dialog";

export const metadata: Metadata = { title: "Employee profile" };

interface PageProps {
  params: Promise<{ id: string }>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusTone(status: string) {
  switch (status) {
    case "probation":
      return { label: "Probation", variant: "warning" as const };
    case "on_leave":
      return { label: "On leave", variant: "secondary" as const };
    case "terminated":
    case "resigned":
      return { label: "Former", variant: "outline" as const };
    default:
      return { label: "Active", variant: "success" as const };
  }
}

const statusClass: Record<string, string> = {
  completed: "text-success",
  active: "text-primary",
  in_progress: "text-primary",
  pending: "text-muted-foreground",
  not_started: "text-muted-foreground",
  draft: "text-muted-foreground",
};

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;

  let emp;
  try {
    emp = await fetchEmployeeDetail(id);
  } catch (error) {
    return (
      <ErrorState
        title="Couldn't load this employee"
        message={
          error instanceof Error
            ? error.message
            : "We couldn't reach Supabase to load this profile. Please try again."
        }
      />
    );
  }

  if (!emp) {
    return (
      <ErrorState
        title="Employee not found"
        message="No employee exists at this address. Check the directory for the correct person."
      />
    );
  }

  const tone = statusTone(emp.status);
  const recentLateAbsent = emp.recentAttendance.filter((a) =>
    ["lat", "absent", "late"].includes(a.status)
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="-mb-1">
          <Link href="/hr/employees">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to directory
          </Link>
        </Button>
        <PageHeader
          title={emp.name}
          description={`${emp.role} · ${emp.department}`}
          badge={
            <span className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(emp.name)}</AvatarFallback>
              </Avatar>
              <Badge variant={tone.variant}>{tone.label}</Badge>
            </span>
          }
          actions={<EmployeeAnalysisDialog employeeId={emp.id} employeeName={emp.name} />}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Profile" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <Row label="Email" value={emp.email} icon={Mail} />
            <Row label="Employee code" value={emp.employeeCode} />
            <Row label="Department" value={emp.department} />
            <Row label="Role" value={emp.role} />
            <Row label="Manager" value={emp.manager ? `${emp.manager.name} (${emp.manager.role || "Manager"})` : "—"} />
            <Row label="Location" value={emp.location ?? "—"} icon={MapPin} />
            <Row label="Joined" value={emp.joined ?? "—"} icon={CalendarDays} />
            <Row label="Experience" value={emp.experienceYears != null ? `${emp.experienceYears} years` : "—"} />
            {emp.salaryBand && <Row label="Salary band" value={emp.salaryBand} />}
          </dl>
        </ChartCard>

        <ChartCard title="Performance & Risk" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Latest review" value={emp.reviews[0]?.rating != null ? `${emp.reviews[0].rating} / 5` : "—"} />
            <Metric label="Attendance (60d)" value={emp.attendanceRate != null ? `${emp.attendanceRate}%` : "—"} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Attrition risk
              </p>
              <div className="mt-1">
                {emp.latestRisk ? (
                  <RiskBadge level={emp.latestRisk.level} score={emp.latestRisk.score} />
                ) : (
                  <span className="text-sm text-muted-foreground">Not scored</span>
                )}
              </div>
            </div>
          </div>

          {emp.riskHistory.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Risk score history
              </p>
              <div className="flex flex-wrap gap-2">
                {emp.riskHistory.map((r) => (
                  <span
                    key={r.period}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {new Date(r.period).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    <span className="font-semibold text-card-foreground">
                      {r.score ?? "—"}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {emp.reviews.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Review history
              </p>
              {emp.reviews.map((review) => (
                <div key={review.id} className="rounded-lg border bg-card/60 p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{review.type ?? "Review"}</span>
                    <span className="text-muted-foreground">
                      {review.rating != null ? `${review.rating} / 5` : "Not rated"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {review.periodEnd ?? "Unscored period"} · {review.status}
                  </p>
                  {review.strengths && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-card-foreground">Strengths: </span>
                      {review.strengths}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Skills" description={`${emp.skills.length} recorded`}>
          {emp.skills.length > 0 ? (
            <ul className="space-y-2.5">
              {emp.skills.map((skill) => (
                <li
                  key={skill.name}
                  className="flex items-baseline justify-between gap-2 rounded-lg border bg-card/60 px-3 py-2"
                >
                  <span className="text-sm font-medium">{skill.name}</span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {skill.proficiency ?? "—"}
                    {skill.verified && " · verified"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No skills" description="No skills are recorded yet for this employee." />
          )}
        </ChartCard>

        <ChartCard title="Goals" description={`${emp.goals.length} total`} className="lg:col-span-2">
          {emp.goals.length > 0 ? (
            <div className="space-y-4">
              {emp.goals.map((goal) => (
                <div key={goal.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{goal.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {goal.dueDate ? `Due ${goal.dueDate}` : goal.status}
                    </span>
                  </div>
                  <ProgressBar value={goal.progress} size="sm" tone={goal.status === "completed" ? "success" : goal.progress >= 50 ? "primary" : "warning"} />
                  <p className={`mt-1 text-xs capitalize ${statusClass[goal.status] ?? "text-muted-foreground"}`}>
                    {goal.status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No goals" description="No goals are recorded for this employee." />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Attendance"
          description={`${emp.attendanceRate != null ? `${emp.attendanceRate}%` : "—"} rate over the last 60 days`}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent days
          </p>
          {emp.recentAttendance.length > 0 ? (
            <ul className="space-y-1.5">
              {emp.recentAttendance.map((a) => (
                <li
                  key={a.date}
                  className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-1.5 text-xs"
                >
                  <span className="text-muted-foreground">{a.date}</span>
                  <span className={`font-medium capitalize ${a.status === "absent" ? "text-destructive" : a.status === "late" ? "text-warning" : "text-muted-foreground"}`}>
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No attendance" description="No attendance records found." />
          )}
          {recentLateAbsent > 0 && (
            <p className="mt-3 text-xs text-warning">
              {recentLateAbsent} late/absent day{recentLateAbsent > 1 ? "s" : ""} in the last 14.
            </p>
          )}
        </ChartCard>

        <ChartCard title="Feedback" description={`${emp.feedback.length} records`} className="lg:col-span-2">
          {emp.feedback.length > 0 ? (
            <div className="space-y-3">
              {emp.feedback.map((f) => (
                <div key={f.id} className="rounded-lg border bg-card/60 p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2">
                      <Badge variant={f.category === "praise" ? "success" : "outline"} className="capitalize">
                        {f.category ?? "feedback"}
                      </Badge>
                      <span className="font-medium">{f.fromName}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No feedback" description="No feedback has been shared with this employee." />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Training" description={`${emp.training.length} enrollments`}>
          {emp.training.length > 0 ? (
            <ul className="space-y-2.5">
              {emp.training.map((t) => (
                <li key={t.id} className="rounded-lg border bg-card/60 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{t.title}</span>
                    <span className={`text-xs font-medium capitalize ${statusClass[t.status] ?? "text-muted-foreground"}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  {t.completedAt && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Completed {new Date(t.completedAt).toLocaleDateString()}
                      {t.score != null ? ` · score ${t.score}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No training" description="This employee has no training enrollments yet." />
          )}
        </ChartCard>

        <ChartCard title="Onboarding" description={`${emp.onboarding.length} plan${emp.onboarding.length === 1 ? "" : "s"}`}>
          {emp.onboarding.length > 0 ? (
            <div className="space-y-4">
              {emp.onboarding.map((plan) => (
                <div key={plan.id} className="rounded-lg border bg-card/60 p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{plan.title}</span>
                    <span className={`text-xs capitalize ${statusClass[plan.status] ?? "text-muted-foreground"}`}>
                      {plan.status.replace("_", " ")}
                    </span>
                  </div>
                  {plan.tasks.length > 0 ? (
                    <ul className="mt-2.5 space-y-1">
                      {plan.tasks.map((task) => (
                        <li key={task.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">{task.title}</span>
                          <span className={`font-medium capitalize ${statusClass[task.status] ?? "text-muted-foreground"}`}>
                            {task.status.replace("_", " ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No tasks on this plan.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No onboarding" description="No active onboarding plans for this employee." />
          )}
        </ChartCard>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Mail;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="text-right font-medium text-card-foreground">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}