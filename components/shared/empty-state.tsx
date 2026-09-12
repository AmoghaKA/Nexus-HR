import * as React from "react";
import { PackageOpen, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </Card>
  );
}