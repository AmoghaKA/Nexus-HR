import {
  ClipboardCheck,
  FileSearch,
  GraduationCap,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";

import type { UpcomingTask } from "@/types";

const kindIcon: Record<UpcomingTask["kind"], LucideIcon> = {
  review: FileSearch,
  training: GraduationCap,
  checkin: MessagesSquare,
  admin: ClipboardCheck,
};

export function UpcomingTasks({ tasks }: { tasks: UpcomingTask[] }) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const Icon = kindIcon[task.kind];
        return (
          <div key={task.id} className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">Due {task.due}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}