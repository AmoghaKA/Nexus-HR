import type { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showLabel?: boolean;
  className?: string;
}

const config: Record<
  RiskLevel,
  { label: string; className: string; dot: string }
> = {
  low: {
    label: "Low risk",
    className: "bg-success/12 text-success",
    dot: "bg-success",
  },
  medium: {
    label: "Medium risk",
    className: "bg-warning/15 text-warning",
    dot: "bg-warning",
  },
  high: {
    label: "High risk",
    className: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  critical: {
    label: "Critical",
    className:
      "bg-destructive text-destructive-foreground",
    dot: "bg-destructive-foreground",
  },
};

export function RiskBadge({ level, score, showLabel = true, className }: RiskBadgeProps) {
  const c = config[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        c.className,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} aria-hidden="true" />
      {showLabel && (
        <span>
          {c.label}
          {score !== undefined && <span className="opacity-70"> · {score}</span>}
        </span>
      )}
    </span>
  );
}