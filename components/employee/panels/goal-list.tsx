import type { Goal } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/progress-bar";

const statusVariant = {
  "on-track": "success",
  "at-risk": "warning",
  completed: "secondary",
} as const;

const statusLabel = {
  "on-track": "On track",
  "at-risk": "At risk",
  completed: "Completed",
} as const;

export function GoalList({ goals }: { goals: Goal[] }) {
  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <div key={goal.title} className="rounded-lg border p-3.5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{goal.title}</p>
            <Badge variant={statusVariant[goal.status]}>
              {statusLabel[goal.status]}
            </Badge>
          </div>
          <ProgressBar
            value={goal.progress}
            showLabel
            label={`Due ${goal.due}`}
            size="sm"
          />
        </div>
      ))}
    </div>
  );
}