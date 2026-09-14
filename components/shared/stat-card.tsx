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
    <Card className="relative overflow-hidden border-border/80 bg-card/90 p-5 shadow-[0_12px_32px_hsl(195_28%_14%_/_0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_hsl(195_28%_14%_/_0.09)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5" aria-hidden="true" />
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