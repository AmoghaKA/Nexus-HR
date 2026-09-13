"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

import type { MyOnboardingPlan } from "@/lib/employee/data";
import { toggleOnboardingTask } from "@/lib/employee/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { ErrorBanner } from "@/components/hr/ai-shared";

function planVariant(status: string): "success" | "warning" | "secondary" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  return "secondary";
}

export function OnboardingTasks({ plans }: { plans: MyOnboardingPlan[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function toggle(taskId: string, done: boolean) {
    setError(null);
    setPending(taskId);
    try {
      const res = await toggleOnboardingTask(taskId, done);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No onboarding plans assigned yet. Your ramp-up checklist will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner error={error} />}
      {plans.map((plan) => {
        const done = plan.tasks.filter((t) => t.status === "completed").length;
        const total = plan.tasks.length;
        const progress = total === 0 ? 0 : Math.round((done / total) * 100);
        return (
          <Card key={plan.id} className="p-4">
            <CardHeader className="px-0 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">{plan.title}</CardTitle>
                <Badge variant={planVariant(plan.status)} className="capitalize">
                  {plan.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {done} of {total} tasks done
                {plan.startDate ? ` · started ${formatDate(plan.startDate)}` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 px-0 py-0">
              <ProgressBar value={progress} tone="auto" size="sm" showLabel label="Ramp-up" />
              <ul className="space-y-1.5">
                {plan.tasks.map((task) => {
                  const completed = task.status === "completed";
                  const isPending = pending === task.id;
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() => toggle(task.id, !completed)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-60"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                        ) : completed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                        <span className={completed ? "text-muted-foreground line-through" : ""}>
                          {task.title}
                        </span>
                        {task.dueDate && !completed && (
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            due {formatDate(task.dueDate)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {total === 0 && (
                <p className="text-xs text-muted-foreground">No tasks defined for this plan yet.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}