import { getSupabaseServer } from "@/lib/supabase/server";
import { generateStructuredJSON } from "@/lib/ai/router";
import {
  copilotAnswerSchema,
  normalizeCopilotAnswer,
  type CopilotAnswer,
} from "@/lib/ai/schemas";
import { buildWorkforceBriefing, prepareBriefingPrompt, type WorkforceDataPackage } from "@/lib/ai/briefing";
import { fetchOnboardingOverview, type OnboardingOverview } from "@/lib/hr/onboarding";
import { fetchSkillGraphData, type SkillGraphData, type SkillGraphRow } from "@/lib/hr/skills";
import { fetchRecruitmentData, type RecruitmentData } from "@/lib/hr/recruitment";

// ---------------------------------------------------------------------------
// HR AI Workforce Copilot
//
// Constructs an answer to a natural-language workforce question. Pipeline:
//   1. Classify the question into an intent (deterministic keyword rules).
//   2. Load ONLY the data relevant to that intent from Supabase.
//   3. Build a compact, structured signal package (numbers first, names exact).
//   4. Ask Gemini to produce a structured CopilotAnswer (answer + evidence +
//      reasoning + recommended actions + relevant entities).
//   5. Normalize the model output, then attach stable record ids so the UI can
//      link employees/candidates to their pages.
//
// Every number in the answer must come from the provided context — the model
// is never asked to guess. This module is server-only.
// ---------------------------------------------------------------------------

export type CopilotIntent =
  | "attrition_risk_by_dept"
  | "attrition_trend_dept"
  | "performance_attendance_decline"
  | "skill_gaps"
  | "recruitment_candidates"
  | "onboarding_at_risk"
  | "workforce_risk_summary"
  | "department_recommendations"
  | "workforce_briefing"
  | "general";

export interface CopilotRosterEmployee {
  id: string;
  name: string;
  department: string;
}

export interface CopilotRoster {
  departments: string[];
  roleTitles: string[];
  skills: string[];
  employees: CopilotRosterEmployee[];
  candidates: { id: string; name: string; jobTitle: string | null }[];
}

export interface CopilotRiskEmployee {
  id: string;
  name: string;
  department: string;
  role: string;
  riskScore: number | null;
  riskLevel: "low" | "medium" | "high" | "critical" | null;
  latestRating: number | null;
  priorRating: number | null;
  recentAttendancePct: number | null;
  priorAttendancePct: number | null;
  declineFlags: ("performance" | "attendance")[];
  factors: string[];
}

export interface CopilotRiskSnapshot {
  employees: CopilotRiskEmployee[];
}

export interface CopilotContext {
  question: string;
  history: string[];
  roster: CopilotRoster;
  briefing: WorkforceDataPackage | null;
  risk: CopilotRiskSnapshot | null;
  skillGraph: SkillGraphData | null;
  onboarding: OnboardingOverview[] | null;
  recruitment: RecruitmentData | null;
}

export interface CopilotAnswerOutcome {
  intent: CopilotIntent;
  answer: CopilotAnswer;
}

const PRESENT_STATUSES = new Set(["present", "late", "half_day", "wfh"]);
const EXCLUDED_STATUSES = ["terminated", "resigned"];

const AI_KEYWORDS = ["ai", "ml", "data", "llm", "model", "machine learning", "prompt", "analytics"];

const SYSTEM_GUARDRAILS = [
  "You are WorkforceIQ's HR analytics AI ('Workforce Copilot'). You reason ONLY over the structured workforce data provided to you — never invent facts, names, or numbers.",
  "NEVER use or infer protected characteristics (gender, age, race, ethnicity, religion, marital or family status, disability, nationality) for any analysis.",
  "Never present a decision as definitive. Frame estimates probabilistically ('the risk estimate indicates elevated attrition risk') rather than 'this employee WILL leave'.",
  "Every evidence item must be a real number or fact verbatim from the provided context. If the data is thin, lower confidence and say so.",
  "Only reference entity names that appear verbatim in the provided context. If the question asks about something not in the context, answer that you cannot see that data.",
  "Always return ONLY valid JSON in exactly the requested shape. No prose outside the JSON object.",
].join("\n");

// ---------------------------------------------------------------------------
// 1. Intent classification (deterministic keyword rules)
// ---------------------------------------------------------------------------

function classifyCopilotIntent(question: string, ctx: { departments: string[]; roleTitles: string[] }): CopilotIntent {
  const q = question.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => q.includes(k));
  const mentionsDept = ctx.departments.some((d) => d.length > 2 && q.includes(d.toLowerCase()));
  const mentionsRole = ctx.roleTitles.some((t) => t.length > 3 && q.includes(t.toLowerCase()));

  if (
    has("attrition", "leaving", "quit", "departure", "churn", "turnover", "retention", "resign") &&
    (has("department", "dept", "which", "highest", "top", "compare", "ranking", "rank", "by department") || mentionsDept)
  ) {
    return "attrition_risk_by_dept";
  }
  if (
    has("attrition", "churn", "turnover", "retention", "leaving") &&
    (has("why", "increase", "rising", "rose", "growing", "worsen", "trend", "cause", "driver", "driving") || mentionsDept)
  ) {
    return "attrition_trend_dept";
  }
  if (
    has("performance", "rating", "review") &&
    has("attendance", "absent", "absenteeism", "no-show", "late") &&
    has("declin", "drop", "down", "worsen", "fall", "slipp", "dip")
  ) {
    return "performance_attendance_decline";
  }
  if (has("skill") && has("gap", "missing", "deficit", "coverage", "roadmap", "shortage", "train", "upskill", "ai", "ml")) {
    return "skill_gaps";
  }
  if (
    has("candidate", "recruit", "talent", "applicant", "hiring", "shortlist", "hire", "pipeline", "sourc") &&
    (has("strongest", "best", "top", "compare", "match", "score", "recommend", "next", "shortlist", "for") || mentionsRole)
  ) {
    return "recruitment_candidates";
  }
  if (has("onboarding", "new hire", "new-hire", "recent hire", "recently joined", "on-board", "on board", "welcome")) {
    return "onboarding_at_risk";
  }
  if (has("risk") && has("summary", "overview", "month", "overall", "current", "standing", "brief", "update")) {
    return "workforce_risk_summary";
  }
  if (has("recommend", "what should", "should we", "action", "plan", "priorit", "improve", "what do we do")) {
    return "department_recommendations";
  }
  if (has("brief", "overview", "summary", "status", "update", "headline", "catch me up", "executive", "where do we stand")) {
    return "workforce_briefing";
  }
  return "general";
}

// ---------------------------------------------------------------------------
// 2. Lightweight roster (names/ids for classification + entity linking)
// ---------------------------------------------------------------------------

async function fetchRoster(): Promise<CopilotRoster> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { departments: [], roleTitles: [], skills: [], employees: [], candidates: [] };
  }

  const [empRes, jobRes, skillRes, candRes] = await Promise.all([
    supabase.from("employees").select("id, employment_status, profiles(full_name), roles(title), departments(name)"),
    supabase.from("jobs").select("id, title"),
    supabase.from("skills").select("id, name"),
    supabase.from("candidates").select("id, full_name, jobs(title)"),
  ]);

  const employees = ((empRes.data ?? []) as unknown as {
    id: string;
    employment_status: string;
    profiles: { full_name: string } | null;
    roles: { title: string } | null;
    departments: { name: string } | null;
  }[])
    .filter((e) => !EXCLUDED_STATUSES.includes(e.employment_status))
    .map((e) => ({
      id: e.id,
      name: e.profiles?.full_name ?? "Unknown",
      department: e.departments?.name ?? "Unassigned",
    }));

  return {
    departments: Array.from(new Set(employees.map((e) => e.department))).sort(),
    roleTitles: Array.from(
      new Set(
        ((jobRes.data ?? []) as { id: string; title: string }[])
          .map((j) => j.title)
          .filter((t): t is string => Boolean(t))
      )
    ),
    skills: ((skillRes.data ?? []) as { id: string; name: string }[]).map((s) => s.name),
    employees,
    candidates: ((candRes.data ?? []) as unknown as {
      id: string;
      full_name: string;
      jobs: { title: string } | null;
    }[]).map((c) => ({ id: c.id, name: c.full_name, jobTitle: c.jobs?.title ?? null })),
  };
}

// ---------------------------------------------------------------------------
// 3. Per-employee risk snapshot (attrition / performance / attendance intents)
// ---------------------------------------------------------------------------

async function fetchRiskSnapshot(): Promise<CopilotRiskSnapshot | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const [empRes, riskRes, reviewRes, attRes] = await Promise.all([
    supabase.from("employees").select("id, employment_status, profiles(full_name), roles(title), departments(name)"),
    supabase.from("risk_scores").select("employee_id, period, score, factors"),
    supabase.from("performance_reviews").select("employee_id, rating, period_end"),
    supabase.from("attendance").select("employee_id, date, status"),
  ]);
  if (empRes.error || riskRes.error || reviewRes.error || attRes.error) return null;

  const employees = ((empRes.data ?? []) as unknown as {
    id: string;
    employment_status: string;
    profiles: { full_name: string } | null;
    roles: { title: string } | null;
    departments: { name: string } | null;
  }[]).filter((e) => !EXCLUDED_STATUSES.includes(e.employment_status));

  const latestRisk = new Map<string, { score: number; period: string; factors: Record<string, unknown> | null }>();
  for (const r of (riskRes.data ?? []) as { employee_id: string; period: string; score: number | null; factors: Record<string, unknown> | null }[]) {
    if (r.score == null) continue;
    const cur = latestRisk.get(r.employee_id);
    if (!cur || r.period > cur.period) latestRisk.set(r.employee_id, { score: r.score, period: r.period, factors: r.factors });
  }

  const reviewsByEmp = new Map<string, { rating: number; period_end: string | null }[]>();
  for (const r of (reviewRes.data ?? []) as { employee_id: string; rating: number | null; period_end: string | null }[]) {
    if (r.rating == null) continue;
    const list = reviewsByEmp.get(r.employee_id) ?? [];
    list.push({ rating: r.rating, period_end: r.period_end });
    reviewsByEmp.set(r.employee_id, list);
  }
  for (const list of reviewsByEmp.values()) {
    list.sort((a, b) => (b.period_end ?? "").localeCompare(a.period_end ?? ""));
  }

  const attendanceByEmp = new Map<string, { date: string; status: string }[]>();
  for (const a of (attRes.data ?? []) as { employee_id: string; date: string; status: string }[]) {
    const list = attendanceByEmp.get(a.employee_id) ?? [];
    list.push(a);
    attendanceByEmp.set(a.employee_id, list);
  }

  const recentCutoff = new Date(Date.now() - 42 * 864e5).toISOString().slice(0, 10);
  const priorCutoff = new Date(Date.now() - 84 * 864e5).toISOString().slice(0, 10);

  function attendanceRates(empId: string): { recent: number | null; prior: number | null } {
    const rows = (attendanceByEmp.get(empId) ?? []).filter((a) => a.date >= priorCutoff);
    const recent = rows.filter((a) => a.date >= recentCutoff);
    const prior = rows.filter((a) => a.date < recentCutoff);
    const rate = (bucket: { status: string }[]): number | null => {
      if (bucket.length === 0) return null;
      return Math.round((bucket.filter((r) => PRESENT_STATUSES.has(r.status)).length / bucket.length) * 1000) / 10;
    };
    return { recent: rate(recent), prior: rate(prior) };
  }

  function factorsOf(factors: Record<string, unknown> | null | undefined): string[] {
    if (!factors || typeof factors !== "object") return [];
    return Object.entries(factors)
      .filter(([, weight]) => typeof weight === "number" && weight > 0.3)
      .map(([key]) => key.replace(/_/g, " "))
      .slice(0, 4);
  }

  function riskLevel(score: number): CopilotRiskEmployee["riskLevel"] {
    if (score >= 80) return "critical";
    if (score >= 65) return "high";
    if (score >= 45) return "medium";
    return "low";
  }

  const out: CopilotRiskEmployee[] = employees.map((e) => {
    const risk = latestRisk.get(e.id);
    const reviews = reviewsByEmp.get(e.id) ?? [];
    const att = attendanceRates(e.id);
    const declineFlags: ("performance" | "attendance")[] = [];
    if (reviews.length >= 2 && reviews[0].rating < reviews[1].rating) declineFlags.push("performance");
    if (att.recent != null && att.prior != null && att.recent < att.prior) declineFlags.push("attendance");

    return {
      id: e.id,
      name: e.profiles?.full_name ?? "Unknown",
      department: e.departments?.name ?? "Unassigned",
      role: e.roles?.title ?? "",
      riskScore: risk?.score ?? null,
      riskLevel: risk ? riskLevel(risk.score) : null,
      latestRating: reviews[0]?.rating ?? null,
      priorRating: reviews[1]?.rating ?? null,
      recentAttendancePct: att.recent,
      priorAttendancePct: att.prior,
      declineFlags,
      factors: factorsOf(risk?.factors),
    };
  });

  return { employees: out };
}

// ---------------------------------------------------------------------------
// 4. Context loader — only what the intent needs
// ---------------------------------------------------------------------------

interface IntentNeeds {
  briefing: boolean;
  risk: boolean;
  skills: boolean;
  onboarding: boolean;
  recruitment: boolean;
}

const INTENT_NEEDS: Record<CopilotIntent, IntentNeeds> = {
  attrition_risk_by_dept: { briefing: true, risk: true, skills: false, onboarding: false, recruitment: false },
  attrition_trend_dept: { briefing: true, risk: true, skills: false, onboarding: false, recruitment: false },
  performance_attendance_decline: { briefing: true, risk: true, skills: false, onboarding: false, recruitment: false },
  skill_gaps: { briefing: true, risk: false, skills: true, onboarding: false, recruitment: false },
  recruitment_candidates: { briefing: true, risk: false, skills: false, onboarding: false, recruitment: true },
  onboarding_at_risk: { briefing: true, risk: false, skills: false, onboarding: true, recruitment: false },
  workforce_risk_summary: { briefing: true, risk: true, skills: false, onboarding: false, recruitment: false },
  department_recommendations: { briefing: true, risk: true, skills: true, onboarding: true, recruitment: true },
  workforce_briefing: { briefing: true, risk: true, skills: true, onboarding: true, recruitment: true },
  general: { briefing: true, risk: true, skills: true, onboarding: true, recruitment: true },
};

async function loadContext(intent: CopilotIntent, question: string, history: string[]): Promise<CopilotContext> {
  const roster = await fetchRoster();
  const needs = INTENT_NEEDS[intent];

  const [brief, risk, skillGraph, onboarding, recruitment] = await Promise.all([
    needs.briefing ? buildWorkforceBriefing() : Promise.resolve(null),
    needs.risk ? fetchRiskSnapshot() : Promise.resolve(null),
    needs.skills ? fetchSkillGraphData() : Promise.resolve(null),
    needs.onboarding ? fetchOnboardingOverview() : Promise.resolve(null),
    needs.recruitment ? fetchRecruitmentData() : Promise.resolve(null),
  ]);

  return {
    question,
    history,
    roster,
    briefing: brief?.package ?? null,
    risk,
    skillGraph,
    onboarding,
    recruitment,
  };
}

// ---------------------------------------------------------------------------
// 5. Signal-package formatters (numbers first, exact names)
// ---------------------------------------------------------------------------

function pctValue(n: number | null | undefined): string {
  return n == null ? "n/a" : `${Math.round(n * 10) / 10}%`;
}

function truncate<T>(items: T[], top: number): T[] {
  return items.slice(0, top);
}

function fmtDept(d: WorkforceDataPackage["departments"][number]): string {
  const risk = d.avgRiskScore == null ? "n/a" : `${d.avgRiskScore}`;
  return (
    `${d.department}: headcount ${d.headcount}, avg perf ${d.avgPerformance ?? "n/a"}, goal completion ${pctValue(d.goalCompletionPct)}, ` +
    `attendance ${pctValue(d.attendanceRatePct)} (variability ${pctValue(d.attendanceVariabilityPct)}), negative feedback ${d.negativeFeedbackCount}, ` +
    `high risk count ${d.highRiskCount}, avg risk ${risk}, risk trend delta ${d.riskTrendDelta ?? "n/a"}, skill coverage ${pctValue(d.skillCoveragePct)}, open roles ${d.openRolesCount}`
  );
}

function fmtRiskEmployee(e: CopilotRiskEmployee): string {
  const perf = e.latestRating != null ? `perf ${e.latestRating}${e.priorRating != null ? ` (was ${e.priorRating})` : ""}` : "perf n/a";
  const att = e.recentAttendancePct != null ? `attendance ${e.recentAttendancePct}${e.priorAttendancePct != null ? ` (was ${e.priorAttendancePct})` : ""}` : "attendance n/a";
  const drivers = e.factors.length ? ` drivers: ${e.factors.join(", ")}` : "";
  const decline = e.declineFlags.length ? ` declining: ${e.declineFlags.join("+")}` : "";
  return `${e.name} (${e.department}) — risk ${e.riskScore ?? "n/a"} (${e.riskLevel ?? "unknown"}), ${perf}, ${att}${decline}${drivers}`;
}

function fmtSkillRow(s: SkillGraphRow): string {
  return `${s.skill} (${s.category}): required ${s.required}, available ${s.available}, gap ${s.gap}, coverage ${pctValue(s.coverage_pct)}`;
}

function entityPromptBlock(ctx: CopilotContext): string {
  return (
    "AVAILABLE NAMES YOU MAY REFERENCE (use these verbatim in relevant_departments / relevant_employees / relevant_candidates):\n" +
    `- Departments: ${ctx.roster.departments.join(", ") || "none"}\n` +
    `- Employees: ${ctx.roster.employees.map((e) => e.name).join(", ") || "none"}\n` +
    `- Candidates: ${ctx.roster.candidates.map((c) => c.name).join(", ") || "none"}`
  );
}

function buildContextString(intent: CopilotIntent, ctx: CopilotContext): string {
  const pkg = ctx.briefing;
  const blocks: string[] = [];

  if (intent === "attrition_risk_by_dept" && pkg) {
    const depts = [...pkg.departments]
      .filter((d) => d.avgRiskScore != null)
      .sort((a, b) => (b.avgRiskScore ?? 0) - (a.avgRiskScore ?? 0));
    blocks.push("DEPARTMENTS BY ATTRITION RISK (highest first)");
    blocks.push(depts.map((d) => `- ${fmtDept(d)}`).join("\n") || "- no department risk data");
    const highRisk = (ctx.risk?.employees ?? [])
      .filter((e) => (e.riskScore ?? 0) >= 45)
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    blocks.push("HIGH/MEDIUM RISK EMPLOYEES (top 10)");
    blocks.push(truncate(highRisk, 10).map((e) => `- ${fmtRiskEmployee(e)}`).join("\n") || "- none");
  } else if (intent === "attrition_trend_dept" && pkg) {
    const depts = [...pkg.departments].filter((d) => d.riskTrendDelta != null || d.highRiskCount > 0);
    blocks.push("DEPARTMENT ATTRITION DETAIL");
    blocks.push(depts.map((d) => `- ${fmtDept(d)}`).join("\n") || "- no department signal data");
    const riskEmp = (ctx.risk?.employees ?? []).filter((e) => (e.riskScore ?? 0) >= 45);
    blocks.push("RISK EMPLOYEES (relevant)");
    blocks.push(truncate(riskEmp, 15).map((e) => `- ${fmtRiskEmployee(e)}`).join("\n") || "- none");
    if (pkg.risk.topDrivers.length) {
      blocks.push("TOP RISK DRIVERS");
      blocks.push(pkg.risk.topDrivers.map((d) => `- ${d.driver}: ${d.employees} employees`).join("\n"));
    }
    if (pkg.goalsByEmployee.length) {
      blocks.push("LOWEST GOAL COMPLETION (top 5)");
      blocks.push(truncate(pkg.goalsByEmployee.filter((g) => g.completionPct < 100), 5).map((g) => `- ${g.employee} (${g.department}): ${g.completionPct}%`).join("\n") || "- none");
    }
  } else if (intent === "performance_attendance_decline") {
    const declining = (ctx.risk?.employees ?? []).filter((e) => e.declineFlags.length > 0);
    blocks.push("EMPLOYEES WITH DECLINING PERFORMANCE AND/OR ATTENDANCE");
    blocks.push(truncate(declining, 15).map((e) => `- ${fmtRiskEmployee(e)}`).join("\n") || "- none currently detected");
    if (pkg) {
      blocks.push("ORG PERFORMANCE + ATTENDANCE TREND (last 6 months)");
      blocks.push(`- Performance: ${pkg.trends.performance.map((p) => `${p.month}=${p.value}`).join(", ") || "no data"}`);
      blocks.push(`- Attendance: ${pkg.trends.attendance.map((p) => `${p.month}=${p.value}%`).join(", ") || "no data"}`);
    }
    const noDeclineCount = (ctx.risk?.employees ?? []).length;
    blocks.push(`Total active employees in snapshot: ${noDeclineCount}`);
  } else if (intent === "skill_gaps") {
    const rows = ctx.skillGraph?.rows ?? [];
    const aiFocus = AI_KEYWORDS.some((k) => ctx.question.toLowerCase().includes(k));
    const filtered = aiFocus
      ? rows.filter((r) => AI_KEYWORDS.some((k) => `${r.skill} ${r.category}`.toLowerCase().includes(k)))
      : rows;
    const sorted = [...filtered].sort((a, b) => b.gap - a.gap || b.required - a.required);
    blocks.push("SKILL GAPS (sorted by largest first)");
    blocks.push(truncate(sorted, 12).map((r) => `- ${fmtSkillRow(r)}`).join("\n") || "- no skill rows available");
    if (ctx.skillGraph) {
      blocks.push(`ORGANIZATION: overall skill coverage ${pctValue(ctx.skillGraph.coverage_pct)}, ${ctx.skillGraph.totalSkills} skills tracked`);
    }
    if (aiFocus) {
      blocks.push("NOTE: question references AI/ML — only AI/ML/data-adjacent skills were considered above.");
    }
  } else if (intent === "recruitment_candidates") {
    const candidates = ctx.recruitment?.candidates ?? [];
    const roleMatch = ctx.roster.roleTitles.find((t) => t.length > 3 && ctx.question.toLowerCase().includes(t.toLowerCase()));
    const pool = candidates
      .filter((c) => !roleMatch || (c.job_title ?? "").toLowerCase().includes(roleMatch.toLowerCase()))
      .filter((c) => c.assessment != null)
      .sort((a, b) => (b.assessment?.overall_match ?? 0) - (a.assessment?.overall_match ?? 0));
    blocks.push(`CANDIDATES WITH MATCH SCORES ${roleMatch ? `FOR ROLE "${roleMatch}"` : "(all roles)"}`);
    blocks.push(
      truncate(pool, 10)
        .map(
          (c) =>
            `- ${c.full_name} | job ${c.job_title ?? "n/a"} | status ${c.status} | match ${c.assessment?.overall_match ?? "-"} | ` +
            `recommendation ${c.assessment?.recommendation ?? "n/a"}` +
            `${c.assessment?.strengths?.length ? ` | strengths: ${c.assessment.strengths.slice(0, 3).join("; ")}` : ""}` +
            `${c.assessment?.missing_requirements?.length ? ` | missing: ${c.assessment.missing_requirements.slice(0, 3).join("; ")}` : ""}`
        )
        .join("\n") || "- no assessed candidates to compare"
    );
    if (pkg) {
      blocks.push("RECRUITMENT PIPELINE");
      blocks.push(
        `- Open roles: ${pkg.recruitment.openRoles}; active candidates: ${pkg.recruitment.activeCandidates}; hired last 90 days: ${pkg.recruitment.hiredLast90Days}; avg days since applied: ${pkg.recruitment.avgDaysSinceApplied ?? "n/a"}`
      );
      if (pkg.recruitment.byStage.length) {
        blocks.push(`- Pipeline by stage: ${pkg.recruitment.byStage.map((s) => `${s.stage} ${s.count}`).join(", ")}`);
      }
    }
  } else if (intent === "onboarding_at_risk") {
    const list = ctx.onboarding ?? [];
    const atRisk = list
      .filter((o) => o.overallStatus === "at_risk" || o.counts.overdue > 0 || o.counts.blocked > 0 || o.progressPct < 70)
      .sort((a, b) => (a.progressPct ?? 0) - (b.progressPct ?? 0));
    blocks.push("ONBOARDING STATUS BY EMPLOYEE (at risk first)");
    blocks.push(
      truncate(atRisk, 15)
        .map(
          (o) =>
            `- ${o.name} (${o.department}) | joined ${o.joined ?? "n/a"} | progress ${o.progressPct}% | status ${o.overallStatus} | ` +
            `overdue ${o.counts.overdue} | blocked ${o.counts.blocked} | total ${o.counts.total}`
        )
        .join("\n") || "- no onboarding plans currently behind"
    );
    if (pkg) {
      blocks.push(`ONBOARDING AGGREGATE: active plans ${pkg.onboarding.activePlans}, delayed tasks ${pkg.onboarding.delayedTasks}, overdue task pct ${pctValue(pkg.onboarding.overdueTaskPct)}, avg progress ${pctValue(pkg.onboarding.avgProgressPct)}`);
    }
  } else if (intent === "workforce_risk_summary" && pkg) {
    blocks.push("RISK SUMMARY");
    blocks.push(`- High risk: ${pkg.risk.highRiskCount}; critical: ${pkg.risk.criticalRiskCount}; ${pctValue(pkg.risk.highOrCriticalPct)} of workforce`);
    if (pkg.risk.topDrivers.length) {
      blocks.push(`- Top drivers: ${pkg.risk.topDrivers.map((d) => `${d.driver} (${d.employees})`).join(", ")}`);
    }
    blocks.push("DEPARTMENTS");
    blocks.push(pkg.departments.map((d) => `- ${fmtDept(d)}`).join("\n"));
    blocks.push("TRENDS (last 6 months)");
    blocks.push(`- Performance: ${pkg.trends.performance.map((p) => `${p.month}=${p.value}`).join(", ") || "no data"}`);
    blocks.push(`- Attendance: ${pkg.trends.attendance.map((p) => `${p.month}=${p.value}%`).join(", ") || "no data"}`);
    blocks.push(`- Goals: ${pkg.trends.goals.map((p) => `${p.month}=${p.value}%`).join(", ") || "no data"}`);
    const high = (ctx.risk?.employees ?? []).filter((e) => (e.riskScore ?? 0) >= 65).sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    blocks.push("HIGH RISK EMPLOYEES (top 8)");
    blocks.push(truncate(high, 8).map((e) => `- ${fmtRiskEmployee(e)}`).join("\n") || "- none");
  } else if (intent === "department_recommendations" && pkg) {
    const depts = [...pkg.departments].sort((a, b) => (b.avgRiskScore ?? 0) - (a.avgRiskScore ?? 0));
    blocks.push("DEPARTMENTS (all, by avg risk)");
    blocks.push(depts.map((d) => `- ${fmtDept(d)}`).join("\n") || "- no department data");
    const high = (ctx.risk?.employees ?? []).filter((e) => (e.riskScore ?? 0) >= 45).sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    blocks.push("RISK EMPLOYEES (top 10)");
    blocks.push(truncate(high, 10).map((e) => `- ${fmtRiskEmployee(e)}`).join("\n") || "- none");
    blocks.push("SKILL GAPS (top 8)");
    blocks.push(
      truncate([...(ctx.skillGraph?.topGaps ?? [])], 8).map((r) => `- ${fmtSkillRow(r)}`).join("\n") || "- no skill data"
    );
    blocks.push("ONBOARDING AT RISK");
    blocks.push(
      truncate(
        (ctx.onboarding ?? []).filter((o) => o.overallStatus === "at_risk" || o.counts.overdue > 0 || o.progressPct < 70),
        6
      )
        .map((o) => `- ${o.name} (${o.department}) progress ${o.progressPct}%, overdue ${o.counts.overdue}`)
        .join("\n") || "- none"
    );
    blocks.push("RECRUITMENT PIPELINE");
    blocks.push(
      `- Open roles: ${pkg.recruitment.openRoles}; active candidates: ${pkg.recruitment.activeCandidates}; hired last 90 days: ${pkg.recruitment.hiredLast90Days}`
    );
  } else if (intent === "workforce_briefing" && pkg) {
    blocks.push(prepareBriefingPrompt(pkg).trim());
    const high = (ctx.risk?.employees ?? []).filter((e) => (e.riskScore ?? 0) >= 65).sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    if (high.length) {
      blocks.push("HIGH RISK EMPLOYEES (top 5)");
      blocks.push(truncate(high, 5).map((e) => `- ${fmtRiskEmployee(e)}`).join("\n"));
    }
  } else if (pkg) {
    blocks.push(prepareBriefingPrompt(pkg).trim());
    const high = (ctx.risk?.employees ?? []).filter((e) => (e.riskScore ?? 0) >= 45).sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    if (high.length) {
      blocks.push("HIGH/MEDIUM RISK EMPLOYEES (top 6)");
      blocks.push(truncate(high, 6).map((e) => `- ${fmtRiskEmployee(e)}`).join("\n"));
    }
    if (ctx.skillGraph?.topGaps?.length) {
      blocks.push("TOP SKILL GAPS");
      blocks.push(truncate(ctx.skillGraph.topGaps, 5).map((r) => `- ${fmtSkillRow(r)}`).join("\n"));
    }
    const atRisk = (ctx.onboarding ?? []).filter((o) => o.overallStatus === "at_risk" || o.counts.overdue > 0);
    if (atRisk.length) {
      blocks.push("ONBOARDING BEHIND");
      blocks.push(truncate(atRisk, 5).map((o) => `- ${o.name} (${o.department}) progress ${o.progressPct}%`).join("\n"));
    }
  }

  if (blocks.length === 0) {
    blocks.push("No workforce data was available for this question.");
  }

  return [entityPromptBlock(ctx), blocks.join("\n\n")].join("\n\n");
}

// ---------------------------------------------------------------------------
// 6. Gemini call
// ---------------------------------------------------------------------------

function buildPrompt(ctx: CopilotContext, contextString: string): string {
  const historyBlock =
    ctx.history.length > 0
      ? `PRIOR CONVERSATION (context only):\n${ctx.history.map((h, i) => `${i + 1}. ${h}`).join("\n")}`
      : "No prior conversation.";

  return `${historyBlock}

USER QUESTION:
"${ctx.question}"

Answer the question about the CURRENT workforce using the provided context. The context is a snapshot generated moments ago.

${contextString}

RULES:
- The answer must be grounded in the context above. Quote exact numbers in evidence.
- Keep the answer concise (2-4 sentences), then provide recommended actions (max 5).
- Recommended actions should be concrete and actionable for HR (e.g. 'Schedule 1:1s with <name>', 'Launch upskilling track for <skill>').
- Only put entity names in relevant_* lists if they appear verbatim in AVAILABLE NAMES.
Return ONLY valid JSON matching the requested schema.`;
}

async function answerFromModel(ctx: CopilotContext, contextString: string): Promise<CopilotAnswer> {
  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt: buildPrompt(ctx, contextString),
    schema: copilotAnswerSchema,
    temperature: 0.2,
  });
  return normalizeCopilotAnswer(parsed);
}

// ---------------------------------------------------------------------------
// 7. Entity enrichment (attach stable ids for clickable links)
// ---------------------------------------------------------------------------

function enrichAnswer(answer: CopilotAnswer, roster: CopilotRoster): CopilotAnswer {
  const empByName = new Map<string, { id: string; department: string }>();
  for (const e of roster.employees) empByName.set(e.name.trim().toLowerCase(), { id: e.id, department: e.department });
  const candByName = new Map<string, { id: string; jobTitle: string | null }>();
  for (const c of roster.candidates) candByName.set(c.name.trim().toLowerCase(), { id: c.id, jobTitle: c.jobTitle });

  return {
    ...answer,
    relevant_employees: answer.relevant_employees.map((e) => {
      const hit = empByName.get(e.name.trim().toLowerCase());
      return hit ? { ...e, id: hit.id } : e;
    }),
    relevant_candidates: answer.relevant_candidates.map((c) => {
      const hit = candByName.get(c.name.trim().toLowerCase());
      return hit ? { ...c, id: hit.id } : c;
    }),
  };
}

// ---------------------------------------------------------------------------
// Entry point (invoked by the "use server" action in lib/ai/actions.ts)
// ---------------------------------------------------------------------------

export async function generateCopilotAnswer(question: string, history: string[] = []): Promise<CopilotAnswerOutcome> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Ask a question first.");
  }

  const roster = await fetchRoster();
  const intent = classifyCopilotIntent(trimmed, {
    departments: roster.departments,
    roleTitles: roster.roleTitles,
  });

  const ctx = await loadContext(intent, trimmed, history);
  const contextString = buildContextString(intent, ctx);
  const answer = await answerFromModel(ctx, contextString);

  return { intent, answer: enrichAnswer(answer, roster) };
}