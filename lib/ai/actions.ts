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
  rankCandidate as runCandidateRanking,
  generateInterviewQuestions as runInterviewQuestions,
  evaluateInterview as runInterviewEvaluation,
  answerPolicyQuestion as runPolicyAnswer,
  generateCareerRecommendations as runCareerRecommendations,
  type GenerateWorkforceBriefResult,
  type AnalyzeEmployeeResult as FeatureAnalyzeEmployeeResult,
  type CalculateAttritionInsightsResult,
  type AnalyzePerformanceResult,
  type GenerateSkillRecommendationsResult,
  type GenerateOnboardingPlanResult,
  type RankCandidateResult,
  type GenerateInterviewQuestionsResult,
  type EvaluateInterviewResult,
  type AnswerPolicyQuestionResult,
  type GenerateCareerRecommendationsResult,
} from "@/lib/ai/features";
import { getSupabaseServer } from "@/lib/supabase/server";

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

export async function generateInterviewQuestions(jobId: string): Promise<GenerateInterviewQuestionsActionResult> {
  try {
    const result = await runInterviewQuestions(jobId);
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
  error?: string;
}

export async function answerPolicyQuestion(question: string): Promise<AnswerPolicyQuestionActionResult> {
  try {
    const result = await runPolicyAnswer(question);
    return { ok: true, answer: result.answer };
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