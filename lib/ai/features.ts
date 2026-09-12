import { buildWorkforceBriefing, prepareBriefingPrompt } from "@/lib/ai/briefing";
import { buildEmployeeAnalysis, prepareEmployeePrompt, type EmployeeAnalysisPackage } from "@/lib/ai/employee";
import { fetchEmployeeDetail } from "@/lib/hr/directory";
import { generateStructuredJSON } from "@/lib/ai/gemini";
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

function topFactors(factors: Record<string, unknown> | null): string[] {
  if (!factors || typeof factors !== "object") return [];
  return Object.entries(factors)
    .filter(([, w]) => typeof w === "number" && w > 0.3)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 4)
    .map(([k]) => k.replace(/_/g, " "));
}

export interface CalculateAttritionInsightsResult {
  report: AttritionReport;
  saved: number;
  persistError?: string;
}

export async function calculateAttritionInsights(): Promise<CalculateAttritionInsightsResult> {
  const supabase = requireSupabase();

  const [riskRes, attRes, goalRes, fbRes, empRes] = await Promise.all([
    supabase.from("risk_scores").select("employee_id, period, score, level, factors"),
    supabase.from("attendance").select("employee_id, date, status"),
    supabase.from("goals").select("employee_id, status, progress"),
    supabase.from("feedback").select("to_employee_id, category, created_at"),
    supabase.from("employees").select("id, employment_status, profiles(full_name), departments(name), roles(title)"),
  ]);
  checkQuery("risk_scores", riskRes);
  checkQuery("attendance", attRes);
  checkQuery("goals", goalRes);
  checkQuery("feedback", fbRes);
  checkQuery("employees", empRes);

  const risks = (riskRes.data ?? []) as { employee_id: string; period: string; score: number | null; level: string | null; factors: Record<string, unknown> | null }[];
  const attendance = (attRes.data ?? []) as { employee_id: string; date: string; status: string }[];
  const goals = (goalRes.data ?? []) as { employee_id: string; status: string; progress: number | null }[];
  const feedback = (fbRes.data ?? []) as { to_employee_id: string; category: string | null; created_at: string | null }[];
  const employees = (empRes.data ?? []) as unknown as { id: string; employment_status: string; profiles: { full_name: string } | null; departments: { name: string } | null; roles: { title: string } | null }[];

  // Latest risk score per employee.
  const latest = new Map<string, { period: string; score: number; level: string | null; factors: Record<string, unknown> | null }>();
  for (const r of risks) {
    if (r.score == null) continue;
    const cur = latest.get(r.employee_id);
    if (!cur || r.period > cur.period) latest.set(r.employee_id, { period: r.period, score: r.score, level: r.level, factors: r.factors });
  }

  // Per-employee attendance rate (trailing 12 weeks) and goal completion.
  const attCutoff = new Date(Date.now() - 84 * 864e5).toISOString().slice(0, 10);
  const attRate = new Map<string, number>();
  const attByEmp = new Map<string, { present: number; total: number }>();
  for (const a of attendance) {
    if (a.date < attCutoff) continue;
    const bucket = attByEmp.get(a.employee_id) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (["present", "late", "half_day", "wfh"].includes(a.status)) bucket.present += 1;
    attByEmp.set(a.employee_id, bucket);
  }
  for (const [id, b] of attByEmp) attRate.set(id, b.total ? Math.round((b.present / b.total) * 1000) / 10 : 0);

  const goalPct = new Map<string, number>();
  const goalByEmp = new Map<string, { done: number; total: number }>();
  for (const g of goals) {
    const b = goalByEmp.get(g.employee_id) ?? { done: 0, total: 0 };
    if (["active", "completed"].includes(g.status)) {
      b.total += 1;
      if (g.status === "completed" || (g.progress ?? 0) >= 100) b.done += 1;
    }
    goalByEmp.set(g.employee_id, b);
  }
  for (const [id, b] of goalByEmp) goalPct.set(id, b.total ? Math.round((b.done / b.total) * 100) : 0);

  const negativeFb = new Map<string, number>();
  const yearAgo = `${new Date().getFullYear()}-01-01`;
  for (const f of feedback) {
    if (["constructive", "engagement", "manager"].includes(f.category ?? "") && f.created_at != null && f.created_at >= yearAgo) {
      negativeFb.set(f.to_employee_id, (negativeFb.get(f.to_employee_id) ?? 0) + 1);
    }
  }

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const highRisk: { name: string; role: string; department: string; score: number; level: string | null; attendance: number | null; goalPct: number | null; negativeFb: number; drivers: string[] }[] = [];
  for (const [id, r] of latest) {
    if (r.score < 60) continue;
    const emp = empMap.get(id);
    highRisk.push({
      name: emp?.profiles?.full_name ?? "Unknown",
      role: emp?.roles?.title ?? "Unknown role",
      department: emp?.departments?.name ?? "Unassigned",
      score: r.score,
      level: r.level,
      attendance: attRate.get(id) ?? null,
      goalPct: goalPct.get(id) ?? null,
      negativeFb: negativeFb.get(id) ?? 0,
      drivers: topFactors(r.factors),
    });
  }
  highRisk.sort((a, b) => b.score - a.score);

  const riskValues = Array.from(latest.values()).map((r) => r.score);
  const avgScore = riskValues.length ? Math.round((riskValues.reduce((a, b) => a + b, 0) / riskValues.length) * 10) / 10 : 0;

  const driverCounts = new Map<string, number>();
  for (const [, r] of latest) {
    for (const d of topFactors(r.factors)) driverCounts.set(d, (driverCounts.get(d) ?? 0) + 1);
  }
  const topDrivers = Array.from(driverCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const prompt = [
    "Compute a workforce attrition risk report from the data below.",
    `Org: ${employees.length} employees tracked, avg risk score ${avgScore}, employees with estimated score >= 60: ${highRisk.length}.`,
    `Top risk drivers across the org: ${topDrivers.map(([d, n]) => `${d} (${n})`).join(", ") || "none"}.`,
    "",
    "HIGH-RISK EMPLOYEES (estimated risk score >= 60):",
    highRisk.length
      ? highRisk.slice(0, 15).map((e) =>
          `- ${e.name} | ${e.role} | ${e.department} | score ${e.score} (${e.level ?? "n/a"}) | attendance ${e.attendance ?? "n/a"}% | goal completion ${e.goalPct ?? "n/a"}% | negative feedback ${e.negativeFb} | drivers: ${e.drivers.join(", ") || "n/a"}`
        ).join("\n")
      : "None.",
    "",
    "Return the attrition report JSON (headline, overall_risk_level, segments, recommended_actions, confidence).",
    "Segment the high-risk employees into meaningful cohorts (e.g. by department or driver pattern) with headcount, average score, key drivers and a recommended action per segment.",
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
      summary: `${s.name}: ${s.headcount} employee(s), avg estimated risk ${s.avg_risk_score}.`,
      evidence: [`Avg estimated risk score ${s.avg_risk_score}`, "Drivers: " + s.key_drivers.join(", ")],
      reasoning: "Cohort-level risk aggregation across risk scores, attendance, goals, and feedback.",
      confidence: report.confidence,
      recommended_action: s.recommended_action,
      action_type: "check-in",
      affected_entities: [s.name],
    }, "attrition")
  );

  const { saved, persistError } = await persistInsights("attrition", records);

  return { report, saved, persistError };
}

// ---------------------------------------------------------------------------
// 4. Performance Analysis
// ---------------------------------------------------------------------------

export interface AnalyzePerformanceResult {
  report: PerformanceAnalysis;
  saved: number;
  persistError?: string;
}

export async function analyzePerformance(): Promise<AnalyzePerformanceResult> {
  const supabase = requireSupabase();

  const [reviewRes, empRes, goalRes] = await Promise.all([
    supabase.from("performance_reviews").select("employee_id, rating, period_end"),
    supabase.from("employees").select("id, departments(name)"),
    supabase.from("goals").select("employee_id, status, progress"),
  ]);
  checkQuery("performance_reviews", reviewRes);
  checkQuery("employees", empRes);
  checkQuery("goals", goalRes);

  const reviews = (reviewRes.data ?? []) as { employee_id: string; rating: number | null; period_end: string | null }[];
  const employees = (empRes.data ?? []) as unknown as { id: string; departments: { name: string } | null }[];
  const goals = (goalRes.data ?? []) as { employee_id: string; status: string; progress: number | null }[];

  const deptOf = new Map(employees.map((e) => [e.id, e.departments?.name ?? "Unassigned"]));

  const deptRows = new Map<string, { latest: number[]; prev: number[]; periods: string[] }>();
  for (const r of reviews) {
    if (r.rating == null || !r.period_end) continue;
    const dept = deptOf.get(r.employee_id) ?? "Unassigned";
    const row = deptRows.get(dept) ?? { latest: [], prev: [], periods: [] };
    const periods = Array.from(new Set((deptRows.get(dept)?.periods ?? []).concat(r.period_end))).sort();
    row.periods = periods;
    const latestPeriod = periods[periods.length - 1];
    if (r.period_end === latestPeriod) row.latest.push(r.rating);
    row.prev.push(r.rating);
    deptRows.set(dept, row);
  }

  const goalPct = new Map<string, number>();
  const goalByEmp = new Map<string, { done: number; total: number }>();
  for (const g of goals) {
    const b = goalByEmp.get(g.employee_id) ?? { done: 0, total: 0 };
    if (["active", "completed"].includes(g.status)) {
      b.total += 1;
      if (g.status === "completed" || (g.progress ?? 0) >= 100) b.done += 1;
    }
    goalByEmp.set(g.employee_id, b);
  }
  for (const [id, b] of goalByEmp) goalPct.set(id, b.total ? Math.round((b.done / b.total) * 100) : 0);

  const deptLines = Array.from(deptRows.entries())
    .map(([dept, row]) => {
      const avg = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null);
      const latestAvg = avg(row.latest);
      const prevAvg = avg(row.prev);
      const delta = latestAvg != null && prevAvg != null ? Math.round((latestAvg - prevAvg) * 100) / 100 : null;
      return `- ${dept}: latest avg ${latestAvg ?? "n/a"} (prior avg ${prevAvg ?? "n/a"}, delta ${delta ?? "n/a"}) rated cycles: ${row.periods.join(", ")}`;
    })
    .join("\n");

  const prompt = [
    "Analyze organizational performance from the review and goal data below.",
    deptLines || "- No review data available.",
    "",
    "Return the performance analysis JSON (headline, overall_rating, by_department with rating/trend/note, strengths, concerns, recommended_actions, confidence).",
    "Rate on the same 1-5 scale. Use 'trend' to compare each department against its prior rated cycle.",
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

  const { saved, persistError } = await persistInsights("performance", records);

  return { report, saved, persistError };
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