import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  present: "bg-success",
  late: "bg-warning",
  half_day: "bg-warning",
  wfh: "bg-info",
  absent: "bg-destructive",
  leave: "bg-muted-foreground",
};

export function AttendanceSummary({
  rate,
  recent,
}: {
  rate: number | null;
  recent: { date: string; status: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{rate != null ? `${rate}%` : "—"}</p>
          <p className="text-sm text-muted-foreground">last 60 days</p>
        </div>
      </div>

      {recent.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent days
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recent.slice(0, 14).map((day) => (
              <span
                key={day.date}
                title={`${day.date} — ${day.status}`}
                className={cn("h-6 w-6 rounded-md border border-border/60", STATUS_COLOR[day.status] ?? "bg-muted")}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {recent[0].date} {statusLabel(recent[0].status)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No attendance recorded yet.</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <span key={status} className="inline-flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", color)} aria-hidden="true" />
            {status}
          </span>
        ))}
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  return STATUS_LABEL_FALLBACK[status] ?? status;
}

const STATUS_LABEL_FALLBACK: Record<string, string> = {
  present: "present",
  absent: "absent",
  late: "late",
  half_day: "half day",
  wfh: "work from home",
  leave: "on leave",
};