import type { RecruitmentStage } from "@/types";
import { ProgressBar } from "@/components/shared/progress-bar";

export function RecruitmentPipeline({
  stages,
}: {
  stages: RecruitmentStage[];
}) {
  const max = Math.max(...stages.map((s) => s.count));
  return (
    <div className="space-y-4">
      {stages.map((stage, idx) => (
        <div key={stage.stage} className="group">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 font-medium">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {idx + 1}
              </span>
              {stage.stage}
            </span>
            <span className="text-muted-foreground">{stage.count}</span>
          </div>
          <ProgressBar
            value={(stage.count / max) * 100}
            tone="primary"
            size="sm"
          />
        </div>
      ))}
    </div>
  );
}