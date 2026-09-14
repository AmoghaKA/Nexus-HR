"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  HeartHandshake,
  Layers,
  ListChecks,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  createRetentionPlan,
  generateManagerActions,
  type CreateRetentionPlanActionResult,
  type GenerateManagerActionsActionResult,
} from "@/lib/ai/actions";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AiDisclaimer,
  BulletList,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  PersistenceBadges,
  RecommendedActions,
} from "@/components/hr/ai-shared";

type AIContext = { id: "retention" } | { id: "manager" };
type AIState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "retention"; result: CreateRetentionPlanActionResult }
  | { status: "manager"; result: GenerateManagerActionsActionResult };

const NAV_ACTIONS = [
  { href: "/hr/employees", title: "Review Employees", description: "Ask the AI Copilot for a risk review of people, teams or departments.", icon: Users },
  { href: "/hr/recruitment", title: "Review Candidates", description: "Inspect pipeline health, assessment matches and stuck candidates.", icon: Briefcase },
  { href: "/hr/skills", title: "Create Upskilling Plan", description: "Close critical skill gaps with targeted development recommendations.", icon: Layers },
  { href: "/hr/onboarding", title: "Intervene in Onboarding", description: "Find overdue, blocked and at-risk onboarding plans that need help.", icon: ClipboardList },
] as const;

function AiActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  active,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-xl border bg-card/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-card",
        active && "border-primary/50 ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold">{title}</span>
        <Badge variant="outline" className="ml-auto shrink-0 bg-card text-xs">
          AI
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </button>
  );
}

function RetentionDetail({ result }: { result: CreateRetentionPlanActionResult }) {
  if (!result.ok || !result.plan) {
    return <ErrorBanner error={result.error ?? "Something went wrong generating the plan."} />;
  }
  const plan = result.plan;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceBadge confidence={plan.confidence} />
        <PersistenceBadges saved={result.saved} persistError={result.persistError} noun="records saved" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-snug">{plan.headline}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{plan.summary}</p>
      </div>
      {plan.focus_areas.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Focus areas</p>
          {plan.focus_areas.map((area) => (
            <div key={area.title} className="rounded-lg border bg-card/60 p-3">
              <p className="text-sm font-medium">{area.title}</p>
              {area.description && <p className="mt-0.5 text-xs text-muted-foreground">{area.description}</p>}
              <BulletList items={area.actions} />
            </div>
          ))}
        </div>
      )}
      {plan.at_risk_employees.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Employee attention plans
          </p>
          <ul className="space-y-1.5">
            {plan.at_risk_employees.map((emp, i) => (
            <li key={`${emp.name}-${i}`} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
                <span className="text-xs leading-relaxed text-card-foreground">
                  <span className="font-semibold">{emp.name}</span>
                  {emp.note && <span className="text-muted-foreground"> — {emp.note}</span>}
                  {emp.action && <span className="block text-muted-foreground">{emp.action}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <RecommendedActions actions={plan.recommended_actions} />
      <AiDisclaimer />
    </div>
  );
}

function ManagerDetail({ result }: { result: GenerateManagerActionsActionResult }) {
  if (!result.ok || !result.plan) {
    return <ErrorBanner error={result.error ?? "Something went wrong generating manager actions."} />;
  }
  const plan = result.plan;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceBadge confidence={plan.confidence} />
        <PersistenceBadges saved={result.saved} persistError={result.persistError} noun="records saved" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-snug">{plan.headline}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{plan.summary}</p>
      </div>
      {plan.by_department.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            By department
          </p>
          {plan.by_department.map((dept) => (
            <div key={dept.department} className="rounded-lg border bg-card/60 p-3">
              <p className="text-sm font-medium">{dept.department}</p>
              {dept.summary && <p className="mt-0.5 text-xs text-muted-foreground">{dept.summary}</p>}
              <BulletList items={dept.actions} />
            </div>
          ))}
        </div>
      )}
      <RecommendedActions actions={plan.recommended_actions} />
      <AiDisclaimer />
    </div>
  );
}

export function CommandCenterActions() {
  const [dialog, setDialog] = useState<AIContext | null>(null);
  const [aiState, setAIState] = useState<AIState>({ status: "idle" });
  const [, startTransition] = useTransition();

  function openAI(context: AIContext) {
    setDialog(context);
    setAIState({ status: "pending" });
    startTransition(async () => {
      if (context.id === "retention") {
        setAIState({ status: "retention", result: await createRetentionPlan() });
      } else {
        setAIState({ status: "manager", result: await generateManagerActions() });
      }
    });
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {NAV_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-xl border bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-card"
          >
            <div className="flex items-center gap-2">
              <a.icon className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">{a.title}</span>
              <ArrowRight
                className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{a.description}</p>
          </Link>
        ))}
        <AiActionCard
          icon={HeartHandshake}
          title="Create Retention Plan"
          description="Generates a retention plan for high-risk employees and saves it to the insights store."
          onClick={() => openAI({ id: "retention" })}
          active={dialog?.id === "retention" && aiState.status === "pending"}
        />
        <AiActionCard
          icon={ListChecks}
          title="Generate Manager Actions"
          description="Builds concrete per-department manager actions from cross-source signals."
          onClick={() => openAI({ id: "manager" })}
          active={dialog?.id === "manager" && aiState.status === "pending"}
        />
      </div>

      <Dialog
        open={dialog !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDialog(null);
            setAIState({ status: "idle" });
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              {dialog?.id === "retention" ? "Retention Plan" : "Manager Actions"}
            </DialogTitle>
            <DialogDescription>
              Live Supabase signals → Qwen reasoning → structured, persisted plan.
            </DialogDescription>
          </DialogHeader>

          {aiState.status === "pending" && (
            <LoadingRow label="Gathering signals and running Qwen…" />
          )}

          {aiState.status === "retention" && <RetentionDetail result={aiState.result} />}
          {aiState.status === "manager" && <ManagerDetail result={aiState.result} />}
        </DialogContent>
      </Dialog>
    </>
  );
}