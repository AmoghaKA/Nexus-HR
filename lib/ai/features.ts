import { buildWorkforceBriefing, prepareBriefingPrompt } from "@/lib/ai/briefing";
import { buildEmployeeAnalysis, prepareEmployeePrompt, type EmployeeAnalysisPackage } from "@/lib/ai/employee";
import { fetchEmployeeDetail } from "@/lib/hr/directory";
import { generateStructuredJSON } from "@/lib/ai/router";
import {
  attritionReportSchema,
  candidateRankingSchema,
  careerRecommendationsSchema,
  employeeAnalysisSchema,
  insightsWrapperSchema,
  interviewEvaluationSchema,
  interviewQuestionsSchema,
  onboardingPlanSchema,
  performanceAnalysisSchema,
  policyAnswerSchema,
  skillRecommendationSchema,
  type AttritionReport,
  type CandidateRanking,
  type CareerRecommendations,
  type EmployeeAnalysis,
  type GeminiInsight,
  type InterviewEvaluation,
  type InterviewQuestions,
  type OnboardingPlan,
  type PerformanceAnalysis,
  type PolicyAnswer,
  type SkillRecommendationReport,
  normalizeAttritionReport,
  normalizeCandidateRanking,
  normalizeCareerRecommendations,
  normalizeEmployeeAnalysis,
  normalizeInsights,
  normalizeInterviewEvaluation,
  normalizeInterviewQuestions,
  normalizeOnboardingPlan,
  normalizePerformanceAnalysis,
  normalizePolicyAnswer,
  normalizeSkillRecommendations,
} from "@/lib/ai/schemas";
import type { AiInsight } from "@/types";
import { saveInsights, toInsightRecord } from "@/lib/ai/store";
import { getSupabaseServer } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Responsible AI guardrails — attached to every Gemini request.
// ---------------------------------------------------------------------------

const SYSTEM_GUARDRAILS = [
  "You are WorkforceIQ's HR analytics AI. You reason ONLY over the structured workforce data provided to you — never invent facts or numbers.",
  "NEVER use or infer protected characteristics (gender, age, race, ethnicity, religion, marital or family status, disability, nationality) for attrition, performance, or any analysis.",
  "Never present a decision as definitive. Frame risk probabilistically, e.g. 'the AI risk estimate indicates elevated attrition risk' — never 'this employee WILL leave'.",
  "Every insight must be grounded in the evidence provided and must explain WHY it was generated (reasoning). If evidence is thin, reflect that in confidence and say so.",
  "Always return ONLY valid JSON in exactly the shape requested. Do not include prose outside the JSON object.",
].join("\n");

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function requireSupabase() {
  const supabase = getSupabaseServer();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add SUPABASE_SERVICE_ROLE_KEY (or the anon key) to .env.local.");
  }
  return supabase;
}

function checkQuery(label: string, res: { error: { message: string } | null }) {
  if (res.error) throw new Error(`Failed to load ${label}: ${res.error.message}`);
}

async function persistInsights(
  label: string,
  records: Parameters<typeof saveInsights>[0]
): Promise<{ saved: number; persistError?: string }> {
  const result = await saveInsights(records);
  if (result.error) {
    console.warn(`AI layer [${label}]: insight persistence failed: ${result.error}`);
  }
  return { saved: result.saved, persistError: result.error };
}

function insightFromAiInsight(i: AiInsight): GeminiInsight {
  return {
    title: i.title,
    severity: (["low", "medium", "high", "critical"].includes(i.severity ?? "") ? i.severity! : "medium") as GeminiInsight["severity"],
    summary: i.summary,
    evidence: i.evidence ?? [],
    reasoning: i.reasoning ?? "",
    confidence: i.confidence,
    recommended_action: i.recommendedAction,
    action_type: "",
    affected_entities: [],
  };
}

// ---------------------------------------------------------------------------
// 1. Workforce Brief
// ---------------------------------------------------------------------------

export interface GenerateWorkforceBriefResult {
  insights: GeminiInsight[];
  brief: { generatedAt: string; signalCount: number };
  saved: number;
  persistError?: string;
}

export async function generateWorkforceBrief(): Promise<GenerateWorkforceBriefResult> {
  const { package: pkg, insights } = await buildWorkforceBriefing();

  const prompt = [
    prepareBriefingPrompt(pkg),
    "",
    "Produce 4-7 workforce insights as JSON in this shape:",
    '{"insights":[{"title":"...","severity":"low|medium|high|critical","summary":"...","evidence":["..."],"reasoning":"why this matters","confidence":0.0,"recommended_action":"...","action_type":"monitor|check-in|training|review|offer|escalate","affected_entities":["..."]}]}',
    "",
    "Cover a mix of: workforce risks, opportunities, emerging trends, skill gaps, recruitment concerns, and onboarding issues.",
    "Keep evidence quantitative and taken verbatim from the data above.",
  ].join("\n");

  const parsed = await generateStructuredJSON<{ insights: unknown[] }>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: insightsWrapperSchema,
    temperature: 0.25,
  });

  let normalized = normalizeInsights(parsed);
  if (normalized.length === 0) {
    // Fall back to deterministic signal derivation when the model is empty.
    normalized = insights.map(insightFromAiInsight);
  }

  const records = normalized.map((insight) => toInsightRecord(insight));
  const { saved, persistError } = await persistInsights("workforce-brief", records);

  return {
    insights: normalized,
    brief: { generatedAt: pkg.generatedAt, signalCount: insights.length },
    saved,
    persistError,
  };
}

// ---------------------------------------------------------------------------
// 2. Employee Analysis
// ---------------------------------------------------------------------------

export interface AnalyzeEmployeeResult {
  analysis: EmployeeAnalysis;
  package: EmployeeAnalysisPackage;
  saved: number;
  persistError?: string;
}

export async function analyzeEmployee(employeeId: string): Promise<AnalyzeEmployeeResult> {
  const detail = await fetchEmployeeDetail(employeeId);
  if (!detail) throw new Error("Employee not found.");

  const pkg = buildEmployeeAnalysis(detail);
  const prompt = [
    prepareEmployeePrompt(pkg),
    "",
    "Return a structured employee analysis as JSON with this shape:",
    '{"summary":"...","strengths":["..."],"development_areas":["..."],"skill_gaps":["..."],"performance_trend":{"direction":"up|down|flat","description":"..."},"engagement_signals":["..."],"risk_signals":["..."],"recommended_actions":["..."],"insights":[{"title":"...","severity":"low|medium|high|critical","summary":"...","evidence":["..."],"reasoning":"...","confidence":0.0,"recommended_action":"...","action_type":"monitor|check-in|training|review|offer|escalate","affected_entities":["..."]}],"confidence":0.0}',
    "",
    "Use supportive, coaching language. For risk-related output, use the phrasing 'the AI risk estimate indicates elevated attrition risk'.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: employeeAnalysisSchema,
    temperature: 0.3,
  });

  const analysis = normalizeEmployeeAnalysis(parsed);

  // Ensure at least the deterministic signals are present.
  let insights = analysis.insights;
  if (insights.length === 0) {
    insights = pkg.insights.map(insightFromAiInsight);
    analysis.insights = insights;
  } else {
    analysis.insights = insights;
  }

  const records = insights.map((insight) => toInsightRecord(insight));
  const { saved, persistError } = await persistInsights(`employee-analysis:${employeeId}`, records.map((r) => ({ ...r, employeeId })));

  return { analysis, package: pkg, saved, persistError };
}

// ---------------------------------------------------------------------------
// 3. Attrition Insights
// ---------------------------------------------------------------------------

export interface CalculateAttritionInsightsResult {
  report: AttritionReport;
  employeeRisks?: Array<{
    employeeId: string;
    name: string;
    department: string;
    riskScore: number; // 0-100
    supportingSignals: string[];
    trend: "up" | "down" | "flat";
    aiExplanation: string;
    recommendedAction: string;
  }>;
  departmentRisk?: Array<{
    department: string;
    avgRiskScore: number;
    highRiskCount: number;
    riskTrend: "up" | "down" | "flat";
    topDrivers: string[];
  }>;
  saved: number;
  persistError?: string;
}

function riskExplanation(signals: string[], baseScore: number): string {
  const lines = signals.map((s) => `  ${s}`).join("\n");
  return `The AI risk estimate (${Math.round(baseScore)}/100) is based on workforce signals:\n${lines || "  Insufficient signals to form a strong signal pattern."}\nUse this estimate as input to an HR review — not as an employment decision.`;
}

function levelFromScore(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function actionForSignals(signals: string[]): string {
  if (signals.some((s) => /goal|performance|workload/i.test(s))) return "Review workload";
  if (signals.some((s) => /training|skill/i.test(s))) return "Recommend training";
  if (signals.some((s) => /progression|career|promotion/i.test(s))) return "Discuss career development";
  return "Schedule manager check-in";
}

/** Risk trend (up = risk increasing) derived from signal deltas and stored risk scores. */
function riskTrend(
  attDelta: number | null,
  gDelta: number | null,
  storedPrev: number | null,
  storedLatest: number | null
): "up" | "down" | "flat" {
  if (storedPrev != null && storedLatest != null) {
    if (storedLatest >= storedPrev + 5) return "up";
    if (storedLatest <= storedPrev - 5) return "down";
  }
  const negativeDeltas = (attDelta != null && attDelta < 0 ? 1 : 0) + (gDelta != null && gDelta < 0 ? 1 : 0);
  if (negativeDeltas >= 2) return "up";
  const positiveDeltas = (attDelta != null && attDelta > 0 ? 1 : 0) + (gDelta != null && gDelta > 0 ? 1 : 0);
  if (positiveDeltas >= 2 && negativeDeltas === 0) return "down";
  return "flat";
}

export async function calculateAttritionInsights(): Promise<CalculateAttritionInsightsResult> {
  const supabase = requireSupabase();

  const [riskRes, attRes, leaveRes, goalRes, perfRes, fbRes, trainingRes, empRes] = await Promise.all([
    supabase.from("risk_scores").select("employee_id, period, score, level, factors"),
    supabase.from("attendance").select("employee_id, date, status"),
    supabase.from("leave_requests").select("employee_id, type, days, status, created_at"),
    supabase.from("goals").select("employee_id, title, status, progress, due_date"),
    supabase.from("performance_reviews").select("employee_id, rating, period_end, submitted_at"),
    supabase.from("feedback").select("to_employee_id, category, message, created_at"),
    supabase.from("employee_training").select("employee_id, status, enrolled_at, completed_at"),
    supabase.from("employees").select("id, employment_status, date_of_joining, experience_years, role_id, profiles(full_name), departments(name), roles(title), manager_id"),
  ]);
  checkQuery("risk_scores", riskRes);
  checkQuery("attendance", attRes);
  checkQuery("leave_requests", leaveRes);
  checkQuery("goals", goalRes);
  checkQuery("performance_reviews", perfRes);
  checkQuery("feedback", fbRes);
  checkQuery("employee_training", trainingRes);
  checkQuery("employees", empRes);

  const risks = (riskRes.data ?? []) as { employee_id: string; period: string; score: number | null; level: string | null; factors: Record<string, unknown> | null }[];
  const attendance = (attRes.data ?? []) as { employee_id: string; date: string; status: string }[];
  const leaves = (leaveRes.data ?? []) as { employee_id: string; type: string; days: number | null; status: string; created_at: string | null }[];
  const goals = (goalRes.data ?? []) as { employee_id: string; title: string; status: string; progress: number | null; due_date: string | null }[];
  const reviews = (perfRes.data ?? []) as { employee_id: string; rating: number | null; period_end: string | null; submitted_at: string | null }[];
  const feedback = (fbRes.data ?? []) as { to_employee_id: string; category: string | null; message: string | null; created_at: string | null }[];
  const training = (trainingRes.data ?? []) as { employee_id: string; status: string; enrolled_at: string | null; completed_at: string | null }[];
  const employees = (empRes.data ?? []) as unknown as { id: string; employment_status: string; date_of_joining: string | null; experience_years: number | null; role_id: string | null; profiles: { full_name: string } | null; departments: { name: string } | null; roles: { title: string } | null; manager_id: string | null }[];

  const activeDept = new Set(["active", "probation", "on_leave"]);
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const activeIds = new Set(employees.filter((e) => activeDept.has(e.employment_status)).map((e) => e.id));

  // -------------------------------------------------------------------------
  // Deterministic signal aggregation per employee
  // -------------------------------------------------------------------------
  const thisYear = `${new Date().getFullYear()}-01-01`;

  // Latest + prior risk period score per employee.
  const scoresByEmp = new Map<string, { period: string; score: number }[]>();
  for (const r of risks) {
    if (r.score == null) continue;
    const arr = scoresByEmp.get(r.employee_id) ?? [];
    arr.push({ period: r.period, score: r.score });
    scoresByEmp.set(r.employee_id, arr);
  }
  const latest = new Map<string, { period: string; score: number; level: string | null; factors: Record<string, unknown> | null }>();
  const prevScore = new Map<string, number>();
  for (const [id, arr] of scoresByEmp) {
    const sorted = arr.slice().sort((a, b) => (a.period > b.period ? -1 : 1));
    const mostRecent = sorted[0];
    const prior = sorted[1];
    const riskRow = risks.find((r) => r.employee_id === id && r.period === mostRecent.period);
    latest.set(id, { period: mostRecent.period, score: mostRecent.score, level: riskRow?.level ?? null, factors: riskRow?.factors ?? null });
    if (prior) prevScore.set(id, prior.score);
  }

  // Attendance rate (trailing 12 weeks) and attendance trend (compare last 6 vs prior 6).
  const attCutoff = new Date(Date.now() - 168 * 864e5).toISOString().slice(0, 10);
  const attWindows = new Map<string, { recent: { present: number; total: number }; prior: { present: number; total: number } }>();
  for (const a of attendance) {
    if (a.date < attCutoff) continue;
    const w = attWindows.get(a.employee_id) ?? { recent: { present: 0, total: 0 }, prior: { present: 0, total: 0 } };
    const inRecent = a.date >= new Date(Date.now() - 84 * 864e5).toISOString().slice(0, 10);
    const window = inRecent ? w.recent : w.prior;
    window.total += 1;
    if (["present", "late", "half_day", "wfh"].includes(a.status)) window.present += 1;
    attWindows.set(a.employee_id, w);
  }
  const attRate = new Map<string, number>();
  const attTrendDelta = new Map<string, number>();
  for (const [id, w] of attWindows) {
    const recent = w.recent.total ? (w.recent.present / w.recent.total) * 100 : null;
    const prior = w.prior.total ? (w.prior.present / w.prior.total) * 100 : null;
    if (recent != null) attRate.set(id, Math.round(recent * 10) / 10);
    if (recent != null && prior != null) attTrendDelta.set(id, Math.round((recent - prior) * 10) / 10);
  }

  // Leave patterns: approved/sick leave days within the last 180 days.
  const leaveDays = new Map<string, number>();
  const leaveCutoff = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
  for (const l of leaves) {
    if (!["approved", "pending", "rejected"].includes(l.status)) continue;
    if (l.created_at != null && l.created_at < leaveCutoff) continue;
    leaveDays.set(l.employee_id, (leaveDays.get(l.employee_id) ?? 0) + (l.days ?? 1));
  }

  // Goal completion per employee.
  const goalPct = new Map<string, number>();
  const goalDelta = new Map<string, number>();
  const goalsByEmp = new Map<string, { done: number; total: number; doneOld: number; totalOld: number }>();
  const goalEndCutoff = new Date();
  goalEndCutoff.setMonth(goalEndCutoff.getMonth() - 3);
  const goalEndISO = goalEndCutoff.toISOString().slice(0, 10);
  for (const g of goals) {
    if (!["active", "completed"].includes(g.status)) continue;
    const b = goalsByEmp.get(g.employee_id) ?? { done: 0, total: 0, doneOld: 0, totalOld: 0 };
    const done = g.status === "completed" || (g.progress ?? 0) >= 100;
    const isRecent = g.due_date == null || g.due_date >= goalEndISO;
    b.total += 1;
    if (done) b.done += 1;
    if (!isRecent) {
      b.totalOld += 1;
      if (done) b.doneOld += 1;
    }
    goalsByEmp.set(g.employee_id, b);
  }
  for (const [id, b] of goalsByEmp) {
    goalPct.set(id, b.total ? Math.round((b.done / b.total) * 100) : 0);
    const oldPct = b.totalOld ? (b.doneOld / b.totalOld) * 100 : null;
    const curPct = b.total ? (b.done / b.total) * 100 : null;
    if (curPct != null && oldPct != null) goalDelta.set(id, Math.round((curPct - oldPct) * 10) / 10);
  }

  // Performance trend: latest rating vs earlier rating across submitted reviews.
  const perfLatest = new Map<string, number>();
  const perfPrev = new Map<string, number>();
  const perfRowsByEmp = new Map<string, { period: string; rating: number }[]>();
  for (const r of reviews) {
    if (r.rating == null) continue;
    const arr = perfRowsByEmp.get(r.employee_id) ?? [];
    arr.push({ period: r.period_end ?? r.submitted_at ?? "", rating: r.rating });
    perfRowsByEmp.set(r.employee_id, arr);
  }
  for (const [id, arr] of perfRowsByEmp) {
    const sorted = arr.slice().sort((a, b) => (a.period > b.period ? -1 : 1));
    const latestR = sorted[0];
    const priorR = sorted[1];
    if (latestR) perfLatest.set(id, latestR.rating);
    if (priorR) perfPrev.set(id, priorR.rating);
  }

  // Feedback sentiment: negative (constructive/engagement/manager) and positive (praise/peer) this year.
  const negativeFb = new Map<string, number>();
  const positiveFb = new Map<string, number>();
  const disengagementPhrases = ["disengage", "burnout", "leave", "quit", "unhappy", "stressed", "overwhelmed", "not challenged", "considering"];
  const disengagementFb = new Map<string, number>();
  for (const f of feedback) {
    if (f.created_at != null && f.created_at < thisYear) continue;
    const cat = f.category ?? "";
    if (["constructive", "engagement", "manager"].includes(cat)) {
      negativeFb.set(f.to_employee_id, (negativeFb.get(f.to_employee_id) ?? 0) + 1);
    } else if (["praise", "peer"].includes(cat)) {
      positiveFb.set(f.to_employee_id, (positiveFb.get(f.to_employee_id) ?? 0) + 1);
    }
    const msg = (f.message ?? "").toLowerCase();
    if (msg && disengagementPhrases.some((p) => msg.includes(p))) {
      disengagementFb.set(f.to_employee_id, (disengagementFb.get(f.to_employee_id) ?? 0) + 1);
    }
  }

  // Tenure years.
  const tenure = new Map<string, number>();
  for (const e of employees) {
    if (e.date_of_joining) {
      const ms = Date.now() - new Date(e.date_of_joining).getTime();
      tenure.set(e.id, Math.max(0, Math.round((ms / (365.25 * 864e5)) * 10) / 10));
    }
  }

  // Training activity: completed courses count + active/enrolled.
  const trainingDone = new Map<string, number>();
  const trainingActive = new Map<string, number>();
  for (const t of training) {
    if (t.status === "completed") trainingDone.set(t.employee_id, (trainingDone.get(t.employee_id) ?? 0) + 1);
    if (["in_progress", "not_started"].includes(t.status)) trainingActive.set(t.employee_id, (trainingActive.get(t.employee_id) ?? 0) + 1);
  }

  // Promotion / role progression signal: no manager-reported progression data exists in the
  // schema, so we infer "no role progression recorded" when tenure >= 2y and the employee
  // has no completed training that maps to a leadership program.
  const promotionMissing = new Set<string>();
  for (const e of employees) {
    const yrs = tenure.get(e.id) ?? 0;
    if (yrs >= 2 && (trainingDone.get(e.id) ?? 0) === 0) promotionMissing.add(e.id);
  }

  // -------------------------------------------------------------------------
  // Per-employee risk aggregation (employeeRisks + departmentRisk)
  // -------------------------------------------------------------------------
  const employeeSignals: Array<{
    employeeId: string;
    name: string;
    department: string;
    signals: string[];
    score: number;
    trend: "up" | "down" | "flat";
  }> = [];

  for (const id of activeIds) {
    const emp = empMap.get(id);
    if (!emp) continue;

    // Deterministic signal scoring (0-100 heuristic — NOT scientific).
    let score = 0;

    const signals: string[] = [];

    const attDelta = attTrendDelta.get(id);
    if (attDelta != null && attDelta < -5) {
      score += 20;
      signals.push(`Attendance rate declined ${Math.abs(attDelta).toFixed(1)} points recently`);
    } else if (attDelta != null && attDelta > 5) {
      signals.push(`Attendance rate improved ${attDelta.toFixed(1)} points recently`);
    } else if (attDelta != null) {
      signals.push(`Attendance stable (${attRate.get(id)?.toFixed(0) ?? "n/a"}%)`);
    }

    const leave = leaveDays.get(id) ?? 0;
    if (leave > 10) {
      score += 15;
      signals.push(`Elevated leave usage (${Math.round(leave)} days in the last 6 months)`);
    } else if (leave > 5) {
      score += 8;
      signals.push(`Elevated leave usage (${Math.round(leave)} days in the last 6 months)`);
    }

    const goal = goalPct.get(id);
    if (goal != null && goal < 50) {
      score += 20;
      signals.push(`Goal completion low (${goal}%)`);
    } else if (goal != null && goal < 75) {
      score += 10;
      signals.push(`Goal completion moderate (${goal}%)`);
    }

    const gDelta = goalDelta.get(id);
    if (gDelta != null && gDelta < -15) {
      score += 15;
      signals.push(`Goal completion decreased ${Math.abs(gDelta).toFixed(0)}% over the last 3 months`);
    }

    const perf = perfLatest.get(id);
    if (perf != null && perf <= 2) {
      score += 20;
      signals.push(`Performance trend declining (latest rating ${perf}/5)`);
    } else if (perf != null && perf <= 3) {
      score += 10;
      signals.push(`Average performance (latest rating ${perf}/5)`);
    }

    const neg = negativeFb.get(id) ?? 0;
    if (neg > 0) {
      score += Math.min(20, 10 + neg * 5);
      signals.push(`Negative feedback ${neg > 1 ? "records" : "record"} this year`);
    }

    const dis = disengagementFb.get(id) ?? 0;
    if (dis > 0) {
      score += 15;
      signals.push("Recent feedback contains disengagement indicators");
    }

    const pos = positiveFb.get(id) ?? 0;
    if (pos === 0) {
      signals.push("No positive feedback recorded this year");
    }

    const yrs = tenure.get(id) ?? 0;
    if (yrs < 1 && emp.date_of_joining) {
      score += 5;
      signals.push(`New hire — short tenure (${yrs.toFixed(1)} years)`);
    } else if (yrs >= 1 && yrs < 2) {
      score += 3;
      signals.push(`Tenure ${yrs.toFixed(1)} years — stepping into role`);
    } else if (yrs >= 4) {
      score += 5;
      signals.push(`Long tenure (${yrs.toFixed(1)} years) — monitor for stagnation`);
    }

    if (promotionMissing.has(id)) {
      score += 15;
      signals.push("No role progression recorded");
    }

    const done = trainingDone.get(id) ?? 0;
    const act = trainingActive.get(id) ?? 0;
    if (done === 0 && act === 0 && yrs >= 1) {
      score += 10;
      signals.push("No training activity in the last year");
    } else if (done > 0) {
      signals.push(`${done} course${done === 1 ? "" : "s"} completed · ${act} active`);
    }

    // Blend in the stored model risk score (if any) as one more signal source.
    const stored = latest.get(id)?.score;
    if (stored != null && stored >= 60) {
      score += 10;
      signals.push(`Model risk score ${stored} (${latest.get(id)?.level ?? "n/a"})`);
    } else if (stored != null && stored >= 40) {
      score += 5;
    }

    score = Math.min(100, Math.round(score));

    const storedLatest = latest.get(id)?.score ?? null;
    const trend = riskTrend(attDelta ?? null, gDelta ?? null, prevScore.get(id) ?? null, storedLatest);

    employeeSignals.push({ employeeId: id, name: emp.profiles?.full_name ?? "Unknown", department: emp.departments?.name ?? "Unassigned", signals, score, trend });
  }

  employeeSignals.sort((a, b) => b.score - a.score);

  // High-risk = score >= 60 (bounded display set).
  const highRiskRows = employeeSignals.filter((e) => e.score >= 60).slice(0, 40);

  const employeeRisks: NonNullable<CalculateAttritionInsightsResult["employeeRisks"]> = highRiskRows.map((e) => ({
    employeeId: e.employeeId,
    name: e.name,
    department: e.department,
    riskScore: e.score,
    supportingSignals: e.signals.slice(0, 6),
    trend: e.trend,
    aiExplanation: riskExplanation(e.signals.slice(0, 6), e.score),
    recommendedAction: actionForSignals(e.signals),
  }));

  // Department risk rollups.
  const deptBuckets = new Map<string, { scores: number[]; riskCount: number; driverCounts: Map<string, number>; trends: ("up" | "down" | "flat")[] }>();
  for (const e of employeeSignals) {
    const dept = e.department;
    const bucket = deptBuckets.get(dept) ?? { scores: [], riskCount: 0, driverCounts: new Map<string, number>(), trends: [] };
    bucket.scores.push(e.score);
    bucket.trends.push(e.trend);
    if (e.score >= 60) bucket.riskCount += 1;
    for (const s of e.signals) {
      const key = s.replace(/\d+(\.\d+)?%?/g, "").trim() || s;
      bucket.driverCounts.set(key, (bucket.driverCounts.get(key) ?? 0) + 1);
    }
    deptBuckets.set(dept, bucket);
  }
  const departmentRisk: NonNullable<CalculateAttritionInsightsResult["departmentRisk"]> = Array.from(deptBuckets.entries())
    .map(([department, b]) => {
      const topDrivers = Array.from(b.driverCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([d]) => d);
      const ups = b.trends.filter((t) => t === "up").length;
      const downs = b.trends.filter((t) => t === "down").length;
      const riskTrend: "up" | "down" | "flat" = ups > downs && ups >= 2 ? "up" : downs > ups && downs >= 2 ? "down" : "flat";
      return {
        department,
        avgRiskScore: b.scores.length ? Math.round((b.scores.reduce((a, c) => a + c, 0) / b.scores.length) * 10) / 10 : 0,
        highRiskCount: b.riskCount,
        riskTrend,
        topDrivers,
      };
    })
    .sort((a, b) => b.avgRiskScore - a.avgRiskScore);

  const riskValues = Array.from(latest.values()).map((r) => r.score);
  const avgScore = riskValues.length ? Math.round((riskValues.reduce((a, b) => a + b, 0) / riskValues.length) * 10) / 10 : 0;

  const driverCounts = new Map<string, number>();
  for (const e of employeeSignals) {
    for (const d of e.signals) driverCounts.set(d, (driverCounts.get(d) ?? 0) + 1);
  }
  const topDrivers = Array.from(driverCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const prompt = [
    "Compute a workforce attrition risk report from the data below.",
    `Org: ${activeIds.size} active employees tracked, avg AI risk estimate ${avgScore}, employees with estimated risk >= 60: ${highRiskRows.length}.`,
    `Top risk drivers across the org: ${topDrivers.map(([d, n]) => `${d} (${n})`).join(", ") || "none"}.`,
    "",
    "HIGH-RISK EMPLOYEES (AI risk estimate score >= 60):",
    highRiskRows.length
      ? highRiskRows.slice(0, 15).map((e) =>
          `- ${e.name} | ${e.department} | score ${e.score} (${levelFromScore(e.score)}) | trend ${e.trend} | signals: ${e.signals.join("; ") || "n/a"}`
        ).join("\n")
      : "None.",
    "",
    "Return the attrition report JSON (headline, overall_risk_level, segments, recommended_actions, confidence).",
    "Frame risk as 'AI risk estimate' — never a definitive prediction. Segment the high-risk employees into meaningful cohorts (e.g. by department or driver pattern) with headcount, average score, key drivers and a recommended action per segment.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: attritionReportSchema,
    temperature: 0.25,
  });

  const report = normalizeAttritionReport(parsed);

  const records = report.segments.map((s) =>
    toInsightRecord({
      title: `Attrition risk: ${s.name}`,
      severity: s.risk_level === "critical" ? "critical" : s.risk_level,
      summary: `${s.name}: ${s.headcount} employee(s), avg AI risk estimate ${s.avg_risk_score}.`,
      evidence: [`Avg AI risk estimate ${s.avg_risk_score}`, "Signals: " + s.key_drivers.join(", ")],
      reasoning: "Cohort-level risk aggregation across attendance, leave, goals, performance, feedback, tenure, training, and engagement signals.",
      confidence: report.confidence,
      recommended_action: s.recommended_action,
      action_type: "check-in",
      affected_entities: [s.name],
    }, "attrition")
  );

  // Also persist the high-risk employee estimates.
  for (const e of employeeRisks) {
    records.push({
      ...toInsightRecord({
        title: `AI risk estimate: ${e.name}`,
        severity: e.riskScore >= 80 ? "critical" : e.riskScore >= 60 ? "high" : "medium",
        summary: `${e.name} (${e.department}): AI risk estimate ${e.riskScore}/100, trend ${e.trend}.`,
        evidence: e.supportingSignals,
        reasoning: e.aiExplanation,
        confidence: 0.6,
        recommended_action: e.recommendedAction,
        action_type: "check-in",
        affected_entities: [e.name],
      }, "attrition"),
      employeeId: e.employeeId,
    });
  }

  const { saved, persistError } = await persistInsights("attrition", records);

  return { report, employeeRisks, departmentRisk, saved, persistError };
}

// ---------------------------------------------------------------------------
// 4. Performance Analysis
// ---------------------------------------------------------------------------

export interface AnalyzePerformanceResult {
  report: PerformanceAnalysis;
  topPerformers?: Array<{ name: string; department: string; rating: number }>;
  needsSupport?: Array<{ name: string; department: string; rating: number | null; goalCompletionPct: number | null; reason: string }>;
  saved: number;
  persistError?: string;
}

export async function analyzePerformance(): Promise<AnalyzePerformanceResult> {
  const supabase = requireSupabase();

  const [reviewRes, empRes, goalRes, feedbackRes] = await Promise.all([
    supabase.from("performance_reviews").select("employee_id, rating, period_end, period_start, review_type"),
    supabase.from("employees").select("id, employment_status, profiles(full_name), departments(name), roles(title)"),
    supabase.from("goals").select("employee_id, status, progress, due_date"),
    supabase.from("feedback").select("to_employee_id, category, created_at"),
  ]);
  checkQuery("performance_reviews", reviewRes);
  checkQuery("employees", empRes);
  checkQuery("goals", goalRes);
  checkQuery("feedback", feedbackRes);

  const reviews = (reviewRes.data ?? []) as { employee_id: string; rating: number | null; period_end: string | null; period_start: string | null; review_type: string | null }[];
  const employees = (empRes.data ?? []) as unknown as { id: string; employment_status: string; profiles: { full_name: string } | null; departments: { name: string } | null; roles: { title: string } | null }[];
  const goals = (goalRes.data ?? []) as { employee_id: string; status: string; progress: number | null; due_date: string | null }[];

  const activeSet = new Set(["active", "probation", "on_leave"]);
  const activeEmployees = employees.filter((e) => activeSet.has(e.employment_status));
  const empById = new Map(employees.map((e) => [e.id, e]));
  const deptOf = (id: string) => empById.get(id)?.departments?.name ?? "Unassigned";

  // Latest rating per employee (last review in the latest period) + prior rating.
  const latestRating = new Map<string, number>();
  const priorRating = new Map<string, number>();
  const periodByEmp = new Map<string, string>();
  for (const r of reviews) {
    if (r.rating == null) continue;
    const key = r.period_end ?? r.period_start ?? "";
    const existingKey = periodByEmp.get(r.employee_id);
    if (!existingKey || (key && key >= existingKey)) {
      if (existingKey && key && key > existingKey) priorRating.set(r.employee_id, latestRating.get(r.employee_id) ?? r.rating);
      periodByEmp.set(r.employee_id, key);
      latestRating.set(r.employee_id, r.rating);
    } else if (key < existingKey) {
      priorRating.set(r.employee_id, r.rating);
    }
  }

  // Goal completion per employee.
  const goalPct = new Map<string, number>();
  const goalByEmp = new Map<string, { done: number; total: number }>();
  for (const g of goals) {
    if (!["active", "completed"].includes(g.status)) continue;
    const b = goalByEmp.get(g.employee_id) ?? { done: 0, total: 0 };
    b.total += 1;
    if (g.status === "completed" || (g.progress ?? 0) >= 100) b.done += 1;
    goalByEmp.set(g.employee_id, b);
  }
  for (const [id, b] of goalByEmp) goalPct.set(id, b.total ? Math.round((b.done / b.total) * 100) : 0);

  // Negative feedback this year (engagement/constructive) — input for "needs support".
  const thisYear = `${new Date().getFullYear()}-01-01`;
  const negFb = new Map<string, number>();
  for (const f of feedbackRes.data ?? []) {
    if (f.to_employee_id && f.category && ["constructive", "engagement", "manager"].includes(f.category) && f.created_at != null && f.created_at >= thisYear) {
      negFb.set(f.to_employee_id, (negFb.get(f.to_employee_id) ?? 0) + 1);
    }
  }

  // Department-level comparison (latest + prior period averages).
  const deptRows = new Map<string, { latest: number[]; prior: number[]; periods: string[] }>();
  for (const r of reviews) {
    if (r.rating == null) continue;
    const dept = deptOf(r.employee_id);
    const row = deptRows.get(dept) ?? { latest: [], prior: [], periods: [] };
    const key = r.period_end ?? r.period_start ?? "";
    const periods = Array.from(new Set(row.periods.concat(key).filter(Boolean))).sort();
    row.periods = periods;
    const latestPeriod = periods[periods.length - 1] ?? "";
    if (key === latestPeriod && key) row.latest.push(r.rating);
    row.prior.push(r.rating);
    deptRows.set(dept, row);
  }

  const deptLines = Array.from(deptRows.entries())
    .map(([dept, row]) => {
      const avg = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null);
      const latestAvg = avg(row.latest);
      const priorAvg = avg(row.prior);
      const delta = latestAvg != null && priorAvg != null ? Math.round((latestAvg - priorAvg) * 100) / 100 : null;
      const deptGoalPcts = activeEmployees.filter((e) => deptOf(e.id) === dept).map((e) => goalPct.get(e.id) ?? 0);
      const deptGoalAvg = deptGoalPcts.length ? Math.round((deptGoalPcts.reduce((a, b) => a + b, 0) / deptGoalPcts.length) * 10) / 10 : null;
      return `- ${dept}: latest avg ${latestAvg ?? "n/a"} (prior avg ${priorAvg ?? "n/a"}, delta ${delta ?? "n/a"}), goal completion ${deptGoalAvg ?? "n/a"}%`;
    })
    .join("\n");

  // Top performers: highest latest ratings (>= 4).
  const rated = activeEmployees
    .map((e) => ({ id: e.id, name: e.profiles?.full_name ?? "Unknown", department: deptOf(e.id), rating: latestRating.get(e.id) }))
    .filter((e) => e.rating != null);
  const topPerformers = rated
    .filter((e) => e.rating! >= 4)
    .sort((a, b) => b.rating! - a.rating!)
    .slice(0, 10)
    .map((e) => ({ name: e.name, department: e.department, rating: e.rating! }));

  // Employees needing support: lowest ratings or low goal completion with negative feedback.
  const needsSupport = rated
    .map((e) => ({
      name: e.name,
      department: e.department,
      rating: e.rating,
      goalCompletionPct: goalPct.get(e.id) ?? null,
      negFb: negFb.get(e.id) ?? 0,
    }))
    .filter((e) => (e.rating != null && e.rating <= 2) || (e.rating != null && e.rating <= 3 && (e.goalCompletionPct ?? 100) < 60) || (e.rating != null && e.rating <= 3 && e.negFb > 0))
    .sort((a, b) => (a.rating ?? 5) - (b.rating ?? 5))
    .slice(0, 12)
    .map((e) => {
      const reasons: string[] = [];
      if (e.rating != null && e.rating <= 2) reasons.push(`latest rating ${e.rating}/5`);
      else if (e.rating != null && (e.goalCompletionPct ?? 100) < 60) reasons.push(`goal completion ${e.goalCompletionPct ?? 0}%`);
      if (e.negFb > 0) reasons.push(`${e.negFb} negative feedback record${e.negFb === 1 ? "" : "s"} this year`);
      return {
        name: e.name,
        department: e.department,
        rating: e.rating ?? null,
        goalCompletionPct: e.goalCompletionPct,
        reason: reasons.join("; ") || "flagged for review",
      };
    });

  // Org-level average for the headline context.
  const allRatings = Array.from(latestRating.values());
  const overallAvg = allRatings.length ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 100) / 100 : 0;

  const prompt = [
    "Analyze organizational performance from the review, goal, and feedback data below.",
    deptLines || "- No review data available.",
    `Org average rating: ${overallAvg}/5 (${allRatings.length} reviews).`,
    "",
    `TOP PERFORMERS (latest rating >= 4):`,
    topPerformers.length
      ? topPerformers.map((t) => `- ${t.name} | ${t.department} | ${t.rating}/5`).join("\n")
      : "- None identified.",
    "",
    `EMPLOYEES NEEDING SUPPORT (flagged for HR review):`,
    needsSupport.length
      ? needsSupport.slice(0, 12).map((n) => `- ${n.name} | ${n.department} | rating ${n.rating ?? "n/a"}/5 | goal completion ${n.goalCompletionPct ?? "n/a"}% | why: ${n.reason}`).join("\n")
      : "- None flagged.",
    "",
    "Return the performance analysis JSON (headline, overall_rating, by_department with rating/trend/note, strengths, improvement_areas, goal_risks, development_recommendations, recommended_actions, confidence).",
    "Rate on the same 1-5 scale. Use 'trend' to compare each department against its prior rated cycle.",
    "Keep 'development_recommendations' and 'recommended_actions' as recommendations for HR to review — never decisions. Frame all support needs as suggestions for HR action.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: performanceAnalysisSchema,
    temperature: 0.25,
  });

  const report = normalizePerformanceAnalysis(parsed);

  const records = report.by_department
    .filter((d) => d.trend === "down")
    .map((d) =>
      toInsightRecord({
        title: `Performance declining: ${d.department}`,
        severity: "medium",
        summary: `Average performance rating ${d.rating} in ${d.department}. ${d.note}`,
        evidence: [`Avg rating ${d.rating}/5`, `Trend: ${d.trend}`],
        reasoning: "A downward rating trend usually indicates waning engagement or capability risk in that team.",
        confidence: report.confidence,
        recommended_action: "Review recent cycle outcomes and target support for the lowest-rated segment.",
        action_type: "review",
        affected_entities: [d.department],
      }, "performance")
    );

  // Persist flagged support needs as insights too (org-wide, no auto decisions).
  for (const n of needsSupport.slice(0, 6)) {
    records.push(
      toInsightRecord({
        title: `Support needed: ${n.name}`,
        severity: (n.rating ?? 3) <= 2 ? "high" : "medium",
        summary: `${n.name} (${n.department}) flagged for HR support: ${n.reason}.`,
        evidence: [`Rating ${n.rating ?? "n/a"}/5`, n.goalCompletionPct != null ? `Goal completion ${n.goalCompletionPct}%` : "No goals", n.reason],
        reasoning: "Flagged from deterministic performance, goal, and feedback signals for HR to review — no automatic employment decision is made.",
        confidence: 0.6,
        recommended_action: "Schedule a manager check-in and review workload before deciding next steps.",
        action_type: "check-in",
        affected_entities: [n.name],
      }, "performance")
    );
  }

  const { saved, persistError } = await persistInsights("performance", records);

  return { report, topPerformers, needsSupport, saved, persistError };
}

// ---------------------------------------------------------------------------
// 5. Skill Recommendations
// ---------------------------------------------------------------------------

export interface GenerateSkillRecommendationsResult {
  report: SkillRecommendationReport;
  saved: number;
  persistError?: string;
}

export async function generateSkillRecommendations(): Promise<GenerateSkillRecommendationsResult> {
  const supabase = requireSupabase();

  const [skillsRes, estRes, empRes] = await Promise.all([
    supabase.from("skills").select("id, name, category"),
    supabase.from("employee_skills").select("skill_id"),
    supabase.from("employees").select("id, employment_status"),
  ]);
  checkQuery("skills", skillsRes);
  checkQuery("employee_skills", estRes);
  checkQuery("employees", empRes);

  const skills = (skillsRes.data ?? []) as { id: string; name: string; category: string | null }[];
  const activeCount = (empRes.data ?? []).filter((e) => !["terminated", "resigned"].includes((e as { employment_status: string }).employment_status)).length;

  const holderCount = new Map<string, number>();
  const estRows = (estRes.data ?? []) as { skill_id: string }[];
  for (const row of estRows) {
    holderCount.set(row.skill_id, (holderCount.get(row.skill_id) ?? 0) + 1);
  }

  const rows = skills
    .map((s) => {
      const holders = holderCount.get(s.id) ?? 0;
      const coverage = activeCount ? Math.round((holders / activeCount) * 1000) / 10 : 0;
      return { skill: s.name, category: s.category ?? "general", coverage, holders };
    })
    .sort((a, b) => a.coverage - b.coverage);

  const prompt = [
    "Generate skill recommendations from the current skill catalog coverage.",
    `Active workforce: ${activeCount} employees.`,
    rows.map((r) => `- ${r.skill} (${r.category}): ${r.coverage}% coverage (${r.holders} holders)`).join("\n"),
    "",
    "Return the skill recommendations JSON (headline, overall_coverage_pct, recommendations with skill/current_coverage_pct/gap/priority/rationale/recommended_actions/target_roles, confidence).",
    "Prioritize skills that are strategically critical (engineering, security, data, AI/ML, people management) and have low coverage.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: skillRecommendationSchema,
    temperature: 0.25,
  });

  const report = normalizeSkillRecommendations(parsed);

  const records = report.recommendations
    .slice(0, 3)
    .map((r) =>
      toInsightRecord({
        title: `Skill gap: ${r.skill}`,
        severity: r.priority === "high" ? "high" : r.priority === "medium" ? "medium" : "low",
        summary: `${r.skill} coverage is ${r.current_coverage_pct}%. ${r.rationale}`,
        evidence: [`Coverage ${r.current_coverage_pct}%`, `Gap ${r.gap}%`],
        reasoning: "Thin coverage of a critical skill raises delivery risk and external-hire dependency.",
        confidence: report.confidence,
        recommended_action: r.recommended_actions.join("; "),
        action_type: "training",
        affected_entities: r.target_roles,
      }, "skills")
    );

  const { saved, persistError } = await persistInsights("skill-recommendations", records);

  return { report, saved, persistError };
}

// ---------------------------------------------------------------------------
// 6. Onboarding Plan
// ---------------------------------------------------------------------------

export interface GenerateOnboardingPlanResult {
  plan: OnboardingPlan;
  employeeName: string;
  saved: number;
  persistError?: string;
}

export async function generateOnboardingPlan(employeeId: string): Promise<GenerateOnboardingPlanResult> {
  const supabase = requireSupabase();

  const [empRes, planRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id, date_of_joining, employment_status, profiles(full_name), roles(title), departments(name)")
      .eq("id", employeeId)
      .maybeSingle(),
    supabase.from("onboarding_plans").select("title, status").eq("employee_id", employeeId),
  ]);
  checkQuery("employee", empRes);
  checkQuery("onboarding_plans", planRes);

  const emp =
    empRes.data as {
      date_of_joining: string | null;
      profiles: { full_name: string } | null;
      roles: { title: string } | null;
      departments: { name: string } | null;
    } | null;
  if (!emp) throw new Error("Employee not found.");

  const existingPlans = (planRes.data ?? []) as { title: string; status: string }[];
  const isRecent = emp.date_of_joining != null && emp.date_of_joining >= new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

  const prompt = [
    `Create a structured onboarding plan for ${emp.profiles?.full_name ?? "the new hire"}.`,
    `Role: ${emp.roles?.title ?? "TBD"} | Department: ${emp.departments?.name ?? "Unassigned"} | Joined: ${emp.date_of_joining ?? "not started"} | Recent hire (<=90 days): ${isRecent ? "yes" : "no"}.`,
    existingPlans.length ? `Existing plans: ${existingPlans.map((p) => `${p.title} (${p.status})`).join(", ")}` : "No existing onboarding plans.",
    "",
    "Return the onboarding plan JSON (headline, expected_time_to_productivity_weeks, phases with phase/duration_weeks/objective/tasks(title,description,owner_role), confidence).",
    "Phase tasks should be concrete and cover setup, learning, first projects, and manager alignment. Avoid duplicating completed existing plans.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: onboardingPlanSchema,
    temperature: 0.35,
  });

  const plan = normalizeOnboardingPlan(parsed);

  const { saved, persistError } = await persistInsights("onboarding-plan", [
    toInsightRecord({
      title: `Onboarding plan: ${emp.profiles?.full_name ?? "New hire"}`,
      severity: "low",
      summary: plan.headline || `Generated ${plan.phases.length} phase(s), ~${plan.expected_time_to_productivity_weeks} weeks to productivity.`,
      evidence: plan.phases.map((p) => `${p.phase} (${p.duration_weeks}w): ${p.objective}`).slice(0, 4),
      reasoning: "Generated from the hire's role, department, tenure, and existing plan state.",
      confidence: plan.confidence,
      recommended_action: "Assign an onboarding buddy and schedule the phase milestones.",
      action_type: "review",
      affected_entities: [emp.departments?.name ?? ""],
    }, "onboarding"),
  ]);

  return {
    plan,
    employeeName: emp.profiles?.full_name ?? "New hire",
    saved,
    persistError,
  };
}

// ---------------------------------------------------------------------------
// 7. Candidate Ranking
// ---------------------------------------------------------------------------

export interface RankCandidateResult {
  ranking: CandidateRanking;
}

export async function rankCandidate(candidateId: string): Promise<RankCandidateResult> {
  const supabase = requireSupabase();

  const [candRes, jobRes, skillsRes, resumeRes] = await Promise.all([
    supabase.from("candidates").select("id, full_name, status, job_id, notes").eq("id", candidateId).maybeSingle(),
    supabase.from("candidates").select("job_id, jobs(title, departments(name), requirements, description)").eq("id", candidateId).maybeSingle(),
    supabase.from("candidate_skills").select("skills(name)").eq("candidate_id", candidateId),
    supabase.from("resumes").select("content_text").eq("candidate_id", candidateId).order("uploaded_at", { ascending: false }).limit(1),
  ]);
  checkQuery("candidate", candRes);
  checkQuery("candidate.job", jobRes);
  checkQuery("candidate_skills", skillsRes);
  checkQuery("resumes", resumeRes);

  const candidate = candRes.data as { id: string; full_name: string; status: string; job_id: string | null; notes: string | null };
  if (!candidate) throw new Error("Candidate not found.");

  const jobRow = (jobRes.data as unknown) as {
    job_id: string | null;
    jobs: { title: string | null; departments: { name: string } | null; requirements: string | null; description: string | null } | null;
  } | null;
  const job = jobRow?.jobs;
  const skills = (skillsRes.data ?? []) as unknown as { skills: { name: string } | null }[];
  const resumeText = (resumeRes.data?.[0] as { content_text: string | null } | undefined)?.content_text ?? "";

  const prompt = [
    `Rank candidate ${candidate.full_name} (current stage: ${candidate.status}) against the role below.`,
    job ? [`Job: ${job.title ?? "Untitled"} (${job.departments?.name ?? "Unassigned"})`, `Requirements: ${job.requirements ?? "—"}`, `Description: ${job.description ?? "—"}`].join("\n") : "No job linked.",
    "",
    `Candidate skills: ${skills.map((s) => s.skills?.name).filter(Boolean).join(", ") || "none listed"}`,
    resumeText ? `Resume text: ${resumeText.slice(0, 4000)}` : "No resume on file.",
    "",
    "Return the candidate ranking JSON (candidate_name, job_title, overall_score 0-100, fit_summary, strengths, concerns, recommended_stage, recommended_action, confidence).",
    "Base it strictly on the listed skills and resume content. Do not guess or infer protected characteristics.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: candidateRankingSchema,
    temperature: 0.2,
  });

  const ranking = normalizeCandidateRanking(parsed);
  return { ranking };
}

// ---------------------------------------------------------------------------
// 8. Interview Questions
// ---------------------------------------------------------------------------

export interface GenerateInterviewQuestionsResult {
  questions: InterviewQuestions;
}

export async function generateInterviewQuestions(jobId: string): Promise<GenerateInterviewQuestionsResult> {
  const supabase = requireSupabase();

  const jobRes = await supabase
    .from("jobs")
    .select("title, departments(name), requirements, description")
    .eq("id", jobId)
    .maybeSingle();
  checkQuery("job", jobRes);
  const job = jobRes.data as unknown as {
    title: string | null;
    departments: { name: string } | null;
    requirements: string | null;
    description: string | null;
  };
  if (!job) throw new Error("Job not found.");

  const prompt = [
    `Create an interview question set for: ${job.title ?? "Role"} (${job.departments?.name ?? "Unassigned"}).`,
    `Requirements: ${job.requirements ?? "—"}`,
    `Description: ${job.description ?? "—"}`,
    "",
    "Return the interview questions JSON (headline, sections with focus_area/rationale/questions(question, skill_assessed, follow_ups), confidence).",
    "Cover technical/skills, behavior, and fit. Questions must be job-relevant and must not ask about protected characteristics.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: interviewQuestionsSchema,
    temperature: 0.4,
  });

  return { questions: normalizeInterviewQuestions(parsed) };
}

// ---------------------------------------------------------------------------
// 9. Interview Evaluation
// ---------------------------------------------------------------------------

export interface EvaluateInterviewResult {
  evaluation: InterviewEvaluation;
}

export async function evaluateInterview(interviewId: string): Promise<EvaluateInterviewResult> {
  const supabase = requireSupabase();

  const [intRes, qRes, evalRes] = await Promise.all([
    supabase.from("interviews").select("id, status, interview_type, jobs(title), candidates(full_name)").eq("id", interviewId).maybeSingle(),
    supabase.from("interview_questions").select("question, order_index").eq("interview_id", interviewId).order("order_index", { ascending: true }),
    supabase.from("interview_evaluations").select("skills_rating, communication, overall_rating, recommendation, notes").eq("interview_id", interviewId),
  ]);
  checkQuery("interview", intRes);
  checkQuery("interview_questions", qRes);
  checkQuery("interview_evaluations", evalRes);

  const interview = intRes.data as unknown as {
    id: string;
    status: string;
    interview_type: string | null;
    jobs: { title: string } | null;
    candidates: { full_name: string } | null;
  };
  if (!interview) throw new Error("Interview not found.");

  const questions = (qRes.data ?? []) as { question: string; order_index: number }[];
  const evaluations = (evalRes.data ?? []) as { skills_rating: number | null; communication: number | null; overall_rating: number | null; recommendation: string | null; notes: string | null }[];

  if (interview.status !== "completed" || evaluations.length === 0) {
    throw new Error("No evaluation submitted for this interview yet. Complete and submit evaluations first.");
  }

  const prompt = [
    `Consolidate the interview evaluations for ${interview.candidates?.full_name ?? "the candidate"} (role: ${interview.jobs?.title ?? "n/a"}, type: ${interview.interview_type ?? "n/a"}).`,
    "",
    `Questions asked: ${questions.map((q) => q.question).join(" | ") || "none recorded"}`,
    "",
    "Evaluations submitted:",
    evaluations.map((e) => `- skills ${e.skills_rating}/5, communication ${e.communication}/5, overall ${e.overall_rating}/5, recommendation ${e.recommendation}, notes: ${e.notes ?? "—"}`).join("\n"),
    "",
    "Return the consolidated evaluation JSON (headline, overall_score 0-100, dimensions with rating 1-5/note, highlights, risks, recommendation, next_step, confidence).",
    "Base the recommendation only on the evaluation data provided.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: interviewEvaluationSchema,
    temperature: 0.2,
  });

  return { evaluation: normalizeInterviewEvaluation(parsed) };
}

// ---------------------------------------------------------------------------
// 10. Policy Question
// ---------------------------------------------------------------------------

export interface AnswerPolicyQuestionResult {
  answer: PolicyAnswer;
}

export async function answerPolicyQuestion(question: string): Promise<AnswerPolicyQuestionResult> {
  const supabase = requireSupabase();

  const [policyRes, chunkRes] = await Promise.all([
    supabase.from("policies").select("id, title, category, version").eq("status", "published"),
    supabase.from("policy_chunks").select("policy_id, chunk_index, content"),
  ]);
  checkQuery("policies", policyRes);
  checkQuery("policy_chunks", chunkRes);

  const policies = (policyRes.data ?? []) as { id: string; title: string; category: string | null; version: number }[];
  if (policies.length === 0) throw new Error("No published policies found to answer from.");

  const chunks = (chunkRes.data ?? []) as { policy_id: string; chunk_index: number; content: string }[];
  const titleById = new Map(policies.map((p) => [p.id, p.title]));

  const tokens = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
  const uniqueTokens = Array.from(new Set(tokens));
  const stop = new Set(["what", "when", "where", "which", "would", "should", "could", "does", "there", "about", "with", "that", "this", "have", "been"]);
  const keywords = uniqueTokens.filter((t) => !stop.has(t));

  const scored = chunks
    .map((c) => {
      const lower = c.content.toLowerCase();
      const hits = keywords.filter((k) => lower.includes(k)).length;
      return { ...c, score: hits };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const context = scored.length
    ? scored
        .map((c) => `[${titleById.get(c.policy_id) ?? "Policy"} / chunk ${c.chunk_index}]\n${c.content.slice(0, 1500)}`)
        .join("\n\n---\n\n")
    : policies.map((p) => `[${p.title}] (no matching chunk found) ${p.category ?? ""}`).join("\n");

  const prompt = [
    `HR policy question: "${question}"`,
    "",
    "Retrieved policy context:",
    context,
    "",
    "Return the policy answer JSON (answer, confidence, citations with policy/section, disclaimer).",
    "Answer only from the provided policy context; if the context does not cover the question, say so and lower confidence. Add a short disclaimer that this is guidance, not legal advice.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: policyAnswerSchema,
    temperature: 0.2,
  });

  return { answer: normalizePolicyAnswer(parsed) };
}

// ---------------------------------------------------------------------------
// 11. Career Recommendations
// ---------------------------------------------------------------------------

export interface GenerateCareerRecommendationsResult {
  recommendations: CareerRecommendations;
  saved: number;
  persistError?: string;
}

export async function generateCareerRecommendations(employeeId: string): Promise<GenerateCareerRecommendationsResult> {
  const detail = await fetchEmployeeDetail(employeeId);
  if (!detail) throw new Error("Employee not found.");
  const pkg = buildEmployeeAnalysis(detail);

  const prompt = [
    `Career recommendations for ${pkg.employee.name} (${pkg.employee.role}, ${pkg.employee.department}).`,
    `Tenure: joined ${pkg.employee.joined ?? "n/a"}; manager: ${pkg.employee.manager}.`,
    `Performance: latest ${pkg.performance.latestRating ?? "n/a"}/5 (delta ${pkg.performance.delta ?? "n/a"}).`,
    `Skills: ${pkg.skills.total} total; critical coverage: ${pkg.skills.criticalCoverage.join(", ") || "none"}.`,
    `Goals: ${pkg.goals.active} active, ${pkg.goals.completed} completed, avg progress ${pkg.goals.avgProgress ?? "n/a"}%.`,
    `Training: ${pkg.training.completed}/${pkg.training.total ?? "n/a"} courses completed.`,
    `Feedback: ${pkg.feedback.positive} positive, ${pkg.feedback.negative} constructive/engagement.`,
    "",
    "Return the career recommendations JSON (headline, career_paths with path/rationale/readiness/steps/required_skills/timeline_months, immediate_actions, confidence).",
    "Ground every path in the employee's actual skills, goals, and performance. Suggest realistic, internal-first paths.",
  ].join("\n");

  const parsed = await generateStructuredJSON<Record<string, unknown>>({
    system: SYSTEM_GUARDRAILS,
    prompt,
    schema: careerRecommendationsSchema,
    temperature: 0.35,
  });

  const recommendations = normalizeCareerRecommendations(parsed);

  const { saved, persistError } = await persistInsights("career-recommendations", [
    toInsightRecord({
      title: `Career path: ${recommendations.career_paths[0]?.path ?? "Growth plan"}`,
      severity: "low",
      summary: recommendations.headline || `Recommended path: ${recommendations.career_paths[0]?.path ?? "n/a"}.`,
      evidence: recommendations.career_paths.map((p) => `${p.path} (${p.readiness}): ${p.rationale}`).slice(0, 3),
      reasoning: "Derived from the employee's skills, tenure, performance, goals, and training.",
      confidence: recommendations.confidence,
      recommended_action: recommendations.immediate_actions[0] ?? "Book a career conversation with the manager.",
      action_type: "check-in",
      affected_entities: [pkg.employee.name],
    }, "career"),
  ]);

  return { recommendations, saved, persistError };
}