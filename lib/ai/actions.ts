"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import {
  generateWorkforceBrief as runWorkforceBrief,
  analyzeEmployee as runEmployeeAnalysis,
  calculateAttritionInsights as runAttrition,
  analyzePerformance as runPerformance,
  generateSkillRecommendations as runSkills,
  generateOnboardingPlan as runOnboardingPlan,
  generateAndPersistOnboardingPlan as runPersistOnboardingPlan,
  evaluateOnboardingProgress as runEvaluateOnboardingProgress,
  evaluateMyOnboardingProgress as runEvaluateMyOnboardingProgress,
  analyzeWorkforceSkills as runWorkforceSkillsGraph,
  rankCandidate as runCandidateRanking,
  generateInterviewQuestions as runInterviewQuestions,
  evaluateInterview as runInterviewEvaluation,
  generateInterviewInsight as runInterviewInsight,
  answerPolicyQuestion as runPolicyAnswer,
  generateCareerRecommendations as runCareerRecommendations,
  analyzeResume as runResumeAnalysis,
  matchCandidate as runCandidateMatch,
  compareCandidates as runCandidateComparison,
  generateEmployeeBrief as runEmployeeBrief,
  sharpenGoal as runSharpenGoal,
  recommendSkillPlan as runSkillPlan,
  explainPerformance as runPerformanceCoach,
  recommendLearning as runLearningPlan,
  type GenerateWorkforceBriefResult,
  type AnalyzeEmployeeResult as FeatureAnalyzeEmployeeResult,
  type CalculateAttritionInsightsResult,
  type AnalyzePerformanceResult,
  type GenerateSkillRecommendationsResult,
  type GenerateOnboardingPlanResult,
  type GenerateAndPersistOnboardingPlanResult,
  type EvaluateOnboardingProgressResult,
  type EvaluateMyOnboardingProgressResult,
  type AnalyzeWorkforceSkillsResult,
  type RankCandidateResult,
  type GenerateInterviewQuestionsResult,
  type EvaluateInterviewResult,
  type GenerateInterviewInsightResult,
  type InterviewSetupOptions,
  type AnswerPolicyQuestionResult,
  type GenerateCareerRecommendationsResult,
  type AnalyzeResumeResult,
  type MatchCandidateResult,
  type CompareCandidatesResult,
  type GenerateEmployeeBriefResult,
  type SharpenGoalInput,
  type SharpenGoalResult,
  type SkillPlanResult,
  type PerformanceCoachResult,
  type LearningPlanResult,
} from "@/lib/ai/features";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAuth } from "@/lib/supabase/auth-client";
import { workspaceRoleFromUser } from "@/lib/auth/role";
import { generateCopilotAnswer as runCopilotAnswer, type CopilotIntent } from "@/lib/ai/copilot";
import type { CopilotAnswer } from "@/lib/ai/schemas";
import {
  createRetentionPlan as runRetentionPlan,
  generateManagerActions as runManagerActions,
} from "@/lib/ai/command";
import type { ManagerActionPlan, RetentionPlan } from "@/lib/ai/schemas";

export interface PickerOption {
  value: string;
  label: string;
  sub?: string;
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// ---------------------------------------------------------------------------
// 1. Workforce brief (HR Dashboard)
// ---------------------------------------------------------------------------

export interface GenerateBriefResult {
  ok: boolean;
  insights?: GenerateWorkforceBriefResult["insights"];
  brief?: GenerateWorkforceBriefResult["brief"];
  saved?: number;
  persistError?: string;
  error?: string;
}

/**
 * HR workload: "Generate Workforce Brief".
 *
 * Flow: Supabase => data aggregation => signal detection => Gemini reasoning =>
 * structured, explainable insight => UI (+ persisted to ai_insights).
 */
export async function generateWorkforceBrief(): Promise<GenerateBriefResult> {
  try {
    const result = await runWorkforceBrief();
    return {
      ok: true,
      insights: result.insights,
      brief: result.brief,
      saved: result.saved,
      persistError: result.persistError,
    };
  } catch (error) {
    return {
      ok: false,
      error: messageOf(error, "Something went wrong while generating the brief."),
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Employee analysis (HR employee detail)
// ---------------------------------------------------------------------------

export interface AnalyzeEmployeeResult {
  ok: boolean;
  analysis?: FeatureAnalyzeEmployeeResult["analysis"];
  package?: FeatureAnalyzeEmployeeResult["package"];
  saved?: number;
  persistError?: string;
  error?: string;
}

/**
 * HR workload: "Analyze Employee".
 */
export async function analyzeEmployee(employeeId: string): Promise<AnalyzeEmployeeResult> {
  try {
    const result = await runEmployeeAnalysis(employeeId);
    return {
      ok: true,
      analysis: result.analysis,
      package: result.package,
      saved: result.saved,
      persistError: result.persistError,
    };
  } catch (error) {
    return {
      ok: false,
      error: messageOf(error, "Something went wrong while analyzing the employee."),
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Attrition report (/hr/attrition)
// ---------------------------------------------------------------------------

export interface CalculateAttritionActionResult {
  ok: boolean;
  report?: CalculateAttritionInsightsResult["report"];
  employeeRisks?: CalculateAttritionInsightsResult["employeeRisks"];
  departmentRisk?: CalculateAttritionInsightsResult["departmentRisk"];
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function calculateAttritionInsights(): Promise<CalculateAttritionActionResult> {
  try {
    const result = await runAttrition();
    return {
      ok: true,
      report: result.report,
      employeeRisks: result.employeeRisks,
      departmentRisk: result.departmentRisk,
      saved: result.saved,
      persistError: result.persistError,
    };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong running the attrition analysis.") };
  }
}

// ---------------------------------------------------------------------------
// 4. Performance analysis (/hr/performance)
// ---------------------------------------------------------------------------

export interface AnalyzePerformanceActionResult {
  ok: boolean;
  report?: AnalyzePerformanceResult["report"];
  topPerformers?: AnalyzePerformanceResult["topPerformers"];
  needsSupport?: AnalyzePerformanceResult["needsSupport"];
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function analyzePerformance(): Promise<AnalyzePerformanceActionResult> {
  try {
    const result = await runPerformance();
    return {
      ok: true,
      report: result.report,
      topPerformers: result.topPerformers,
      needsSupport: result.needsSupport,
      saved: result.saved,
      persistError: result.persistError,
    };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong analyzing performance.") };
  }
}

// ---------------------------------------------------------------------------
// 5. Skill recommendations (/hr/skills)
// ---------------------------------------------------------------------------

export interface GenerateSkillRecommendationsActionResult {
  ok: boolean;
  report?: GenerateSkillRecommendationsResult["report"];
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function generateSkillRecommendations(): Promise<GenerateSkillRecommendationsActionResult> {
  try {
    const result = await runSkills();
    return { ok: true, report: result.report, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating skill recommendations.") };
  }
}

// ---------------------------------------------------------------------------
// 6. Onboarding plan (/hr/onboarding)
// ---------------------------------------------------------------------------

export interface GenerateOnboardingPlanActionResult {
  ok: boolean;
  plan?: GenerateOnboardingPlanResult["plan"];
  employeeName?: string;
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function generateOnboardingPlan(employeeId: string): Promise<GenerateOnboardingPlanActionResult> {
  try {
    const result = await runOnboardingPlan(employeeId);
    return { ok: true, plan: result.plan, employeeName: result.employeeName, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating the onboarding plan.") };
  }
}

export async function listOnboardingEmployees(): Promise<{ ok: boolean; employees: PickerOption[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, employees: [], error: "Supabase is not configured." };
    const { data, error } = await supabase
      .from("employees")
      .select("id, date_of_joining, employment_status, profiles(full_name), roles(title)")
      .order("date_of_joining", { ascending: false })
      .limit(50);
    if (error) return { ok: false, employees: [], error: error.message };
    const employees = ((data ?? []) as unknown as {
      id: string;
      date_of_joining: string | null;
      profiles: { full_name: string } | null;
      roles: { title: string } | null;
    }[]).map((e) => ({
      value: e.id,
      label: e.profiles?.full_name ?? "Unknown employee",
      sub: e.roles?.title ?? "No role",
    }));
    return { ok: true, employees };
  } catch (error) {
    return { ok: false, employees: [], error: messageOf(error, "Failed to load employees.") };
  }
}

export interface GenerateAndPersistOnboardingPlanActionResult {
  ok: boolean;
  plan?: GenerateAndPersistOnboardingPlanResult["plan"];
  employeeName?: string;
  persisted?: boolean;
  skippedExisting?: boolean;
  saved?: number;
  persistError?: string;
  error?: string;
}

/** Adaptive onboarding centerpiece: generate a personalized Day 1 / Week 1-3
 *  journey and persist it into onboarding_plans/onboarding_tasks so the new
 *  hire can track it (Completed / Pending / Overdue / Blocked). */
export async function generateAndPersistOnboardingPlan(
  employeeId: string
): Promise<GenerateAndPersistOnboardingPlanActionResult> {
  try {
    const result = await runPersistOnboardingPlan(employeeId);
    return {
      ok: true,
      plan: result.plan,
      employeeName: result.employeeName,
      persisted: result.persisted,
      skippedExisting: result.skippedExisting,
      saved: result.saved,
      persistError: result.persistError,
    };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating the onboarding journey.") };
  }
}

export interface EvaluateOnboardingProgressActionResult {
  ok: boolean;
  insight?: EvaluateOnboardingProgressResult["insight"];
  employee?: EvaluateOnboardingProgressResult["employee"];
  saved?: number;
  persistError?: string;
  error?: string;
}

/** Adaptive assessment (HR): diagnoses the issue when a new hire is behind
 *  and prescribes manager actions. */
export async function evaluateOnboardingProgress(
  employeeId: string
): Promise<EvaluateOnboardingProgressActionResult> {
  try {
    const result = await runEvaluateOnboardingProgress(employeeId);
    return { ok: true, insight: result.insight, employee: result.employee, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong evaluating onboarding progress.") };
  }
}

export interface EvaluateMyOnboardingProgressActionResult {
  ok: boolean;
  insight?: EvaluateMyOnboardingProgressResult["insight"];
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function evaluateMyOnboardingProgress(): Promise<EvaluateMyOnboardingProgressActionResult> {
  try {
    const result = await runEvaluateMyOnboardingProgress();
    return { ok: true, insight: result.insight, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong evaluating your onboarding progress.") };
  }
}

export interface AnalyzeWorkforceSkillsActionResult {
  ok: boolean;
  graph?: AnalyzeWorkforceSkillsResult["graph"];
  analysis?: AnalyzeWorkforceSkillsResult["analysis"];
  saved?: number;
  persistError?: string;
  error?: string;
}

/** Workforce Skill Graph: exact coverage/gap numbers plus AI insight and
 *  hiring-vs-upskilling recommendations. */
export async function analyzeWorkforceSkills(): Promise<AnalyzeWorkforceSkillsActionResult> {
  try {
    const result = await runWorkforceSkillsGraph();
    return { ok: true, graph: result.graph, analysis: result.analysis, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong analyzing the workforce skill graph.") };
  }
}

// ---------------------------------------------------------------------------
// 7. Candidate ranking (/hr/recruitment)
// ---------------------------------------------------------------------------

export interface RankCandidateActionResult {
  ok: boolean;
  ranking?: RankCandidateResult["ranking"];
  error?: string;
}

export async function rankCandidate(candidateId: string): Promise<RankCandidateActionResult> {
  try {
    const result = await runCandidateRanking(candidateId);
    return { ok: true, ranking: result.ranking };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong ranking the candidate.") };
  }
}

export async function listCandidates(): Promise<{ ok: boolean; candidates: PickerOption[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, candidates: [], error: "Supabase is not configured." };
    const { data, error } = await supabase
      .from("candidates")
      .select("id, full_name, status, job_id")
      .order("applied_at", { ascending: false })
      .limit(100);
    if (error) return { ok: false, candidates: [], error: error.message };
    const candidates = ((data ?? []) as { id: string; full_name: string; status: string; job_id: string | null }[]).map((c) => ({
      value: c.id,
      label: c.full_name,
      sub: `${c.status}${c.job_id ? " · candidate" : ""}`,
    }));
    return { ok: true, candidates };
  } catch (error) {
    return { ok: false, candidates: [], error: messageOf(error, "Failed to load candidates.") };
  }
}

// ---------------------------------------------------------------------------
// 8. Interview questions (/hr/recruitment)
// ---------------------------------------------------------------------------

export interface GenerateInterviewQuestionsActionResult {
  ok: boolean;
  questions?: GenerateInterviewQuestionsResult["questions"];
  error?: string;
}

export async function generateInterviewQuestions(
  jobId: string,
  options?: InterviewSetupOptions
): Promise<GenerateInterviewQuestionsActionResult> {
  try {
    const result = await runInterviewQuestions(jobId, options);
    return { ok: true, questions: result.questions };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating interview questions.") };
  }
}

export async function listJobs(): Promise<{ ok: boolean; jobs: PickerOption[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, jobs: [], error: "Supabase is not configured." };
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, status")
      .order("title", { ascending: true })
      .limit(200);
    if (error) return { ok: false, jobs: [], error: error.message };
    const jobs = ((data ?? []) as { id: string; title: string; status: string }[]).map((j) => ({
      value: j.id,
      label: j.title,
      sub: j.status,
    }));
    return { ok: true, jobs };
  } catch (error) {
    return { ok: false, jobs: [], error: messageOf(error, "Failed to load jobs.") };
  }
}

// ---------------------------------------------------------------------------
// 9. Interview evaluation (/hr/recruitment)
// ---------------------------------------------------------------------------

export interface EvaluateInterviewActionResult {
  ok: boolean;
  evaluation?: EvaluateInterviewResult["evaluation"];
  error?: string;
}

export async function evaluateInterview(interviewId: string): Promise<EvaluateInterviewActionResult> {
  try {
    const result = await runInterviewEvaluation(interviewId);
    return { ok: true, evaluation: result.evaluation };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong evaluating the interview.") };
  }
}

export interface GenerateInterviewInsightActionResult {
  ok: boolean;
  insight?: GenerateInterviewInsightResult["insight"];
  error?: string;
}

export async function generateInterviewInsight(interviewId: string): Promise<GenerateInterviewInsightActionResult> {
  try {
    const result = await runInterviewInsight(interviewId);
    return { ok: true, insight: result.insight };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating the interview insight.") };
  }
}

export async function listInterviews(): Promise<{ ok: boolean; interviews: PickerOption[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, interviews: [], error: "Supabase is not configured." };
    const { data, error } = await supabase
      .from("interviews")
      .select("id, status, candidates(full_name), jobs(title)")
      .order("scheduled_at", { ascending: false })
      .limit(100);
    if (error) return { ok: false, interviews: [], error: error.message };
    const interviews = ((data ?? []) as unknown as {
      id: string;
      status: string;
      candidates: { full_name: string } | null;
      jobs: { title: string } | null;
    }[]).map((i) => ({
      value: i.id,
      label: i.candidates?.full_name ?? "Unknown candidate",
      sub: `${i.jobs?.title ?? "No role"} · ${i.status}`,
    }));
    return { ok: true, interviews };
  } catch (error) {
    return { ok: false, interviews: [], error: messageOf(error, "Failed to load interviews.") };
  }
}

// ---------------------------------------------------------------------------
// 10. Policy Q&A (/hr/policies)
// ---------------------------------------------------------------------------

export interface AnswerPolicyQuestionActionResult {
  ok: boolean;
  answer?: AnswerPolicyQuestionResult["answer"];
  sources?: AnswerPolicyQuestionResult["sources"];
  found?: boolean;
  error?: string;
}

export async function answerPolicyQuestion(question: string): Promise<AnswerPolicyQuestionActionResult> {
  try {
    const result = await runPolicyAnswer(question);
    return { ok: true, answer: result.answer, sources: result.sources, found: result.found };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong answering the question.") };
  }
}

// ---------------------------------------------------------------------------
// 11. Career recommendations (/employee/career) — resolves the signed-in employee
// ---------------------------------------------------------------------------

export interface GenerateCareerRecommendationsActionResult {
  ok: boolean;
  recommendations?: GenerateCareerRecommendationsResult["recommendations"];
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function generateCareerRecommendations(): Promise<GenerateCareerRecommendationsActionResult> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return { ok: false, error: "Supabase is not configured." };

    const cookieStore = await cookies();
    const auth = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Token refresh is handled by the proxy; server actions cannot set cookies.
        },
      },
    });
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return { ok: false, error: "You are not signed in." };

    const service = getSupabaseServer();
    if (!service) return { ok: false, error: "Supabase is not configured." };
    const { data: emp } = await service
      .from("employees")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!emp) return { ok: false, error: "No employee profile is linked to your account yet." };

    const result = await runCareerRecommendations((emp as { id: string }).id);
    return {
      ok: true,
      recommendations: result.recommendations,
      saved: result.saved,
      persistError: result.persistError,
    };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating career recommendations.") };
  }
}

// ---------------------------------------------------------------------------
// 12. Resume analysis (/hr/recruitment)
// ---------------------------------------------------------------------------

export interface AnalyzeResumeActionResult {
  ok: boolean;
  analysis?: AnalyzeResumeResult["analysis"];
  error?: string;
}

export async function analyzeResume(candidateId: string): Promise<AnalyzeResumeActionResult> {
  try {
    const result = await runResumeAnalysis(candidateId);
    return { ok: true, analysis: result.analysis };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong analyzing the resume.") };
  }
}

// ---------------------------------------------------------------------------
// 13. Candidate matching (/hr/recruitment)
// ---------------------------------------------------------------------------

export interface MatchCandidateActionResult {
  ok: boolean;
  match?: MatchCandidateResult["match"];
  error?: string;
}

export async function matchCandidate(candidateId: string): Promise<MatchCandidateActionResult> {
  try {
    const result = await runCandidateMatch(candidateId);
    return { ok: true, match: result.match };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong matching the candidate.") };
  }
}

// ---------------------------------------------------------------------------
// 14. Candidate comparison (/hr/recruitment)
// ---------------------------------------------------------------------------

export interface CompareCandidatesActionResult {
  ok: boolean;
  comparison?: CompareCandidatesResult["comparison"];
  rows?: CompareCandidatesResult["rows"];
  error?: string;
}

export async function compareCandidates(candidateIds: string[]): Promise<CompareCandidatesActionResult> {
  try {
    const result = await runCandidateComparison(candidateIds);
    return { ok: true, comparison: result.comparison, rows: result.rows };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong comparing the candidates.") };
  }
}

// ---------------------------------------------------------------------------
// 15. Personal AI workforce brief (/employee/dashboard)
// ---------------------------------------------------------------------------

async function resolveEmployeeId(): Promise<{ employeeId: string } | { error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { error: "Supabase is not configured." };

  const cookieStore = await cookies();
  const auth = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Token refresh is handled by the proxy; server actions cannot set cookies.
      },
    },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { error: "You are not signed in." };

  const service = getSupabaseServer();
  if (!service) return { error: "Supabase is not configured." };
  const { data: emp } = await service
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!emp) return { error: "No employee profile is linked to your account yet." };

  return { employeeId: (emp as { id: string }).id };
}

export interface GenerateEmployeeBriefActionResult {
  ok: boolean;
  brief?: GenerateEmployeeBriefResult["brief"];
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function generateEmployeeBrief(): Promise<GenerateEmployeeBriefActionResult> {
  try {
    const identity = await resolveEmployeeId();
    if ("error" in identity) return { ok: false, error: identity.error };

    const result = await runEmployeeBrief();
    return { ok: true, brief: result.brief, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating your AI brief.") };
  }
}

// ---------------------------------------------------------------------------
// 16. Goal sharpening (/employee/goals)
// ---------------------------------------------------------------------------

export interface SharpenGoalActionResult {
  ok: boolean;
  goal?: SharpenGoalResult["goal"];
  error?: string;
}

export async function sharpenGoal(input: SharpenGoalInput): Promise<SharpenGoalActionResult> {
  try {
    const identity = await resolveEmployeeId();
    if ("error" in identity) return { ok: false, error: identity.error };

    const result = await runSharpenGoal(input);
    return { ok: true, goal: result.goal };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong sharpening this goal.") };
  }
}

// ---------------------------------------------------------------------------
// 17. Personal skill plan (/employee/skills)
// ---------------------------------------------------------------------------

export interface SkillPlanActionResult {
  ok: boolean;
  plan?: SkillPlanResult["plan"];
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function recommendSkillPlan(): Promise<SkillPlanActionResult> {
  try {
    const identity = await resolveEmployeeId();
    if ("error" in identity) return { ok: false, error: identity.error };

    const result = await runSkillPlan();
    return { ok: true, plan: result.plan, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating your skill plan.") };
  }
}

// ---------------------------------------------------------------------------
// 18. Performance coach (/employee/performance)
// ---------------------------------------------------------------------------

export interface PerformanceCoachActionResult {
  ok: boolean;
  coach?: PerformanceCoachResult["coach"];
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function explainPerformance(): Promise<PerformanceCoachActionResult> {
  try {
    const identity = await resolveEmployeeId();
    if ("error" in identity) return { ok: false, error: identity.error };

    const result = await runPerformanceCoach();
    return { ok: true, coach: result.coach, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong analyzing your performance.") };
  }
}

// ---------------------------------------------------------------------------
// 19. Learning recommendations (/employee/learning)
// ---------------------------------------------------------------------------

export interface LearningPlanActionResult {
  ok: boolean;
  plan?: LearningPlanResult["plan"];
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function recommendLearning(): Promise<LearningPlanActionResult> {
  try {
    const identity = await resolveEmployeeId();
    if ("error" in identity) return { ok: false, error: identity.error };

    const result = await runLearningPlan();
    return { ok: true, plan: result.plan, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating learning recommendations.") };
  }
}

// ---------------------------------------------------------------------------
// 20. HR AI Workforce Copilot (/hr/copilot)
// ---------------------------------------------------------------------------

async function requireHrSession(): Promise<{ ok: true; error?: undefined } | { ok: false; error: string }> {
  const auth = await getSupabaseAuth();
  if (!auth) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
    error,
  } = await auth.auth.getUser();
  if (error || !user) return { ok: false, error: "You are not signed in." };
  if (workspaceRoleFromUser(user) !== "hr") {
    return { ok: false, error: "Only HR staff can ask workforce questions." };
  }
  return { ok: true };
}

export interface AnswerCopilotQuestionActionResult {
  ok: boolean;
  intent?: CopilotIntent;
  answer?: CopilotAnswer;
  error?: string;
}

/**
 * HR workload: "Ask the Workforce Copilot".
 *
 * Flow: classify intent => load targeted Supabase data => structured Gemini
 * answer (answer/evidence/reasoning/actions/entities). Guarded server-side so
 * employee accounts cannot invoke it even if they reach the route.
 */
export async function answerCopilotQuestion(
  question: string,
  history: string[] = []
): Promise<AnswerCopilotQuestionActionResult> {
  try {
    const guard = await requireHrSession();
    if (!guard.ok) return { ok: false, error: guard.error };

    const result = await runCopilotAnswer(question, history);
    return { ok: true, intent: result.intent, answer: result.answer };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong answering your question.") };
  }
}

// ---------------------------------------------------------------------------
// 21. Command-center AI actions (/hr/dashboard — Create Retention Plan,
//     Generate Manager Actions). Results are persisted to ai_insights.
// ---------------------------------------------------------------------------

export interface CreateRetentionPlanActionResult {
  ok: boolean;
  plan?: RetentionPlan;
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function createRetentionPlan(): Promise<CreateRetentionPlanActionResult> {
  try {
    const result = await runRetentionPlan();
    return { ok: true, plan: result.plan, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong creating the retention plan.") };
  }
}

export interface GenerateManagerActionsActionResult {
  ok: boolean;
  plan?: ManagerActionPlan;
  saved?: number;
  persistError?: string;
  error?: string;
}

export async function generateManagerActions(): Promise<GenerateManagerActionsActionResult> {
  try {
    const result = await runManagerActions();
    return { ok: true, plan: result.plan, saved: result.saved, persistError: result.persistError };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong generating manager actions.") };
  }
}