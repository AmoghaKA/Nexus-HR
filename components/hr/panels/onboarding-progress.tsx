import type { Onboarding } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/shared/progress-bar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function OnboardingProgress({
  items,
  showStart = true,
}: {
  items: Onboarding[];
  showStart?: boolean;
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback>{initials(item.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <span
                className={cn(
                  "text-xs font-medium",
                  item.progress >= 100 ? "text-success" : "text-muted-foreground"
                )}
              >
                {item.progress}%
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {item.role}
              {showStart && item.startedOn && ` · started ${item.startedOn}`}
            </p>
            <ProgressBar value={item.progress} size="sm" className="mt-1.5" />
          </div>
        </div>
      ))}
    </div>
  );
}