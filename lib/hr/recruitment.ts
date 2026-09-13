import { getSupabaseServer } from "@/lib/supabase/server";
import { normalizeInterviewQuestions } from "@/lib/ai/schemas";
import type { InterviewInsight, InterviewQuestions } from "@/lib/ai/schemas";

// ---------------------------------------------------------------------------
// Recruitment data contracts (server-side fetchers consumed by the page, and
// by the "use server" actions that refresh the workspace after mutations).
// ---------------------------------------------------------------------------

export type CandidateRecommendation = "strong" | "potential" | "needs_assessment";

export const PIPELINE_STAGES = [
  "applied",
  "screening",
  "interview",
  "evaluation",
  "shortlisted",
  "hired",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const TERMINAL_STATES = ["rejected", "withdrawn"] as const;

export interface AssessmentRow {
  candidate_id: string;
  job_id: string;
  overall_match: number;
  skill_match: number | null;
  experience_match: number | null;
  role_relevance: number | null;
  education_match: number | null;
  recommendation: CandidateRecommendation | null;
  summary: string | null;
  why_matches: string[];
  missing_requirements: string[];
  relevant_evidence: string[];
  interview_focus: string[];
  strengths: string[];
  gaps: string[];
  next_step: string | null;
  confidence: number | null;
  updated_at: string | null;
}

export interface RecruitmentJob {
  id: string;
  title: string;
  department_id: string | null;
  department: string | null;
  status: string;
  employment_type: string | null;
  location: string | null;
  headcount: number | null;
  description: string | null;
  required_skills: string | null;
  preferred_skills: string | null;
  experience: string | null;
  education: string | null;
  seniority: string | null;
  question_set: InterviewQuestions | null;
  candidate_count: number;
}

export interface InterviewQuestionRow {
  id: string;
  title: string | null;
  question: string;
  order_index: number;
}

export interface InterviewEvaluationRecord {
  id: string;
  question: string;
  candidate_response: string | null;
  rating: number | null;
  notes: string | null;
  interviewer_name: string | null;
}

export interface CandidateInterview {
  id: string;
  status: string;
  interview_type: string | null;
  scheduled_at: string | null;
  interviewer_name: string | null;
  questions: InterviewQuestionRow[];
  evaluation_records: InterviewEvaluationRecord[];
  ai_insight: InterviewInsight | null;
}

export interface RecruitmentCandidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  job_id: string | null;
  job_title: string | null;
  source: string | null;
  applied_at: string;
  notes: string | null;
  current_title: string | null;
  summary: string | null;
  experience_years: number | null;
  education: string | null;
  projects: string | null;
  certifications: string | null;
  relevant_experience: string | null;
  skills: string[];
  has_resume: boolean;
  resume_file_name: string | null;
  assessment: AssessmentRow | null;
  question_set: InterviewQuestions | null;
  interviews: CandidateInterview[];
}

export interface RecruitableDepartment {
  id: string;
  name: string;
}

export interface RecruitmentData {
  jobs: RecruitmentJob[];
  candidates: RecruitmentCandidate[];
  departments: RecruitableDepartment[];
}

interface AssessmentRowRaw {
  candidate_id: string;
  job_id: string;
  overall_match: number;
  skill_match: number | null;
  experience_match: number | null;
  role_relevance: number | null;
  education_match: number | null;
  recommendation: CandidateRecommendation | null;
  summary: string | null;
  why_matches: string[] | null;
  missing_requirements: string[] | null;
  relevant_evidence: string[] | null;
  interview_focus: string[] | null;
  strengths: string[] | null;
  gaps: string[] | null;
  next_step: string | null;
  confidence: number | null;
  updated_at: string | null;
}

function toAssessment(row: AssessmentRowRaw): AssessmentRow {
  return {
    candidate_id: row.candidate_id,
    job_id: row.job_id,
    overall_match: row.overall_match,
    skill_match: row.skill_match,
    experience_match: row.experience_match,
    role_relevance: row.role_relevance,
    education_match: row.education_match,
    recommendation: row.recommendation,
    summary: row.summary,
    why_matches: row.why_matches ?? [],
    missing_requirements: row.missing_requirements ?? [],
    relevant_evidence: row.relevant_evidence ?? [],
    interview_focus: row.interview_focus ?? [],
    strengths: row.strengths ?? [],
    gaps: row.gaps ?? [],
    next_step: row.next_step,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    updated_at: row.updated_at,
  };
}

interface JobRowRaw {
  id: string;
  title: string;
  department_id: string | null;
  status: string;
  employment_type: string | null;
  location: string | null;
  headcount: number | null;
  description: string | null;
  required_skills: string | null;
  preferred_skills: string | null;
  experience: string | null;
  education: string | null;
  seniority: string | null;
  interview_question_set: unknown;
  departments: { name: string } | null;
  candidates: { id: string }[] | null;
  candidate_count: number | null;
}

interface CandidateRowRaw {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  job_id: string | null;
  source: string | null;
  applied_at: string;
  notes: string | null;
  current_title: string | null;
  summary: string | null;
  experience_years: number | null;
  education: string | null;
  projects: string | null;
  certifications: string | null;
  relevant_experience: string | null;
  jobs: { title: string } | null;
  candidate_skills: { skills: { name: string } | null }[] | null;
  resumes: { file_name: string | null }[] | null;
}

interface InterviewRowRaw {
  id: string;
  candidate_id: string;
  interview_type: string | null;
  status: string;
  scheduled_at: string | null;
  ai_insight: unknown;
  employees: { profiles: { full_name: string } | null } | null;
}

interface InterviewQuestionRowRaw {
  id: string;
  interview_id: string;
  title: string | null;
  question: string;
  order_index: number;
}

interface EvaluationRowRaw {
  id: string;
  interview_id: string;
  question: string;
  candidate_response: string | null;
  rating: number | null;
  notes: string | null;
  employees: { profiles: { full_name: string } | null } | null;
}

function toInterviewInsight(value: unknown): InterviewInsight | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.headline !== "string" || typeof v.overall_score !== "number") return null;

  const dimension = (key: string): { rating: number; note: string } => {
    const d = ((v[key] ?? {}) as Record<string, unknown>);
    return {
      rating: typeof d.rating === "number" ? Math.max(1, Math.min(5, Math.round(d.rating))) : 0,
      note: typeof d.note === "string" ? d.note : "",
    };
  };
  const list = (key: string): string[] => (Array.isArray(v[key]) ? (v[key] as unknown[]).map((x) => (typeof x === "string" ? x : "")) : []);

  return {
    headline: v.headline,
    overall_score: Math.max(0, Math.min(100, Math.round(v.overall_score))),
    technical_competency: dimension("technical_competency"),
    communication: dimension("communication"),
    problem_solving: dimension("problem_solving"),
    role_fit: dimension("role_fit"),
    strengths: list("strengths"),
    concerns: list("concerns"),
    evidence: list("evidence"),
    confidence: typeof v.confidence === "number" ? Math.max(0, Math.min(1, v.confidence)) : 0,
  };
}

function toQuestionSet(value: unknown): InterviewQuestions | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.headline !== "string" || !Array.isArray(v.sections)) return null;
  return normalizeInterviewQuestions(v);
}

/**
 * Loads the full recruitment workspace: jobs (with department + candidate
 * counts), candidates (with skills, resume presence and latest assessment)
 * and departments (for pickers).
 */
export async function fetchRecruitmentData(): Promise<RecruitmentData> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("Supabase is not configured.");

  const [jobRes, candidateRes, deptRes, assessmentRes, interviewRes, interviewQuestionRes, evaluationRes] = await Promise.all([
    supabase.from("jobs").select(`
      id, title, department_id, status, employment_type, location, headcount,
      description, required_skills, preferred_skills, experience, education, seniority,
      interview_question_set,
      departments(name),
      candidates(id)
    `).order("created_at", { ascending: false }),
    supabase.from("candidates").select(`
      id, full_name, email, phone, status, job_id, source, applied_at, notes,
      current_title, summary, experience_years, education, projects, certifications, relevant_experience,
      jobs(title),
      candidate_skills(skills(name)),
      resumes(file_name)
    `).order("applied_at", { ascending: false }),
    supabase.from("departments").select("id, name").order("name", { ascending: true }),
    supabase.from("candidate_assessments").select(`
      candidate_id, job_id, overall_match, skill_match, experience_match, role_relevance,
      education_match, recommendation, summary, why_matches, missing_requirements,
      relevant_evidence, interview_focus, strengths, gaps, next_step, confidence, updated_at
    `),
    supabase.from("interviews").select(`
      id, candidate_id, interview_type, status, scheduled_at, ai_insight,
      employees(profiles(full_name))
    `).order("scheduled_at", { ascending: false }),
    supabase.from("interview_questions").select("id, interview_id, title, question, order_index"),
    supabase.from("interview_evaluation_rows").select(`
      id, interview_id, question, candidate_response, rating, notes,
      employees(profiles(full_name))
    `),
  ]);

  for (const [label, res] of [
    ["jobs", jobRes],
    ["candidates", candidateRes],
    ["departments", deptRes],
    ["assessments", assessmentRes],
    ["interviews", interviewRes],
    ["interview questions", interviewQuestionRes],
    ["interview evaluation records", evaluationRes],
  ] as const) {
    if (res.error) throw new Error(`Failed to load ${label}: ${res.error.message}`);
  }

  const jobs = (jobRes.data ?? []) as unknown as JobRowRaw[];
  const candidateRows = (candidateRes.data ?? []) as unknown as CandidateRowRaw[];
  const departments = (deptRes.data ?? []) as RecruitableDepartment[];
  const assessments = (assessmentRes.data ?? []) as unknown as AssessmentRowRaw[];

  const byCandidateJob = new Map<string, AssessmentRow>();
  for (const row of assessments) {
    byCandidateJob.set(`${row.candidate_id}:${row.job_id}`, toAssessment(row));
  }

  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const questionsByInterview = new Map<string, InterviewQuestionRow[]>();
  for (const row of (interviewQuestionRes.data ?? []) as unknown as InterviewQuestionRowRaw[]) {
    const list = questionsByInterview.get(row.interview_id) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      question: row.question,
      order_index: row.order_index,
    });
    questionsByInterview.set(row.interview_id, list);
  }

  const recordsByInterview = new Map<string, InterviewEvaluationRecord[]>();
  for (const row of (evaluationRes.data ?? []) as unknown as EvaluationRowRaw[]) {
    const list = recordsByInterview.get(row.interview_id) ?? [];
    list.push({
      id: row.id,
      question: row.question,
      candidate_response: row.candidate_response,
      rating: row.rating != null ? Number(row.rating) : null,
      notes: row.notes,
      interviewer_name: row.employees?.profiles?.full_name ?? null,
    });
    recordsByInterview.set(row.interview_id, list);
  }

  const interviewsByCandidate = new Map<string, CandidateInterview[]>();
  for (const row of (interviewRes.data ?? []) as unknown as InterviewRowRaw[]) {
    const interview: CandidateInterview = {
      id: row.id,
      status: row.status,
      interview_type: row.interview_type,
      scheduled_at: row.scheduled_at,
      interviewer_name: row.employees?.profiles?.full_name ?? null,
      questions: questionsByInterview.get(row.id) ?? [],
      evaluation_records: recordsByInterview.get(row.id) ?? [],
      ai_insight: toInterviewInsight(row.ai_insight),
    };
    const list = interviewsByCandidate.get(row.candidate_id) ?? [];
    list.push(interview);
    interviewsByCandidate.set(row.candidate_id, list);
  }

  const candidates: RecruitmentCandidate[] = candidateRows.map((c) => {
    const skills = (c.candidate_skills ?? [])
      .map((s) => s.skills?.name)
      .filter((n): n is string => Boolean(n))
      .sort((a, b) => a.localeCompare(b));

    const resume = c.resumes?.[0];
    const job = c.job_id ? jobById.get(c.job_id) : null;
    const assessment =
      (c.job_id ? byCandidateJob.get(`${c.id}:${c.job_id}`) : undefined) ??
      [...byCandidateJob.entries()].find(([key]) => key.startsWith(`${c.id}:`))?.[1] ??
      null;

    return {
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      status: c.status,
      job_id: c.job_id,
      job_title: c.jobs?.title ?? null,
      source: c.source,
      applied_at: c.applied_at,
      notes: c.notes,
      current_title: c.current_title,
      summary: c.summary,
      experience_years: c.experience_years != null ? Number(c.experience_years) : null,
      education: c.education,
      projects: c.projects,
      certifications: c.certifications,
      relevant_experience: c.relevant_experience,
      skills,
      has_resume: Boolean(c.resumes && c.resumes.length > 0),
      resume_file_name: resume?.file_name ?? null,
      assessment,
      question_set: job ? toQuestionSet(job.interview_question_set) : null,
      interviews: interviewsByCandidate.get(c.id) ?? [],
    };
  });

  const jobsWithCounts: RecruitmentJob[] = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    department_id: j.department_id,
    department: j.departments?.name ?? null,
    status: j.status,
    employment_type: j.employment_type,
    location: j.location,
    headcount: j.headcount,
    description: j.description,
    required_skills: j.required_skills,
    preferred_skills: j.preferred_skills,
    experience: j.experience,
    education: j.education,
    seniority: j.seniority,
    question_set: toQuestionSet(j.interview_question_set),
    candidate_count: j.candidate_count ?? j.candidates?.length ?? 0,
  }));

  return { jobs: jobsWithCounts, candidates, departments };
}