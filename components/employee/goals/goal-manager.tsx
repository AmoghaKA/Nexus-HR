"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Sparkles, Wand2 } from "lucide-react";

import type { MyGoalDetail } from "@/lib/employee/data";
import {
  addGoalAchievement,
  completeGoal,
  createGoal,
  updateGoalContent,
  updateGoalProgress,
  type EmployeeActionResult,
} from "@/lib/employee/actions";
import { sharpenGoal, type SharpenGoalActionResult } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { useAiRun } from "@/components/hr/ai-run";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BulletList,
  ConfidenceBadge,
  ErrorBanner,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

const CATEGORY_LABELS: Record<string, string> = {
  career: "Career",
  performance: "Performance",
  learning: "Learning",
  personal: "Personal",
  project: "Project",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "outline"> = {
  active: "secondary",
  completed: "success",
  draft: "outline",
  archived: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  draft: "Draft",
  archived: "Archived",
};

export function GoalManager({ goals }: { goals: MyGoalDetail[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function mutate(key: string, fn: () => Promise<EmployeeActionResult>) {
    setError(null);
    setPending(key);
    try {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <CreateGoalForm disabled={pending !== null} onError={setError} />

      {error && <ErrorBanner error={error} />}

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Create your first goal above, or ask the AI to sharpen a rough idea into a measurable one."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              pending={pending === goal.id}
              onUpdateProgress={(progress, comment) =>
                mutate(goal.id, () => updateGoalProgress(goal.id, progress, comment))
              }
              onAddAchievement={(achievement) =>
                mutate(goal.id, () => addGoalAchievement(goal.id, achievement))
              }
              onComplete={() => mutate(goal.id, () => completeGoal(goal.id))}
              onApplySharpened={(title, description) =>
                mutate(goal.id, () => updateGoalContent(goal.id, { title, description }))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateGoalForm({
  disabled,
  onError,
}: {
  disabled: boolean;
  onError: (error: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("personal");
  const [dueDate, setDueDate] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError("Give the goal a title.");
      return;
    }
    setPending(true);
    try {
      const res = await createGoal({
        title,
        description: description || undefined,
        category: category || undefined,
        dueDate: dueDate || undefined,
      });
      if (!res.ok) {
        onError(res.error ?? "Something went wrong.");
        return;
      }
      setTitle("");
      setDescription("");
      setDueDate("");
      setCategory("personal");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="h-4 w-4" />
        New goal
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">New goal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            placeholder="Goal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
          />
          <Textarea
            placeholder="What does success look like? (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={category} onValueChange={setCategory} disabled={pending}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create goal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function GoalCard({
  goal,
  pending,
  onUpdateProgress,
  onAddAchievement,
  onComplete,
  onApplySharpened,
}: {
  goal: MyGoalDetail;
  pending: boolean;
  onUpdateProgress: (progress: number, comment?: string) => void;
  onAddAchievement: (achievement: string) => void;
  onComplete: () => void;
  onApplySharpened: (title: string, description: string) => void;
}) {
  const [progress, setProgress] = React.useState(goal.progress);
  const [lastSynced, setLastSynced] = React.useState(goal.progress);
  const [comment, setComment] = React.useState("");
  const [achievement, setAchievement] = React.useState("");
  const { isPending: aiPending, result: sharpened, run: runSharpen } = useAiRun<SharpenGoalActionResult>();

  if (goal.progress !== lastSynced) {
    setLastSynced(goal.progress);
    setProgress(goal.progress);
  }

  const achievements = goal.entries.filter((e) => e.comment?.startsWith("Achievement:"));
  const checkIns = goal.entries.filter((e) => !e.comment?.startsWith("Achievement:"));

  return (
    <Card className="space-y-0 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{goal.title}</p>
            {goal.status === "completed" && (
              <Badge variant={STATUS_VARIANT[goal.status]}>{STATUS_LABEL[goal.status]}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {goal.category ? CATEGORY_LABELS[goal.category] ?? goal.category : "General"}
            {goal.dueDate ? ` · due ${formatDate(goal.dueDate)}` : ""}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={aiPending || pending || goal.status === "completed"}
          onClick={() => runSharpen(() => sharpenGoal({ title: goal.title, description: goal.description ?? undefined }))}
        >
          {aiPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Sharpen
        </Button>
      </div>

      {goal.description && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{goal.description}</p>
      )}

      <div className="mt-3">
        <ProgressBar
          value={goal.progress}
          tone="auto"
          showLabel
          label={`${goal.status === "completed" ? "Closed" : "Progress"}`}
        />
      </div>

      {goal.status !== "completed" && (
        <div className="mt-3 space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-20"
              disabled={pending}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={pending || progress === goal.progress}
              onClick={() => onUpdateProgress(progress, comment.trim() || undefined)}
            >
              Log progress
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || goal.status === "completed"}
              onClick={() => onComplete()}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark complete
            </Button>
          </div>
          <Input
            placeholder="Check-in note (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={pending}
          />
          <div className="flex items-center gap-2">
            <Input
              placeholder="Log an achievement…"
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              disabled={pending}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={pending || !achievement.trim()}
              onClick={() => {
                onAddAchievement(achievement.trim());
                setAchievement("");
              }}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {sharpened?.ok && sharpened.goal && (
        <SharpenedGoalView
          sharpened={sharpened.goal}
          pending={pending}
          onApply={() =>
            onApplySharpened(sharpened.goal!.title, sharpened.goal!.description)
          }
        />
      )}
      {sharpened && !sharpened.ok && <ErrorBanner error={sharpened.error ?? "Failed."} />}

      {(achievements.length > 0 || checkIns.length > 0) && (
        <div className="mt-3 space-y-3 border-t pt-3 text-xs text-muted-foreground">
          {achievements.length > 0 && (
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wider text-success">Achievements</p>
              <ul className="space-y-1.5">
                {achievements.slice(0, 5).map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                    <span>
                      {entry.comment?.replace(/^Achievement:\s*/, "")}
                      {entry.loggedAt && (
                        <span className="text-muted-foreground"> · {formatDateTime(entry.loggedAt)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {checkIns.length > 0 && (
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wider">Check-ins</p>
              <ul className="space-y-1.5">
                {checkIns.slice(0, 4).map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    <span>
                      {entry.comment ?? `Progress updated to ${entry.percent ?? "n/a"}%`}
                      <span className="text-muted-foreground">
                        {" "}
                        · {entry.loggedByName ?? "You"}
                        {entry.loggedAt ? ` · ${formatDateTime(entry.loggedAt)}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SharpenedGoalView({
  sharpened,
  pending,
  onApply,
}: {
  sharpened: NonNullable<SharpenGoalActionResult["goal"]>;
  pending: boolean;
  onApply: () => void;
}) {
  const [applied, setApplied] = React.useState(false);
  return (
    <div className="ai-gradient-border mt-3 space-y-3 rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
          AI sharpened goal
        </Badge>
        <ConfidenceBadge confidence={sharpened.confidence} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{sharpened.title}</p>
        {sharpened.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{sharpened.description}</p>
        )}
      </div>
      {sharpened.success_criteria.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Success criteria
          </p>
          <BulletList items={sharpened.success_criteria} tone="muted" />
        </div>
      )}
      {sharpened.kpis.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">KPIs</p>
          <div className="flex flex-wrap gap-1.5">
            {sharpened.kpis.map((kpi) => (
              <span key={kpi} className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {kpi}
              </span>
            ))}
          </div>
        </div>
      )}
      {sharpened.milestones.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Milestones</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {sharpened.milestones.map((m) => (
              <li key={m.label}>
                {m.label} — week {m.weeks} ({m.progress}%)
              </li>
            ))}
          </ul>
        </div>
      )}
      {!applied ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => { onApply(); setApplied(true); }}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Use this version
        </Button>
      ) : (
        <p className="text-xs text-success">Applied to your goal.</p>
      )}
      <AiDisclaimer />
    </div>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}