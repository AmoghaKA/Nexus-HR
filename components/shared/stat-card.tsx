import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  Flag,
  Layers,
  Target,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { StatCardData } from "@/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const iconMap: Record<StatCardData["icon"], LucideIcon> = {
  users: Users,
  "user-plus": UserPlus,
  briefcase: BriefcaseBusiness,
  alert: AlertTriangle,
  target: Target,
  flag: Flag,
  calendar: CalendarDays,
  layers: Layers,
};

export function StatCard({ stat }: { stat: StatCardData }) {
  const Icon = iconMap[stat.icon];
  const hasPositiveChange = (stat.change ?? 0) > 0;
  return (
    <Card className="p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        {stat.change !== undefined && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              hasPositiveChange
                ? "bg-success/12 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {hasPositiveChange ? "▲" : "▼"} {Math.abs(stat.change)}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{stat.value}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <p className="text-sm font-medium text-foreground">{stat.label}</p>
        {stat.hint && (
          <p className="truncate text-xs text-muted-foreground">{stat.hint}</p>
        )}
      </div>
    </Card>
  );
}