import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        className
      )}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}