import type { EmployeeTraining } from "@/lib/hr/directory";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/progress-bar";
import { EmptyState } from "@/components/shared/empty-state";

function statusVariant(status: string): "success" | "warning" | "secondary" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  return "secondary";
}

export function TrainingStatusList({ training }: { training: EmployeeTraining[] }) {
  if (training.length === 0) {
    return (
      <EmptyState
        title="Not enrolled yet"
        description="Once your manager assigns a course, it will appear here."
      />
    );
  }
  return (
    <div className="space-y-3">
      {training.map((item) => {
        const progress = item.status === "completed" ? 100 : item.status === "in_progress" ? 60 : 0;
        return (
          <div key={item.id} className="rounded-lg border p-3.5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{item.title}</p>
              <Badge variant={statusVariant(item.status)} className="capitalize">
                {item.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <ProgressBar value={progress} size="sm" tone="auto" showLabel={false} />
            <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {item.status === "completed" && item.completedAt
                  ? `Completed ${formatDate(item.completedAt)}`
                  : item.status === "in_progress"
                    ? "In progress — keep going"
                    : "Not started"}
              </span>
              {item.score != null && <span>Score {item.score}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

