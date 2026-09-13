import type { EmployeeFeedback } from "@/lib/hr/directory";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

function categoryVariant(category: string | null): "success" | "warning" | "secondary" {
  if (category === "praise") return "success";
  if (category === "constructive" || category === "engagement") return "warning";
  return "secondary";
}

export function FeedbackList({ feedback }: { feedback: EmployeeFeedback[] }) {
  if (feedback.length === 0) {
    return (
      <EmptyState
        title="No feedback yet"
        description="Praise and constructive feedback you receive will show up here."
      />
    );
  }
  return (
    <div className="space-y-3">
      {feedback.map((item) => (
        <div key={item.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={categoryVariant(item.category)} className="capitalize">
                {item.category ?? "feedback"}
              </Badge>
              <Badge variant="outline" className="bg-card text-muted-foreground">
                from {item.fromName}
              </Badge>
            </div>
            {item.createdAt && (
              <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            )}
          </div>
          {item.message && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.message}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}