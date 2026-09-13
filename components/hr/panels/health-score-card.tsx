import { HeartPulse } from "lucide-react";

import type { WorkforceHealthScore } from "@/lib/ai/briefing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/hr/ai-shared";
import { cn } from "@/lib/utils";

const LABEL_STYLE: Record<WorkforceHealthScore["label"], { text: string; badge: string }> = {
  excellent: { text: "text-success", badge: "border-success/30 bg-success/10 text-success" },
  good: { text: "text-primary", badge: "border-primary/30 bg-primary/10 text-primary" },
  fair: { text: "text-warning", badge: "border-warning/30 bg-warning/10 text-warning" },
  at_risk: { text: "text-destructive", badge: "border-destructive/30 bg-destructive/10 text-destructive" },
};

const LABEL_TEXT = { excellent: "Excellent", good: "Good", fair: "Fair", at_risk: "At risk" } as const;

function toneFor(key: string): "primary" | "destructive" | "success" | "warning" {
  if (key === "risk") return "destructive";
  if (key === "attendance" || key === "onboarding") return "warning";
  return "primary";
}

export function HealthScoreCard({ score }: { score: WorkforceHealthScore }) {
  const style = LABEL_STYLE[score.label];
  return (
    <Card className="ai-gradient-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HeartPulse className="h-4 w-4 text-primary" aria-hidden="true" />
          Workforce Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <span className={cn("text-5xl font-bold tracking-tight text-transparent bg-clip-text", style.text)}>
            {score.score}
          </span>
          <div className="pb-1.5">
            <Badge variant="outline" className={cn("border", style.badge)}>
              {LABEL_TEXT[score.label]}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Synthesized from risk, attendance, performance, goals, skills, onboarding and recruitment signals.
        </p>
        <div className="space-y-3 pt-1">
          {score.categories.map((c) => (
            <div key={c.key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-card-foreground">{c.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{c.score}</span>
              </div>
              <ScoreBar value={c.score} tone={toneFor(c.key)} />
              <p className="mt-1 truncate text-[11px] text-muted-foreground" title={c.detail}>
                {c.detail}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}