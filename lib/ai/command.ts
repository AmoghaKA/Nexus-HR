import { generateStructuredJSON } from "@/lib/ai/router";
import {
  managerActionsSchema,
  normalizeManagerActions,
  normalizeRetentionPlan,
  retentionPlanSchema,
  type ManagerActionPlan,
  type RetentionPlan,
} from "@/lib/ai/schemas";
import type { Schema } from "@google/generative-ai";
import { buildWorkforceBriefing, type WorkforceDataPackage } from "@/lib/ai/briefing";
import {
  fetchRiskSnapshot,
  type CopilotRiskEmployee,
  type CopilotRiskSnapshot,
} from "@/lib/ai/copilot";
import { saveInsights } from "@/lib/ai/store";

// ---------------------------------------------------------------------------
// Command-center AI actions (/hr/dashboard "AI Actions")
//
// Turns cross-source workforce signals into concrete, persisted plans:
//   - createRetentionPlan: individual + focus-area retention actions.
//   - generateManagerActions: per-department manager action plans.
//
// Results are persisted to `ai_insights` (same store as the workforce brief)
// so the UI can prove a real record was created. Server-only.
// ---------------------------------------------------------------------------

export interface RetentionPlanOutcome {
  plan: RetentionPlan;
  saved: number;
  persistError?: string;
}

export interface ManagerActionsOutcome {
  plan: ManagerActionPlan;
  saved: number;
  persistError?: string;
}

const GUARDRAILS = [
  "You are Nexus HR's HR analytics AI. You reason ONLY over the supplied structured workforce data — never invent facts, names, or numbers.",
  "NEVER use or infer protected characteristics (gender, age, race, ethnicity, religion, marital or family status, disability, nationality).",
  "Frame estimates probabilistically. Never state definitively that an employee will leave.",
  "Only reference employee and department names that appear verbatim in the provided context.",
  "Always return ONLY valid JSON in exactly the requested shape. No prose outside the JSON object.",
].join("\n");

function pct(n: number | null | undefined): string {
  return n == null ? "n/a" : `${Math.round(n)}%`;
}

function fmtRiskEmployee(e: CopilotRiskEmployee): string {
  const perf = e.latestRating != null ? `perf ${e.latestRating}${e.priorRating != null ? ` (was ${e.priorRating})` : ""}` : "perf n/a";
  const att = e.recentAttendancePct != null ? `attendance ${e.recentAttendancePct}%${e.priorAttendancePct != null ? ` (was ${e.priorAttendancePct}%)` : ""}` : "attendance n/a";
  const drivers = e.factors.length ? ` drivers: ${e.factors.join(", ")}` : "";
  return `${e.name} (${e.department}) — risk ${e.riskScore ?? "n/a"} ${e.riskLevel ?? ""}, ${perf}, ${att}${drivers}`;
}

function buildRetentionContext(pkg: WorkforceDataPackage, topEmployee: CopilotRiskEmployee[]) {
  const lines: string[] = [];
  lines.push("RISK EMPLOYEES (highest first)");
  lines.push(`- ${topEmployee.map((e) => fmtRiskEmployee(e)).join("\n- ")}`);
  lines.push("");
  lines.push("TARGET: these high/medium-risk employees above are the population this retention plan is for.");
  if (pkg.risk.topDrivers.length) {
    lines.push(`TOP RISK DRIVERS: ${pkg.risk.topDrivers.map((d) => `${d.driver} (${d.employees})`).join(", ")}`);
  }
  const deptContext = pkg.departments
    .filter((d) => topEmployee.some((e) => e.department === d.department))
    .map((d) => `${d.department}: headcount ${d.headcount}, goal completion ${pct(d.goalCompletionPct)}, negative feedback ${d.negativeFeedbackCount}, high risk ${d.highRiskCount}, avg risk ${d.avgRiskScore ?? "n/a"}`);
  if (deptContext.length) {
    lines.push("");
    lines.push("RELEVANT DEPARTMENTS");
    lines.push(deptContext.join("\n"));
  }
  if (pkg.goalsByEmployee.length) {
    lines.push("");
    lines.push("LOWEST GOAL COMPLETION");
    lines.push(
      pkg.goalsByEmployee
        .filter((g) => topEmployee.some((e) => e.name === g.employee))
        .map((g) => `${g.employee}: ${g.completionPct}%`)
        .join("\n") || "no goal data for target employees"
    );
  }
  return lines.join("\n");
}

function buildManagerContext(pkg: WorkforceDataPackage, risk: CopilotRiskSnapshot | null) {
  const deptLines = [...pkg.departments]
    .sort((a, b) => (b.avgRiskScore ?? 0) - (a.avgRiskScore ?? 0))
    .map((d) => `${d.department}: headcount ${d.headcount}, avg perf ${d.avgPerformance ?? "n/a"}, goal completion ${pct(d.goalCompletionPct)}, attendance ${pct(d.attendanceRatePct)} (variability ${d.attendanceVariabilityPct ?? "n/a"}%), negative feedback ${d.negativeFeedbackCount}, high risk ${d.highRiskCount}, avg risk ${d.avgRiskScore ?? "n/a"}, risk trend ${d.riskTrendDelta ?? "n/a"}, open roles ${d.openRolesCount}`);
  const riskLines = (risk?.employees ?? [])
    .filter((e) => (e.riskScore ?? 0) >= 45)
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 12)
    .map(fmtRiskEmployee);
  return [
    "DEPARTMENTS",
    deptLines.join("\n"),
    "",
    "HIGH/MEDIUM RISK EMPLOYEES (top 12)",
    riskLines.join("\n") || "none",
    "",
    "TOP RISK DRIVERS",
    pkg.risk.topDrivers.map((d) => `${d.driver} (${d.employees})`).join(", ") || "none",
  ].join("\n");
}

async function runModel<T>(
  schema: Schema,
  system: string,
  prompt: string,
  normalize: (r: Record<string, unknown>) => T
): Promise<T> {
  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system,
    prompt,
    schema,
    temperature: 0.25,
  });
  return normalize(parsed);
}

// ---------------------------------------------------------------------------
// Create Retention Plan
// ---------------------------------------------------------------------------

export async function createRetentionPlan(): Promise<RetentionPlanOutcome> {
  const [brief, risk] = await Promise.all([buildWorkforceBriefing(), fetchRiskSnapshot()]);
  const pkg = brief.package;
  const topEmployee = (risk?.employees ?? [])
    .filter((e) => (e.riskScore ?? 0) >= 45)
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 8);

  const topNames = topEmployee
    .map((e) => e.name)
    .filter((name, i, arr) => name !== "Unknown" && arr.indexOf(name) === i);

  const prompt = `You are building a retention plan for Nexus HR.

CONTEXT (generated just now):
${buildRetentionContext(pkg, topEmployee)}

EMPLOYEE NAMES YOU MAY REFERENCE (verbatim): ${topNames.join(", ") || "none"}

Produce a retention action plan targeting the at-risk employees shown above. Each recommended action must be concrete (e.g. "Schedule a 1:1 with <name> to review workload", "Offer <name> a growth project").`;

  const plan = await runModel(retentionPlanSchema, GUARDRAILS, prompt, normalizeRetentionPlan);

  const records = [
    {
      category: "attrition" as const,
      severity: "high" as const,
      title: plan.headline || "Retention plan generated",
      content: plan.summary || "AI-generated retention plan from cross-source workforce signals.",
      evidence: [
        `${pkg.risk.highRiskCount} high-risk employees (${pct(pkg.risk.highOrCriticalPct)} of workforce)`,
        ...topEmployee.slice(0, 3).map((e) => `${e.name} — risk ${e.riskScore ?? "n/a"} (${e.riskLevel ?? ""})`),
      ],
      reasoning:
        "Retention actions were derived from latest risk scores, review ratings, attendance deltas, feedback, and goal completion for the highest-risk employees.",
      confidence: plan.confidence,
      recommendedAction: plan.recommended_actions[0] ?? "Schedule manager check-ins for at-risk employees.",
      actionType: "retention-plan",
      affectedEntities: topNames.length ? topNames : [],
    },
    ...plan.at_risk_employees
      .filter((e) => e.name && e.name !== "Unknown")
      .slice(0, 6)
      .map((e) => ({
        category: "attrition" as const,
        severity: "medium" as const,
        title: `${e.name}: retention action`,
        content: e.action || e.note,
        evidence: [e.note],
        reasoning: "Individual retention action attached to the employee's risk signals.",
        confidence: plan.confidence,
        recommendedAction: e.action || "Schedule a 1:1 check-in.",
        actionType: "retention-step",
        affectedEntities: [e.name],
      })),
  ];

  const saved = await saveInsights(records);
  return { plan, saved: saved.saved, persistError: saved.error };
}

// ---------------------------------------------------------------------------
// Generate Manager Actions
// ---------------------------------------------------------------------------

export async function generateManagerActions(): Promise<ManagerActionsOutcome> {
  const [brief, risk] = await Promise.all([buildWorkforceBriefing(), fetchRiskSnapshot()]);
  const pkg = brief.package;

  const prompt = `You are generating a manager action plan for Nexus HR.

CONTEXT (generated just now):
${buildManagerContext(pkg, risk)}

DEPARTMENT NAMES YOU MAY REFERENCE (verbatim): ${pkg.departments.map((d) => d.department).join(", ") || "none"}

Produce concrete, department-specific manager actions (e.g. "Schedule 1:1s with the 3 high-risk employees", "Rebook goal check-ins for people under 70% completion", "Pair <name> with a mentor on <skill>").`;

  const plan = await runModel(managerActionsSchema, GUARDRAILS, prompt, normalizeManagerActions);

  const records = [
    {
      category: "engagement" as const,
      severity: "medium" as const,
      title: plan.headline || "Manager action plan generated",
      content: plan.summary || "AI-generated manager action plan from cross-source workforce signals.",
      evidence: [
        `${pkg.risk.highRiskCount} high-risk employees (${pct(pkg.risk.highOrCriticalPct)} of workforce)`,
        `Top drivers: ${pkg.risk.topDrivers.map((d) => d.driver).join(", ") || "none"}`,
        ...plan.by_department.slice(0, 3).map((d) => `${d.department}: ${d.summary}`),
      ],
      reasoning:
        "Manager actions were generated from risk scores, attendance, review ratings, feedback, goals, skill gaps, and onboarding signals per department.",
      confidence: plan.confidence,
      recommendedAction: plan.recommended_actions[0] ?? "Review the per-department action list and delegate owners.",
      actionType: "manager-actions",
      affectedEntities: plan.by_department.map((d) => d.department).slice(0, 8),
    },
    ...plan.by_department.slice(0, 6).map((d) => ({
      category: "engagement" as const,
      severity: "medium" as const,
      title: `${d.department}: manager actions`,
      content: d.actions[0] ?? (d.summary || `Manager action plan for ${d.department}.`),
      evidence: [d.summary],
      reasoning: "Department-specific manager actions derived from that team's workforce signals.",
      confidence: plan.confidence,
      recommendedAction: d.actions[0] ?? "Assign an owner for the department action plan.",
      actionType: "manager-actions",
      affectedEntities: [d.department],
    })),
  ];

  const saved = await saveInsights(records);
  return { plan, saved: saved.saved, persistError: saved.error };
}