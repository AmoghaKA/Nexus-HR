"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CalendarX2,
  CheckCircle2,
  Circle,
  Gauge,
  Loader2,
  Rocket,
  Route,
  ShieldAlert,
  Sparkles,
  UserPlus,
} from "lucide-react";

import type { OnboardingOverview } from "@/lib/hr/onboarding";
import type { OnboardingProgressInsight } from "@/lib/ai/schemas";
import type {
  EvaluateOnboardingProgressActionResult,
  GenerateAndPersistOnboardingPlanActionResult,
} from "@/lib/ai/actions";
import type { NewHireOptions } from "@/lib/hr/actions";
import { generateAndPersistOnboardingPlan, evaluateOnboardingProgress } from "@/lib/ai/actions";
import { listNewHireOptions, provisionNewHire, type ProvisionNewHireResult } from "@/lib/hr/actions";
import { toggleOnboardingTask } from "@/lib/employee/actions";
import { cn } from "@/lib/utils";
import { useAiRun } from "@/components/hr/ai-run";
import {
  AiDisclaimer,
  ConfidenceBadge,
  ErrorBanner,
  LoadingRow,
  RecommendedActions,
  ScoreBar,
} from "@/components/hr/ai-shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { SearchBar } from "@/components/shared/search-bar";

const TODAY = new Date().toISOString().slice(0, 10);

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatShortDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusMeta(emp: OnboardingOverview): { label: string; variant: "success" | "secondary" | "warning" | "danger" } {
  switch (emp.overallStatus) {
    case "completed":
    case "on_track":
      return { label: "On track", variant: "success" };
    case "not_started":
      return { label: "Not started", variant: "secondary" };
    case "at_risk":
      return { label: "At risk", variant: emp.counts.overdue > 0 ? "danger" : "warning" };
  }
}

function planVariant(status: string): "success" | "secondary" | "warning" | "danger" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "blocked") return "danger";
  return "secondary";
}

function taskVariant(status: string): "success" | "secondary" | "warning" | "danger" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "blocked") return "danger";
  return "secondary";
}

type InsightStatus = "on_track" | "at_risk" | "behind" | "blocked";

const INSIGHT_CHIP: Record<InsightStatus, { variant: "success" | "warning" | "danger" | "secondary"; label: string }> = {
  on_track: { variant: "success", label: "On track" },
  at_risk: { variant: "warning", label: "At risk" },
  behind: { variant: "danger", label: "Behind" },
  blocked: { variant: "danger", label: "Blocked" },
};

function AdaptiveInsightView({ insight }: { insight: OnboardingProgressInsight }) {
  const chip = INSIGHT_CHIP[insight.status] ?? { variant: "secondary" as const, label: insight.status };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={chip.variant}>{chip.label}</Badge>
        <Badge variant="outline" className="bg-card">
          {insight.completed}/{insight.total_tasks} tasks done
        </Badge>
        <ConfidenceBadge confidence={insight.confidence} />
      </div>

      <div>
        <p className="text-sm font-semibold">{insight.headline}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight.summary}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{insight.completed_pct}% complete</span>
          <span>{insight.days_since_start} days since start</span>
        </div>
        <ScoreBar value={insight.completed_pct} tone={insight.completed_pct >= 80 ? "success" : "warning"} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {insight.completed} completed
        </span>
        <span className="inline-flex items-center gap-1">
          <Circle className="h-3.5 w-3.5" aria-hidden="true" /> {insight.pending} pending
        </span>
        <span className="inline-flex items-center gap-1 text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> {insight.overdue} overdue
        </span>
        <span className="inline-flex items-center gap-1 text-destructive">
          <Ban className="h-3.5 w-3.5" aria-hidden="true" /> {insight.blocked} blocked
        </span>
      </div>

      {insight.issue && insight.status !== "on_track" && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-relaxed">
          <span className="font-semibold text-destructive">Why:</span> {insight.issue}
        </p>
      )}

      {insight.recommendation && (
        <p className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-xs leading-relaxed">
          <span className="font-semibold text-primary">Recommended next:</span> {insight.recommendation}
        </p>
      )}

      {insight.prescribed_actions.length > 0 && <RecommendedActions actions={insight.prescribed_actions} />}
      <AiDisclaimer />
    </div>
  );
}

interface NewHireForm {
  fullName: string;
  email: string;
  departmentId: string;
  roleId: string;
  managerId: string;
  experienceYears: number;
  skills: string;
  dateOfJoining: string;
}

function defaultForm(): NewHireForm {
  return {
    fullName: "",
    email: "",
    departmentId: "",
    roleId: "",
    managerId: "",
    experienceYears: 0,
    skills: "",
    dateOfJoining: new Date().toISOString().slice(0, 10),
  };
}

function NewHireDialog({
  open,
  onOpenChange,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
}) {
  const [options, setOptions] = React.useState<NewHireOptions | null>(null);
  const [optionsError, setOptionsError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<NewHireForm>(defaultForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<ProvisionNewHireResult | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    listNewHireOptions().then((res) => {
      if (res.ok && res.options) setOptions(res.options);
      else setOptionsError(res.error ?? "Failed to load onboarding options.");
    });
  }, [open]);

  function change(next: boolean) {
    if (!next) {
      onClosed();
      setResult(null);
      setForm(defaultForm());
    }
    onOpenChange(next);
  }

  function set<K extends keyof NewHireForm>(key: K, value: NewHireForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    const res = await provisionNewHire({
      fullName: form.fullName,
      email: form.email,
      departmentId: form.departmentId,
      roleId: form.roleId,
      managerId: form.managerId || null,
      experienceYears: form.experienceYears,
      skills: form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dateOfJoining: form.dateOfJoining,
    });
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(res.error ?? "Failed to provision the new hire.");
      return;
    }
    setResult(res);
  }

  const ready = Boolean(form.fullName.trim() && form.email.includes("@") && (form.departmentId || form.roleId));

  return (
    <Modal
      open={open}
      onOpenChange={change}
      title="Provision a new hire"
      description="Create the account, employee record, and skill tags so the adaptive onboarding journey can personalize their ramp-up."
      size="md"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => change(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button disabled={submitting || !ready || Boolean(result?.ok)} onClick={submit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
            {submitting ? "Provisioning…" : "Provision"}
          </Button>
        </div>
      }
    >
      {optionsError && <ErrorBanner error={optionsError} />}
      {submitError && <ErrorBanner error={submitError} />}

      {result?.ok ? (
        <div className="space-y-3 rounded-lg border border-success/30 bg-success/10 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-success">New hire provisioned</p>
            <p className="text-xs text-muted-foreground">
              Employee code{" "}
              <span className="font-mono text-card-foreground">{result.employeeCode}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Temporary password — share once, change on first login:
            </p>
            <p className="break-all rounded-md bg-card px-3 py-2 font-mono text-xs">{result.temporaryPassword}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setResult(null)}>
            Dismiss
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="newhire-name">Full name</Label>
            <Input
              id="newhire-name"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="e.g. Ada Lovelace"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newhire-email">Email</Label>
            <Input
              id="newhire-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="ada@example.com"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.departmentId || "none"} onValueChange={(v) => set("departmentId", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(options?.departments ?? []).map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                      {d.sub ? ` · ${d.sub}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.roleId || "none"} onValueChange={(v) => set("roleId", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(options?.roles ?? []).map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                      {r.sub ? ` · ${r.sub}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Manager</Label>
              <Select value={form.managerId || "none"} onValueChange={(v) => set("managerId", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(options?.managers ?? []).map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                      {m.sub ? ` · ${m.sub}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newhire-experience">Experience (years)</Label>
              <Input
                id="newhire-experience"
                type="number"
                min={0}
                value={form.experienceYears}
                onChange={(e) => set("experienceYears", Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="newhire-skills">Skills</Label>
              <Input
                id="newhire-skills"
                value={form.skills}
                onChange={(e) => set("skills", e.target.value)}
                placeholder="comma-separated skill names, e.g. TypeScript, Supabase, Figma"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="newhire-doj">Date of joining</Label>
              <Input
                id="newhire-doj"
                type="date"
                value={form.dateOfJoining}
                onChange={(e) => set("dateOfJoining", e.target.value)}
              />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

export function OnboardingWorkspace({ initialEmployees }: { initialEmployees: OnboardingOverview[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newHireOpen, setNewHireOpen] = React.useState(false);
  const [taskPending, setTaskPending] = React.useState<string | null>(null);
  const [taskError, setTaskError] = React.useState<string | null>(null);
  const [generatedFor, setGeneratedFor] = React.useState<string | null>(null);
  const [evaluatedFor, setEvaluatedFor] = React.useState<string | null>(null);

  const generateRun = useAiRun<GenerateAndPersistOnboardingPlanActionResult>();
  const evaluateRun = useAiRun<EvaluateOnboardingProgressActionResult>();

  const selected = initialEmployees.find((e) => e.employeeId === selectedId) ?? null;

  const activeJourneys = initialEmployees.filter((e) => e.plans.length > 0).length;
  const withTasks = initialEmployees.filter((e) => e.counts.total > 0);
  const avgCompletion = withTasks.length === 0 ? 0 : Math.round(withTasks.reduce((sum, e) => sum + e.progressPct, 0) / withTasks.length);
  const overdueTasks = initialEmployees.reduce((sum, e) => sum + e.counts.overdue, 0);
  const atRisk = initialEmployees.filter((e) => e.counts.overdue > 0 || e.counts.blocked > 0).length;

  const stats = [
    { label: "Active journeys", value: activeJourneys, icon: Route, hint: `${initialEmployees.length} employees` },
    { label: "Average completion", value: `${avgCompletion}%`, icon: Gauge, hint: withTasks.length ? `across ${withTasks.length} employees` : "no plans yet" },
    { label: "Overdue tasks", value: overdueTasks, icon: CalendarX2, hint: "across all journeys", danger: overdueTasks > 0 },
    { label: "At-risk employees", value: atRisk, icon: ShieldAlert, hint: "overdue or blocked", danger: atRisk > 0 },
  ];

  const filtered = initialEmployees.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${e.name} ${e.role} ${e.department}`.toLowerCase().includes(q);
  });

  function generateJourney() {
    if (!selected) return;
    setGeneratedFor(selected.employeeId);
    generateRun.run(async () => {
      const res = await generateAndPersistOnboardingPlan(selected.employeeId);
      if (res.ok) router.refresh();
      return res;
    });
  }

  function evaluateJourney() {
    if (!selected) return;
    setEvaluatedFor(selected.employeeId);
    evaluateRun.run(() => evaluateOnboardingProgress(selected.employeeId));
  }

  async function toggleTask(taskId: string, done: boolean) {
    setTaskError(null);
    setTaskPending(taskId);
    const res = await toggleOnboardingTask(taskId, done);
    setTaskPending(null);
    if (!res.ok) {
      setTaskError(res.error ?? "Something went wrong updating the task.");
      return;
    }
    router.refresh();
  }

  const generated = generateRun.result && generatedFor === selected?.employeeId ? generateRun.result : null;
  const evaluated = evaluateRun.result && evaluatedFor === selected?.employeeId ? evaluateRun.result : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {initialEmployees.length} new hires
        </p>
        <Button size="sm" className="ml-auto" onClick={() => setNewHireOpen(true)}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Provision new hire
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{stat.label}</p>
              <span className={cn("grid h-8 w-8 place-items-center rounded-lg", stat.danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                <stat.icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <SearchBar value={query} onChange={setQuery} placeholder="Search by name, role, or department…" />

          {filtered.length === 0 ? (
            <EmptyState
              title="No new hires match"
              description="Try adjusting the search to find the right onboarding journey."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Manager</th>
                    <th className="px-3 py-2">Joined</th>
                    <th className="px-3 py-2">Progress</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const meta = statusMeta(e);
                    return (
                      <tr
                        key={e.employeeId}
                        onClick={() => setSelectedId(e.employeeId)}
                        className={cn(
                          "cursor-pointer border-b last:border-0 hover:bg-muted/30",
                          selectedId === e.employeeId && "bg-accent hover:bg-accent"
                        )}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{initials(e.name)}</AvatarFallback>
                            </Avatar>
                            <div className="leading-tight">
                              <p className="font-medium">{e.name}</p>
                              <p className="text-xs text-muted-foreground">{e.employeeCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{e.role}</td>
                        <td className="px-3 py-2 text-muted-foreground">{e.manager ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {e.joined ? formatDate(e.joined) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {e.counts.total > 0 ? (
                            <div className="w-20">
                              <p className="text-xs font-medium">{e.progressPct}%</p>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${e.progressPct}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected ? (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{selected.name}</h3>
                    <span className="text-xs text-muted-foreground">{selected.employeeCode}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {selected.role} · {selected.department}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-card-foreground">Manager: {selected.manager ?? "—"}</span>
                    <span>Joined: {selected.joined ? formatDate(selected.joined) : "—"}</span>
                    <span>Experience: {selected.experience != null ? `${selected.experience} yrs` : "—"}</span>
                  </div>
                </div>
                <Badge variant={statusMeta(selected).variant}>{statusMeta(selected).label}</Badge>
              </div>

              {selected.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.skills.map((s) => (
                    <Badge key={s} variant="outline" className="bg-card">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-4 grid grid-cols-5 gap-2 text-center">
                {[
                  { label: "Total", value: selected.counts.total },
                  { label: "Completed", value: selected.counts.completed },
                  { label: "Pending", value: selected.counts.pending },
                  { label: "Overdue", value: selected.counts.overdue, danger: selected.counts.overdue > 0 },
                  { label: "Blocked", value: selected.counts.blocked, danger: selected.counts.blocked > 0 },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg bg-muted/40 px-2 py-2">
                    <p className={cn("text-lg font-semibold", c.danger ? "text-destructive" : "")}>{c.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={generateRun.isPending} onClick={generateJourney}>
                {generateRun.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Rocket className="h-4 w-4" aria-hidden="true" />
                )}
                Generate personalized journey
              </Button>
              <Button variant="outline" size="sm" disabled={evaluateRun.isPending} onClick={evaluateJourney}>
                {evaluateRun.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                Evaluate progression
              </Button>
            </div>

            {generateRun.isPending && <LoadingRow label={`Building a personalized ramp-up plan for ${selected.name}…`} />}
            {evaluateRun.isPending && <LoadingRow label={`Assessing ${selected.name}'s onboarding progress…`} />}

            {generated && !generated.ok && <ErrorBanner error={generated.error ?? "Failed to generate the journey."} />}
            {generated?.ok && generated.plan && (
              <div
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm",
                  generated.persistError ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/[0.04]"
                )}
              >
                {generated.skippedExisting ? (
                  <>
                    Existing journey kept for {generated.employeeName ?? selected.name} — no changes made.
                  </>
                ) : generated.persisted ? (
                  <>
                    Personalized journey saved for {generated.employeeName ?? selected.name}.{" "}
                    {typeof generated.saved === "number" && (
                      <span className="text-muted-foreground">{generated.saved} insight saved.</span>
                    )}
                  </>
                ) : (
                  <>Journey generated for {generated.employeeName ?? selected.name} but could not be persisted.</>
                )}
                {generated.persistError && (
                  <p className="mt-1 text-xs text-muted-foreground">{generated.persistError}</p>
                )}
              </div>
            )}

            {evaluated && !evaluated.ok && <ErrorBanner error={evaluated.error ?? "Failed to evaluate progress."} />}
            {evaluated?.ok && evaluated.insight && <AdaptiveInsightView insight={evaluated.insight} />}

            {taskError && <ErrorBanner error={taskError} />}

            <div className="space-y-3">
              {selected.plans.map((plan) => (
                <Card key={plan.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{plan.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {plan.startDate ? `Started ${formatShortDate(plan.startDate)}` : "Not started"}
                      </p>
                    </div>
                    <Badge variant={planVariant(plan.status)} className="capitalize">
                      {plan.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <ul className="mt-3 space-y-0.5">
                    {plan.tasks.map((task) => {
                      const completed = task.status === "completed";
                      const isPending = taskPending === task.id;
                      const overdue = Boolean(task.dueDate && task.dueDate < TODAY && task.status !== "completed");
                      return (
                        <li key={task.id}>
                          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
                            <button
                              type="button"
                              disabled={taskPending !== null}
                              onClick={() => toggleTask(task.id, !completed)}
                              className="text-muted-foreground hover:text-card-foreground disabled:cursor-wait disabled:opacity-60"
                              aria-label={completed ? `Mark ${task.title} as pending` : `Mark ${task.title} as completed`}
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : completed ? (
                                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                              ) : (
                                <Circle className="h-4 w-4" aria-hidden="true" />
                              )}
                            </button>
                            <span className={completed ? "text-muted-foreground line-through" : ""}>{task.title}</span>
                            <div className="ml-auto flex shrink-0 items-center gap-2">
                              {task.dueDate && (
                                <span
                                  className={cn(
                                    "text-xs",
                                    overdue ? "font-medium text-destructive" : "text-muted-foreground"
                                  )}
                                >
                                  {overdue ? "Overdue · " : "Due "}
                                  {formatShortDate(task.dueDate)}
                                </span>
                              )}
                              <Badge variant={taskVariant(task.status)} className="capitalize">
                                {task.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {plan.tasks.length === 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">No tasks defined for this plan yet.</p>
                  )}
                </Card>
              ))}

              {selected.plans.length === 0 && (
                <EmptyState
                  title="No onboarding journey yet"
                  description="Generate a personalized ramp-up plan to seed this employee's journey."
                />
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title="Select a new hire"
            description="Pick an employee from the overview to inspect their onboarding journey, run AI actions, and track their ramp-up."
          />
        )}
      </div>

      <NewHireDialog
        open={newHireOpen}
        onOpenChange={setNewHireOpen}
        onClosed={() => router.refresh()}
      />
    </div>
  );
}