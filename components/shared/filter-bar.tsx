import * as React from "react";
import { SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

interface FilterBarProps {
  label?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function FilterBar({ label, children, right, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2",
        className
      )}
    >
      {label && (
        <span className="inline-flex items-center gap-1.5 pl-2 pr-1 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}