import * as React from "react";
import { AlertCircle, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: LucideIcon;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  icon: Icon = AlertCircle,
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {message}
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
            {retryLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}