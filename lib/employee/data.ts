import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { riskLevelForScore } from "@/lib/hr/analytics";
import type {
  EmployeeDetail,
  EmployeeFeedback,
  EmployeeReview,
  EmployeeTraining,
} from "@/lib/hr/directory";
import type { Goal, LearningRecommendation, Onboarding, SeriesPoint, StatCardData, TrendPoint, UpcomingTask } from "@/types";

// ---------------------------------------------------------------------------
// Cookie-based client for the signed-in user. All reads go through RLS, so
// an employee only ever sees rows owned by the linked employee row
// (current_employee_id()). This is the privacy milestone: filtering happens
// in the database, never by hiding things in the UI.
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
        // Token refresh is handled by the proxy; never write cookies in render.
      },
    },
  });
}

export interface EmployeeContext {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  department: string;
  role: string;
  location: string | null;
  status: string;
  joined: string | null;
  managerName: string | null;
}

interface EmployeeJoinRow {
  id: string;
  employee_code: string;
  manager_id: string | null;
  date_of_joining: string | null;
  employment_status: string;
  location: string | null;
  experience_years: number | null;
  profiles: { full_name: string; email: string; avatar_url: string | null } | null;
  departments: { name: string } | null;
  roles: { title: string } | null;
}

function toEmployeeContext(row: EmployeeJoinRow, managerName: string | null): EmployeeContext {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: row.profiles?.full_name ?? "Unknown",
    email: row.profiles?.email ?? "",
    avatarUrl: row.profiles?.avatar_url ?? null,
    department: row.departments?.name ?? "—",
    role: row.roles?.title ?? "—",
    location: row.location,
    status: row.employment_status,
    joined: row.date_of_joining,
    managerName,
  };
}

/**
 * Resolves the signed-in employee's own row through RLS (employees are
 * selectable only where profile_id = auth.uid()). Returns null when there is
 * no session or no linked employee row.
 */
export async function getEmployeeContext(): Promise<EmployeeContext | null> {
  const supabase = await getUserSupabase();
  if (!supabase) return null;

  const { data: empRaw } = await supabase
    .from("employees")
    .select(`
      id, employee_code, manager_id, date_of_joining, employment_status, location,
      profiles(full_name, email, avatar_url),
      departments(name),
      roles(title)
    `)
    .maybeSingle();
  const emp = empRaw as unknown as EmployeeJoinRow | null;
  if (!emp) return null;

  let managerName: string | null = null;
  if (emp.manager_id) {
    const { data: mgrRaw } = await supabase
      .from("employees")
      .select("profiles(full_name)")
      .eq("id", emp.manager_id)
      .maybeSingle();
    const mgr = mgrRaw as unknown as { profiles: { full_name: string } | null } | null;
    managerName = mgr?.profiles?.full_name ?? null;
  }

  return toEmployeeContext(emp, managerName);
}

interface SkillJoinRow {
  proficiency_level: string | null;
  years_experience: number | null;
  is_verified: boolean | null;
  skills: { name: string } | null;
}

interface FeedbackJoinRow {
  id: string;
  category: string | null;
  message: string | null;
  status: string | null;
  visibility: string | null;
  created_at: string | null;
  profiles: { full_name: string } | null;
}

interface TrainingJoinRow {
  id: string;
  status: string;
  enrolled_at: string | null;
  completed_at: string | null;
  score: number | null;
  training_courses: { title: string } | null;
}

interface TaskRow {
  id: string;
  plan_id: string;
  title: string;
  status: string;
  due_date: string | null;
}

interface GoalRow {
  id: string;
  title: string;
  category: string | null;
  status: string;
  progress: number | null;
  start_date: string | null;
  due_date: string | null;
}

interface ReviewRow {
  id: string;
  review_type: string | null;
  period_start: string | null;
  period_end: string | null;
  rating: number | null;
  status: string;
  strengths: string | null;
  improvements: string | null;
}

interface OnboardingPlanRow {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
}

const PRESENT_STATUSES = ["present", "late", "half_day", "wfh"];

/**
 * Loads the signed-in employee's full personal profile through RLS — the same
 * shape HR's fetchEmployeeDetail produces, so AI analysis and prompts can be
 * reused verbatim for the employee workspace.
 */
export async function fetchEmployeeDetailSelf(): Promise<EmployeeDetail | null> {
  const supabase = await getUserSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const [
    empRes,
    skillsRes,
    goalsRes,
    reviewsRes,
    attendanceRes,
    feedbackRes,
    trainingRes,
    onboardingRes,
    riskRes,
  ] = await Promise.all([
    supabase
      .from("employees")
      .select(`
        id, employee_code, manager_id, date_of_joining, employment_status, location, experience_years,
        profiles(full_name, email, avatar_url),
        departments(name),
        roles(title)
      `)
      .maybeSingle(),
    supabase.from("employee_skills").select(`
      proficiency_level, years_experience, is_verified, skills(name)
    `),
    supabase.from("goals").select("id, title, category, status, progress, start_date, due_date").order("created_at", { ascending: true }),
    supabase.from("performance_reviews").select("id, review_type, period_start, period_end, rating, status, strengths, improvements").order("period_end", { ascending: false }),
    supabase.from("attendance").select("date, status").order("date", { ascending: false }).limit(60),
    supabase.from("feedback").select(`
      id, category, message, status, visibility, created_at,
      profiles(full_name)
    `).order("created_at", { ascending: false }).limit(30),
    supabase.from("employee_training").select(`
      id, status, enrolled_at, completed_at, score, training_courses(title)
    `),
    supabase.from("onboarding_plans").select("id, title, status, start_date").order("created_at", { ascending: true }),
    supabase.from("risk_scores").select("period, score, level").order("period", { ascending: true }),
  ]);

  if (empRes.error) throw new Error(`Failed to load employee: ${empRes.error.message}`);
  const emp = empRes.data as unknown as EmployeeJoinRow | null;
  if (!emp) return null;

  let manager: EmployeeDetail["manager"] = null;
  if (emp.manager_id) {
    const { data: mgrRaw } = await supabase
      .from("employees")
      .select("id, profiles(full_name), roles(title)")
      .eq("id", emp.manager_id)
      .maybeSingle();
    const mgr = mgrRaw as unknown as {
      id: string;
      profiles: { full_name: string } | null;
      roles: { title: string } | null;
    } | null;
    manager = mgr
      ? { id: mgr.id, name: mgr.profiles?.full_name ?? "Unknown", role: mgr.roles?.title ?? "" }
      : null;
  }

  const attendance = (attendanceRes.data ?? []) as { date: string; status: string }[];
  const attendanceRate =
    attendance.length === 0
      ? null
      : Math.round((attendance.filter((a) => PRESENT_STATUSES.includes(a.status)).length / attendance.length) * 1000) / 10;

  const tasks = (await supabase
    .from("onboarding_tasks")
    .select("id, plan_id, title, status, due_date")
    .order("order_index", { ascending: true })) as { data: TaskRow[] | null };

  const tasksByPlan = new Map<string, { id: string; title: string; status: string; dueDate: string | null }[]>();
  for (const t of tasks.data ?? []) {
    const list = tasksByPlan.get(t.plan_id) ?? [];
    list.push({ id: t.id, title: t.title, status: t.status, dueDate: t.due_date });
    tasksByPlan.set(t.plan_id, list);
  }

  const riskHistory = ((riskRes.data ?? []) as { period: string; score: number | null; level: string | null }[]).map((r) => ({
    period: r.period,
    score: r.score ?? null,
    level: r.level ?? null,
  }));
  const lastRisk = riskHistory[riskHistory.length - 1];

  const skills = (skillsRes.data ?? []) as unknown as SkillJoinRow[];
  const feedback = (feedbackRes.data ?? []) as unknown as FeedbackJoinRow[];
  const training = (trainingRes.data ?? []) as unknown as TrainingJoinRow[];

  return {
    id: emp.id,
    employeeCode: emp.employee_code,
    name: emp.profiles?.full_name ?? "Unknown",
    email: emp.profiles?.email ?? "",
    avatarUrl: emp.profiles?.avatar_url ?? null,
    department: emp.departments?.name ?? "—",
    role: emp.roles?.title ?? "—",
    location: emp.location,
    status: emp.employment_status,
    joined: emp.date_of_joining,
    experienceYears: emp.experience_years != null ? Number(emp.experience_years) : null,
    salaryBand: null,
    manager,
    skills: skills.map((s) => ({
      name: s.skills?.name ?? "Unknown",
      proficiency: s.proficiency_level,
      years: s.years_experience != null ? Number(s.years_experience) : null,
      verified: s.is_verified ?? false,
    })),
    goals: ((goalsRes.data ?? []) as unknown as GoalRow[]).map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      status: g.status,
      progress: g.progress ?? 0,
      startDate: g.start_date,
      dueDate: g.due_date,
    })),
    reviews: ((reviewsRes.data ?? []) as unknown as ReviewRow[]).map((r) => ({
      id: r.id,
      type: r.review_type,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      rating: r.rating,
      status: r.status,
      strengths: r.strengths,
      improvements: r.improvements,
    })),
    attendanceRate,
    recentAttendance: attendance.slice(0, 14),
    feedback: feedback.map((f) => ({
      id: f.id,
      category: f.category,
      message: f.message,
      status: f.status,
      visibility: f.visibility,
      fromName: f.profiles?.full_name ?? "Anonymous",
      createdAt: f.created_at,
    })),
    training: training.map((t) => ({
      id: t.id,
      title: t.training_courses?.title ?? "Unknown course",
      status: t.status,
      enrolledAt: t.enrolled_at,
      completedAt: t.completed_at,
      score: t.score,
    })),
    onboarding: ((onboardingRes.data ?? []) as unknown as OnboardingPlanRow[]).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      startDate: p.start_date,
      tasks: tasksByPlan.get(p.id) ?? [],
    })),
    riskHistory,
    latestRisk: lastRisk && lastRisk.score != null ? { score: lastRisk.score, level: riskLevelForScore(lastRisk.score) } : null,
  };
}

// ---------------------------------------------------------------------------
// Dashboard view model
// ---------------------------------------------------------------------------

export interface MyDashboard {
  employee: EmployeeContext;
  stats: StatCardData[];
  goals: Goal[];
  performanceTrend: TrendPoint[];
  skillLevels: SeriesPoint[];
  learningItems: LearningRecommendation[];
  onboardingItems: Onboarding[];
  upcomingTasks: UpcomingTask[];
  attendanceRate: number | null;
  recentAttendance: { date: string; status: string }[];
}

export async function fetchMyDashboard(): Promise<MyDashboard | null> {
  const detail = await fetchEmployeeDetailSelf();
  if (!detail) return null;

  const activeGoals = detail.goals.filter((g) => g.status === "active");
  const withProgress = detail.goals.filter((g) => g.status === "active" || g.status === "completed");
  const avgProgress =
    withProgress.length === 0
      ? null
      : Math.round(withProgress.reduce((acc, g) => acc + g.progress, 0) / withProgress.length);
  const ratings = detail.reviews.filter((r) => r.rating != null).map((r) => r.rating as number);
  const latestRating = ratings[0] ?? null;

  const stats: StatCardData[] = [
    {
      id: "my-goals",
      label: "My Goals",
      value: String(activeGoals.length),
      hint: "active this quarter",
      icon: "flag",
    },
    {
      id: "goal-progress",
      label: "Goal Progress",
      value: `${avgProgress ?? 0}%`,
      hint: "across all goals",
      icon: "target",
    },
    {
      id: "performance",
      label: "My Performance",
      value: latestRating != null ? `${latestRating} / 5` : "—",
      hint: latestRating != null ? "latest review rating" : "no reviews yet",
      icon: "users",
    },
    {
      id: "skills",
      label: "My Skills",
      value: String(detail.skills.length),
      hint: "on your skill profile",
      icon: "layers",
    },
  ];

  const goals: Goal[] = detail.goals
    .filter((g) => g.status === "active" || g.status === "completed")
    .map((g) => ({
      title: g.title,
      progress: g.progress ?? 0,
      due: fmtShortDate(g.dueDate) ?? "",
      status: liveGoalStatus(g.status, g.progress ?? 0),
    }));

  const performanceTrend: TrendPoint[] = [...detail.reviews]
    .filter((r) => r.rating != null)
    .sort((a, b) => String(a.periodEnd).localeCompare(String(b.periodEnd)))
    .map((r) => ({ month: fmtMonth(r.periodEnd) ?? "—", value: r.rating as number }));

  const skillLevels: SeriesPoint[] = detail.skills.map((s) => ({
    label: s.name,
    value: proficiencyScore(s.proficiency, s.years),
  }));

  const enrolled = detail.training.filter((t) => t.status !== "completed");
  const learningItems: LearningRecommendation[] = enrolled.map((t) => ({
    id: `training-${t.id}`,
    title: t.title,
    provider: "Enrolled course",
    duration: t.status.replace(/_/g, " "),
    reason:
      t.status === "in_progress"
        ? "Continue to finish this course and build the skill."
        : "Get started to broaden this skill and support your goals.",
  }));

  const onboardingItems: Onboarding[] = detail.onboarding.map((p) => {
    const done = p.tasks.filter((t) => t.status === "completed").length;
    const total = p.tasks.length;
    return {
      id: p.id,
      name: p.title,
      role: p.status.replace(/_/g, " "),
      startedOn: fmtShortDate(p.startDate) ?? "",
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  });

  const upcomingTasks = deriveUpcomingTasks(detail);

  const recentAttendance = detail.recentAttendance.map((a) => ({
    date: asString(a.date),
    status: asString(a.status),
  }));

  return {
    employee: contextFromDetail(detail),
    stats,
    goals,
    performanceTrend,
    skillLevels,
    learningItems,
    onboardingItems,
    upcomingTasks,
    attendanceRate: detail.attendanceRate,
    recentAttendance,
  };
}

function contextFromDetail(detail: EmployeeDetail): EmployeeContext {
  return {
    id: detail.id,
    employeeCode: detail.employeeCode,
    name: detail.name,
    email: detail.email,
    avatarUrl: detail.avatarUrl,
    department: detail.department,
    role: detail.role,
    location: detail.location,
    status: detail.status,
    joined: detail.joined,
    managerName: detail.manager?.name ?? null,
  };
}

// ---------------------------------------------------------------------------
// My Goals with progress history
// ---------------------------------------------------------------------------

export interface MyGoalEntry {
  id: string;
  percent: number | null;
  comment: string | null;
  loggedAt: string | null;
  loggedByName: string | null;
}

export interface MyGoalDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  entries: MyGoalEntry[];
}

export async function fetchMyGoalsDetail(): Promise<MyGoalDetail[] | null> {
  const supabase = await getUserSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const [goalsRes, entriesRes] = await Promise.all([
    supabase
      .from("goals")
      .select("id, title, description, category, status, progress, start_date, due_date, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("goal_progress")
      .select("id, goal_id, progress_percent, comment, logged_at, profiles(full_name)")
      .order("logged_at", { ascending: false })
      .limit(200),
  ]);

  if (goalsRes.error) throw new Error(`Failed to load goals: ${goalsRes.error.message}`);

  const entriesByGoal = new Map<string, MyGoalEntry[]>();
  for (const row of (entriesRes.data ?? []) as unknown as {
    id: string;
    goal_id: string;
    progress_percent: number | null;
    comment: string | null;
    logged_at: string | null;
    profiles: { full_name: string } | null;
  }[]) {
    const list = entriesByGoal.get(row.goal_id) ?? [];
    list.push({
      id: row.id,
      percent: row.progress_percent,
      comment: row.comment,
      loggedAt: row.logged_at,
      loggedByName: row.profiles?.full_name ?? null,
    });
    entriesByGoal.set(row.goal_id, list);
  }

  return ((goalsRes.data ?? []) as unknown as Record<string, unknown>[]).map((g) => ({
    id: asId(g.id),
    title: asString(g.title),
    description: asStringNullable(g.description),
    category: asStringNullable(g.category),
    status: asString(g.status) || "draft",
    progress: asNumberValue(g.progress),
    startDate: asStringNullable(g.start_date),
    dueDate: asStringNullable(g.due_date),
    entries: entriesByGoal.get(asId(g.id)) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Per-module fetchers for the remaining employee pages
// ---------------------------------------------------------------------------

export interface MyOnboardingPlan {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  tasks: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  }[];
}

export async function fetchMyOnboarding(): Promise<MyOnboardingPlan[] | null> {
  const detail = await fetchEmployeeDetailSelf();
  return detail?.onboarding.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    startDate: p.startDate,
    tasks: p.tasks,
  })) ?? null;
}

export interface MyPerformance {
  reviews: EmployeeReview[];
  feedback: EmployeeFeedback[];
  attendanceRate: number | null;
  recentAttendance: { date: string; status: string }[];
}

export async function fetchMyPerformance(): Promise<MyPerformance | null> {
  const detail = await fetchEmployeeDetailSelf();
  if (!detail) return null;
  return {
    reviews: detail.reviews,
    feedback: detail.feedback,
    attendanceRate: detail.attendanceRate,
    recentAttendance: detail.recentAttendance,
  };
}

export async function fetchMySkills(): Promise<{ skills: EmployeeDetail["skills"] } | null> {
  const detail = await fetchEmployeeDetailSelf();
  if (!detail) return null;
  return { skills: detail.skills };
}

export async function fetchMyLearning(): Promise<{ training: EmployeeTraining[] } | null> {
  const detail = await fetchEmployeeDetailSelf();
  if (!detail) return null;
  return { training: detail.training };
}

function asId(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asStringNullable(value: unknown): string | null {
  const s = asString(value);
  return s.length ? s : null;
}

function asNumberValue(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function liveGoalStatus(status: string, progress: number): Goal["status"] {
  if (status === "completed") return "completed";
  if (status === "active") return progress >= 50 ? "on-track" : "at-risk";
  return "at-risk";
}

function proficiencyScore(proficiency: string | null, years: number | null): number {
  if (proficiency) {
    const numeric = Number(proficiency);
    if (Number.isFinite(numeric)) return Math.min(10, Math.max(1, Math.round(numeric * 2)));
    const level = proficiency.toLowerCase();
    if (level.includes("expert") || level.includes("advanced")) return 9;
    if (level.includes("intermediate")) return 6;
    if (level.includes("beginner") || level.includes("basic")) return 3;
  }
  if (years != null && years > 0) return Math.min(10, Math.max(1, Math.round(years)));
  return 5;
}

function deriveUpcomingTasks(detail: EmployeeDetail): UpcomingTask[] {
  const tasks: UpcomingTask[] = [];
  const horizon = 30; // days

  for (const g of detail.goals) {
    if (g.status === "active" && g.dueDate && diffDays(g.dueDate) <= horizon) {
      tasks.push({
        id: `goal-${g.id}`,
        title: `Goal deadline: ${g.title}`,
        due: fmtShortDate(g.dueDate) ?? "due",
        kind: "checkin",
      });
    }
  }
  for (const plan of detail.onboarding) {
    for (const t of plan.tasks) {
      if ((t.status === "pending" || t.status === "in_progress") && t.dueDate && diffDays(t.dueDate) <= horizon) {
        tasks.push({
          id: `task-${t.id}`,
          title: t.title,
          due: fmtShortDate(t.dueDate) ?? "due",
          kind: "training",
        });
      }
    }
  }
  for (const training of detail.training) {
    if (training.status === "in_progress") {
      tasks.push({ id: `training-${training.id}`, title: `Complete training: ${training.title}`, due: "In progress", kind: "training" });
    }
  }
  for (const review of detail.reviews) {
    if (review.status === "draft") {
      tasks.push({ id: `review-${review.id}`, title: `${capitalize(review.type ?? "review")} review to finish`, due: "Pending", kind: "review" });
    }
  }

  return tasks
    .sort((a, b) => {
      if (a.due === "In progress" && b.due === "In progress") return 0;
      if (a.due === "In progress") return -1;
      if (b.due === "In progress") return 1;
      return a.due.localeCompare(b.due);
    })
    .slice(0, 5);
}

function fmtShortDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtMonth(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short" });
}

function diffDays(value: string): number {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return Number.MAX_SAFE_INTEGER;
  return Math.round((d.getTime() - Date.now()) / 86_400_000);
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}