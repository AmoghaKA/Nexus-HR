import * as React from "react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <Card className={cn("group flex flex-col border-border/80 bg-card/90 p-5 shadow-[0_12px_32px_hsl(195_28%_14%_/_0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_40px_hsl(195_28%_14%_/_0.09)]", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className={cn("min-w-0 flex-1", contentClassName)}>{children}</div>
    </Card>
  );
}