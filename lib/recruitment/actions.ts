"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { fetchRecruitmentData, type RecruitmentData } from "@/lib/hr/recruitment";
import { extractResumeText, MAX_RESUME_BYTES } from "@/lib/hiring/resume-parse";
import { generateInterviewQuestions } from "@/lib/ai/actions";
import type { InterviewQuestions } from "@/lib/ai/schemas";
import type { InterviewSetupOptions } from "@/lib/ai/features";

// ---------------------------------------------------------------------------
// Recruitment workspace server actions (data mutations + resume intake).
// AI features (resume analysis / matching / comparison / interview questions)
// live in lib/ai/actions.ts. Every action returns a serializable result; the
// client refreshes its data model through reloadRecruitmentData().
// ---------------------------------------------------------------------------

export interface JobInput {
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
}

const JOB_STATUSES = ["draft", "published", "closed", "filled"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"];
const CANDIDATE_STATUSES = [
  "applied",
  "screening",
  "interview",
  "evaluation",
  "shortlisted",
  "hired",
  "rejected",
  "withdrawn",
];

function errorOf(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error && error.message ? error.message : fallback };
}

function cleanNulls(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = typeof val === "string" && val.trim() === "" ? null : val;
  }
  return out;
}

function sanitizeJob(input: JobInput): Record<string, unknown> {
  if (!input.title?.trim()) throw new Error("A job title is required.");
  const status = JOB_STATUSES.includes(input.status) ? input.status : "draft";
  return cleanNulls({
    title: input.title.trim(),
    department_id: input.department_id,
    status,
    employment_type: EMPLOYMENT_TYPES.includes(input.employment_type ?? "") ? input.employment_type : null,
    location: input.location,
    headcount: input.headcount && input.headcount >= 1 ? input.headcount : 1,
    description: input.description,
    required_skills: input.required_skills,
    preferred_skills: input.preferred_skills,
    experience: input.experience,
    education: input.education,
    seniority: input.seniority,
  });
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function createJob(input: JobInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };
    const { data, error } = await supabase.from("jobs").insert(sanitizeJob(input)).select("id").single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data.id };
  } catch (error) {
    return errorOf(error, "Something went wrong creating the job.");
  }
}

export async function updateJob(id: string, input: JobInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };
    const { error } = await supabase.from("jobs").update(sanitizeJob(input)).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return errorOf(error, "Something went wrong updating the job.");
  }
}

// ---------------------------------------------------------------------------
// Candidates + pipeline
// ---------------------------------------------------------------------------

export interface NewCandidateInput {
  full_name: string;
  email: string;
  phone?: string | null;
  job_id: string | null;
  source?: string | null;
}

export async function createCandidate(
  input: NewCandidateInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    if (!input.full_name?.trim()) return { ok: false, error: "A candidate name is required." };
    if (!input.email?.trim()?.includes("@")) return { ok: false, error: "A valid candidate email is required." };
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };
    const { data, error } = await supabase
      .from("candidates")
      .insert(
        cleanNulls({
          full_name: input.full_name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone,
          job_id: input.job_id,
          source: input.source,
          status: "applied",
        })
      )
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data.id };
  } catch (error) {
    return errorOf(error, "Something went wrong creating the candidate.");
  }
}

export async function updateCandidateStatus(
  candidateId: string,
  status: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!CANDIDATE_STATUSES.includes(status)) return { ok: false, error: "Unknown pipeline stage." };
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };
    const { error } = await supabase.from("candidates").update({ status }).eq("id", candidateId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return errorOf(error, "Something went wrong updating the pipeline stage.");
  }
}

// ---------------------------------------------------------------------------
// Resume upload
// ---------------------------------------------------------------------------

export async function uploadCandidateResume(
  candidateId: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string; extractedChars?: number }> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No resume file was provided." };
    if (file.size > MAX_RESUME_BYTES) return { ok: false, error: "Resume exceeds the 10 MB upload limit." };

    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const buffer = await file.arrayBuffer();
    const { text, fileType } = await extractResumeText(buffer, file.name, file.type);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `candidate/${candidateId}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (uploadError) return { ok: false, error: `Resume upload failed: ${uploadError.message}` };

    const { error: insertError } = await supabase.from("resumes").insert({
      candidate_id: candidateId,
      file_path: filePath,
      file_name: file.name,
      file_type: file.type || fileType,
      file_size: file.size,
      content_text: text,
    });
    if (insertError) return { ok: false, error: `Resume record failed: ${insertError.message}` };

    return { ok: true, extractedChars: text.length };
  } catch (error) {
    return errorOf(error, "Something went wrong uploading the resume.");
  }
}

// ---------------------------------------------------------------------------
// Intelligent Interview Agent
// ---------------------------------------------------------------------------

export async function saveJobInterviewQuestionSet(
  jobId: string,
  questionSet: InterviewQuestions
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };
    const { error } = await supabase
      .from("jobs")
      .update({ interview_question_set: questionSet })
      .eq("id", jobId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return errorOf(error, "Something went wrong saving the question set.");
  }
}

const INTERVIEW_TYPES = ["phone", "video", "onsite", "panel"];

export interface CreateInterviewResult {
  ok: boolean;
  interviewId?: string;
  questionSetGenerated?: boolean;
  error?: string;
}

/**
 * Creates an interview for a candidate against their assigned role. Uses the
 * role's saved AI question set when present, otherwise generates one on the
 * fly (optionally shaped by InterviewSetupOptions) and saves it for the whole
 * team. The candidate is moved to the interview pipeline stage — people in
 * the loop remain in control of every step.
 */
export async function createInterview(
  candidateId: string,
  input: { interview_type: string; scheduled_at: string | null },
  setup?: InterviewSetupOptions
): Promise<CreateInterviewResult> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { data: candidate, error: cErr } = await supabase
      .from("candidates")
      .select("id, job_id, status")
      .eq("id", candidateId)
      .maybeSingle();
    if (cErr) return { ok: false, error: cErr.message };
    if (!candidate?.job_id) return { ok: false, error: "This candidate has no assigned role. Assign a job first." };

    const { data: job, error: jErr } = await supabase
      .from("jobs")
      .select("id, title, interview_question_set")
      .eq("id", candidate.job_id)
      .maybeSingle();
    if (jErr) return { ok: false, error: jErr.message };
    if (!job) return { ok: false, error: "The candidate's role no longer exists." };

    let questionSet = (job.interview_question_set ?? null) as InterviewQuestions | null;
    let questionSetGenerated = false;
    if (!questionSet) {
      const gen = await generateInterviewQuestions(job.id, setup);
      if (!gen.ok || !gen.questions) return { ok: false, error: gen.error ?? "Failed to generate the interview question set." };
      questionSet = gen.questions;
      questionSetGenerated = true;
      await supabase.from("jobs").update({ interview_question_set: questionSet }).eq("id", job.id);
    }

    const interviewType = INTERVIEW_TYPES.includes(input.interview_type) ? input.interview_type : "onsite";

    const { data: interview, error: iErr } = await supabase
      .from("interviews")
      .insert({
        job_id: job.id,
        candidate_id: candidateId,
        interview_type: interviewType,
        status: "scheduled",
        scheduled_at: input.scheduled_at || null,
      })
      .select("id")
      .single();
    if (iErr) return { ok: false, error: `Failed to create the interview: ${iErr.message}` };

    if (questionSet) {
      const questionRows: Record<string, unknown>[] = [];
      for (const section of questionSet.sections) {
        for (const q of section.questions) {
          questionRows.push({
            interview_id: interview.id,
            title: section.focus_area,
            question: q.question,
            order_index: questionRows.length,
          });
        }
      }
      if (questionRows.length > 0) {
        const { error: qErr } = await supabase.from("interview_questions").insert(questionRows);
        if (qErr) return { ok: false, error: `Interview created but its question set failed to save: ${qErr.message}` };
      }
    }

    if (candidate.status !== "interview") {
      await supabase.from("candidates").update({ status: "interview" }).eq("id", candidateId);
    }

    return { ok: true, interviewId: interview.id, questionSetGenerated: questionSetGenerated || undefined };
  } catch (error) {
    return errorOf(error, "Something went wrong setting up the interview.");
  }
}

export interface EvaluationRowInput {
  question: string;
  candidate_response?: string | null;
  rating: number | null;
  notes?: string | null;
}

export async function recordInterviewEvaluationRows(
  interviewId: string,
  rows: EvaluationRowInput[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleaned = rows
      .filter((r) => r.question?.trim())
      .map((r) => cleanNulls({
        interview_id: interviewId,
        question: r.question.trim(),
        candidate_response: r.candidate_response,
        rating: r.rating,
        notes: r.notes,
      }));
    if (cleaned.length === 0) return { ok: false, error: "At least one question record is required." };
    for (const row of cleaned) {
      if (row.rating != null && (typeof row.rating !== "number" || row.rating < 1 || row.rating > 5)) {
        return { ok: false, error: "Ratings must be between 1 and 5." };
      }
    }
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };
    const { error } = await supabase.from("interview_evaluation_rows").insert(cleaned);
    if (error) return { ok: false, error: error.message };
    const { error: sErr } = await supabase.from("interviews").update({ status: "completed" }).eq("id", interviewId);
    if (sErr) return { ok: false, error: sErr.message };
    return { ok: true };
  } catch (error) {
    return errorOf(error, "Something went wrong saving the evaluation.");
  }
}

// ---------------------------------------------------------------------------
// Workspace refresh
// ---------------------------------------------------------------------------

export async function reloadRecruitmentData(): Promise<{ ok: boolean; data?: RecruitmentData; error?: string }> {
  try {
    const data = await fetchRecruitmentData();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to reload recruitment data.",
    };
  }
}