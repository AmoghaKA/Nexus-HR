import Link from "next/link";
import { Clock, GraduationCap } from "lucide-react";

import type { LearningRecommendation } from "@/types";
import { Button } from "@/components/ui/button";

export function LearningList({
  items,
}: {
  items: LearningRecommendation[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border p-3.5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.provider}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {item.reason}
              </p>
              <div className="flex items-center justify-between pt-1.5">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.duration}
                </span>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/employee/learning">Explore</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}