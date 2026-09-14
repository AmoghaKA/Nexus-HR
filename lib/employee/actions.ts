"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// Employee-owned mutations. Every write goes through the cookie-based client
// so Supabase RLS enforces ownership: employees can only insert/update rows
// linked to their own employee row (current_employee_id()).
// ---------------------------------------------------------------------------

async function getUserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Token refresh is handled by the proxy; server actions cannot set cookies.
      },
    },
  });
}

type SelfSupabase = NonNullable<Awaited<ReturnType<typeof getUserSupabase>>>;

/**
 * Resolves the signed-in employee's own row id through RLS
 * (employees are selectable only where profile_id = auth.uid()). Writes that
 * link an employee_id to a row MUST use this id so the insert/update RLS
 * `with check` (employee_id = current_employee_id()) passes.
 */
async function getSelfEmployeeId(supabase: SelfSupabase): Promise<string | null> {
  const { data } = await supabase.from("employees").select("id").maybeSingle();
  return data ? (data as { id: string }).id : null;
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export interface EmployeeActionResult {
  ok: boolean;
  error?: string;
  progress?: number;
}

export interface GoalActionResult extends EmployeeActionResult {
  goalId?: string;
}

/** Records a progress check-in on a goal and updates the goal's progress. */
export async function updateGoalProgress(
  goalId: string,
  progress: number,
  comment?: string
): Promise<EmployeeActionResult> {
  try {
    const supabase = await getUserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const clamped = Math.max(0, Math.min(100, Math.round(progress)));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You are not signed in." };

    const { error: insErr } = await supabase.from("goal_progress").insert({
      goal_id: goalId,
      progress_percent: clamped,
      comment: comment?.trim() || null,
      logged_by: user.id,
    });
    if (insErr) return { ok: false, error: `Failed to log progress: ${insErr.message}` };

    const { error: updErr } = await supabase
      .from("goals")
      .update({ progress: clamped })
      .eq("id", goalId);
    if (updErr) return { ok: false, error: `Failed to update goal: ${updErr.message}` };

    return { ok: true, progress: clamped };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong updating the goal.") };
  }
}

/** Adds an achievement note to a goal (stored as a progress log entry). */
export async function addGoalAchievement(goalId: string, achievement: string): Promise<EmployeeActionResult> {
  try {
    if (!achievement.trim()) return { ok: false, error: "Describe the achievement." };

    const supabase = await getUserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You are not signed in." };

    const { data: goalRaw } = await supabase
      .from("goals")
      .select("id, progress")
      .eq("id", goalId)
      .maybeSingle();
    const goal = goalRaw as { id: string; progress: number } | null;
    if (!goal) return { ok: false, error: "Goal not found." };

    const { error: insErr } = await supabase.from("goal_progress").insert({
      goal_id: goal.id,
      progress_percent: goal.progress ?? 0,
      comment: `Achievement: ${achievement.trim()}`,
      logged_by: user.id,
    });
    if (insErr) return { ok: false, error: `Failed to add achievement: ${insErr.message}` };

    return { ok: true, progress: goal.progress ?? 0 };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong adding the achievement.") };
  }
}

const GOAL_CATEGORIES = ["career", "performance", "learning", "personal", "project"] as const;

export interface CreateGoalInput {
  title: string;
  description?: string;
  category?: string;
  dueDate?: string;
}

/** Creates a personal goal as "active". RLS ties it to the signed-in employee. */
export async function createGoal(input: CreateGoalInput): Promise<GoalActionResult> {
  try {
    if (!input.title.trim()) return { ok: false, error: "Give the goal a title." };

    const supabase = await getUserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const category = GOAL_CATEGORIES.includes(input.category as (typeof GOAL_CATEGORIES)[number])
      ? input.category
      : "personal";

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You are not signed in." };

    const employeeId = await getSelfEmployeeId(supabase);
    if (!employeeId) {
      return {
        ok: false,
        error: "Your account isn't linked to an employee record. Ask your administrator to provision it.",
      };
    }

    const { data: row, error } = await supabase
      .from("goals")
      .insert({
        employee_id: employeeId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: category ?? "personal",
        status: "active",
        due_date: input.dueDate || null,
        progress: 0,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: `Failed to create goal: ${error.message}` };

    return { ok: true, goalId: (row as { id: string }).id };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong creating the goal.") };
  }
}

/** Marks a goal completed and sets progress to 100. */
export async function completeGoal(goalId: string): Promise<EmployeeActionResult> {
  try {
    const supabase = await getUserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { error } = await supabase
      .from("goals")
      .update({ status: "completed", progress: 100 })
      .eq("id", goalId);
    if (error) return { ok: false, error: `Failed to close the goal: ${error.message}` };

    return { ok: true, progress: 100 };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong closing the goal.") };
  }
}

export interface UpdateGoalContentInput {
  title: string;
  description?: string;
}

/** Adopts an AI-written (or hand-edited) goal title/description. */
export async function updateGoalContent(goalId: string, input: UpdateGoalContentInput): Promise<EmployeeActionResult> {
  try {
    if (!input.title.trim()) return { ok: false, error: "Give the goal a title." };

    const supabase = await getUserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { error } = await supabase
      .from("goals")
      .update({ title: input.title.trim(), description: input.description?.trim() || null })
      .eq("id", goalId);
    if (error) return { ok: false, error: `Failed to update the goal: ${error.message}` };

    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong updating the goal.") };
  }
}

/** Toggles an onboarding task to completed/pending. RLS restricts to own plans. */
export async function toggleOnboardingTask(taskId: string, done: boolean): Promise<EmployeeActionResult> {
  try {
    const supabase = await getUserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { error } = await supabase
      .from("onboarding_tasks")
      .update({
        status: done ? "completed" : "pending",
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq("id", taskId);
    if (error) return { ok: false, error: `Failed to update task: ${error.message}` };

    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong updating the task.") };
  }
}

export interface UpdateProfileInput {
  location?: string;
}

/** Updates the employee's own profile fields. RLS restricts to own row. */
export async function updateEmployeeProfile(input: UpdateProfileInput): Promise<EmployeeActionResult> {
  try {
    const supabase = await getUserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You are not signed in." };

    const updates: Record<string, unknown> = {};
    if (input.location !== undefined) updates.location = input.location?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return { ok: false, error: "Nothing to update." };
    }

    const { error } = await supabase
      .from("employees")
      .update(updates)
      .eq("profile_id", user.id);
    if (error) return { ok: false, error: `Failed to update profile: ${error.message}` };

    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Something went wrong updating your profile.") };
  }
}