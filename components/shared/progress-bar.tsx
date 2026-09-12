import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  size?: "sm" | "md" | "lg";
  tone?: "auto" | "primary" | "success" | "warning" | "danger";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const fillClasses = {
  auto: "",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
} as const;

function autoFill(value: number) {
  if (value >= 75) return "bg-success";
  if (value >= 40) return "bg-warning";
  return "bg-destructive";
}

const heights = { sm: "h-1.5", md: "h-2", lg: "h-2.5" };

export function ProgressBar({
  value,
  size = "md",
  tone = "auto",
  showLabel = false,
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const fill =
    tone === "auto" ? autoFill(clamped) : fillClasses[tone];
  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          heights[size]
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", fill)}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="font-medium text-foreground">{clamped}%</span>
        </div>
      )}
    </div>
  );
}