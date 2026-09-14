"use client";

import { useEffect, useState } from "react";
import { Loader2, Rocket, Sparkles } from "lucide-react";

import type { GenerateOnboardingPlanActionResult, PickerOption } from "@/lib/ai/actions";
import { generateOnboardingPlan, listOnboardingEmployees } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAiRun } from "@/components/hr/ai-run";
import {
  AiAnswerFrame,
  AiResultCard,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  PersistenceBadges,
  AiDisclaimer,
} from "@/components/hr/ai-shared";

export function OnboardingPlanRunner() {
  const { isPending, result, run } = useAiRun<GenerateOnboardingPlanActionResult>();
  const [employees, setEmployees] = useState<PickerOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    listOnboardingEmployees().then((res) => {
      if (!mounted) return;
      if (res.ok) setEmployees(res.employees);
      else setLoadError(res.error ?? "Failed to load employees.");
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full max-w-sm">
          {loadError && <ErrorBanner error={loadError} />}
          <Select value={selected} onValueChange={setSelected} disabled={employees.length === 0}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={employees.length ? "Choose an employee…" : "Loading employees…"} />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                  {e.sub ? ` · ${e.sub}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || !selected}
          onClick={() => run(() => generateOnboardingPlan(selected))}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {isPending ? "Generating plan…" : "Generate onboarding plan"}
        </Button>
      </div>

      {isPending && <LoadingRow label="Building a personalized ramp-up plan…" />}
      {result && !result.ok && <ErrorBanner error={result.error ?? "Failed."} />}

      {result?.ok && result.plan && (
        <PlanView
          employeeName={result.employeeName}
          plan={result.plan}
          saved={result.saved}
          persistError={result.persistError}
        />
      )}
    </div>
  );
}

function PlanView({
  employeeName,
  plan,
  saved,
  persistError,
}: {
  employeeName?: string;
  plan: NonNullable<GenerateOnboardingPlanActionResult["plan"]>;
  saved?: number;
  persistError?: string;
}) {
  return (
    <AiAnswerFrame
      title="AI Onboarding Plan"
      icon={<Sparkles className="h-3 w-3" aria-hidden="true" />}
      badges={
        <>
          <Badge variant="outline">
            ~{plan.expected_time_to_productivity_weeks} weeks to productivity
          </Badge>
          <ConfidenceBadge confidence={plan.confidence} />
          <PersistenceBadges saved={saved} persistError={persistError} noun="insight saved" />
        </>
      }
      headline={`${employeeName ? `${employeeName}: ` : ""}${plan.headline}`}
    >
      <div className="space-y-3">
        {plan.phases.map((phase, i) => (
          <AiResultCard
            key={`${phase.phase}-${i}`}
            index={i}
            icon={
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
            }
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{phase.phase}</span>
                <Badge variant="secondary">{phase.duration_weeks}w</Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{phase.objective}</p>
              <ul className="space-y-1.5">
                {phase.tasks.map((task) => (
                  <li key={task.title} className="flex items-start gap-2 text-sm text-card-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>
                      <span className="font-medium">{task.title}</span>
                      {task.description && <span className="text-muted-foreground"> — {task.description}</span>}
                      {task.owner_role && (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">Owner: {task.owner_role}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </AiResultCard>
        ))}

        {plan.phases.length === 0 && (
          <p className="text-sm text-muted-foreground">No phases generated.</p>
        )}
      </div>

      <AiDisclaimer />
    </AiAnswerFrame>
  );
}