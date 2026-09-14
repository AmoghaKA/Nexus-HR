import type { EmployeeReview } from "@/lib/hr/directory";
import { capitalize, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

function ratingVariant(rating: number | null): "success" | "warning" | "danger" | "secondary" {
  if (rating == null) return "secondary";
  if (rating >= 4) return "success";
  if (rating >= 3) return "warning";
  return "danger";
}

export function ReviewHistory({ reviews }: { reviews: EmployeeReview[] }) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        title="No reviews yet"
        description="Your completed performance reviews will appear here."
      />
    );
  }
  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{capitalize(review.type ?? "review")} review</p>
              <Badge variant="outline" className="bg-card text-muted-foreground">
                {periodLabel(review.periodStart, review.periodEnd)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-card">
                {review.rating != null ? `${review.rating} / 5` : "not rated"}
              </Badge>
              <Badge variant={ratingVariant(review.rating)} className="capitalize">
                {review.status}
              </Badge>
            </div>
          </div>
          {review.strengths && (
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-success">Strengths: </span>
              {review.strengths}
            </p>
          )}
          {review.improvements && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-warning">Improvements: </span>
              {review.improvements}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function periodLabel(start: string | null, end: string | null): string {
  const fmt = (value: string | null) => {
    if (!value) return "n/a";
    return formatDate(value, { month: "short", year: "numeric" });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}