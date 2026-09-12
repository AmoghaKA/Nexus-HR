import type { RiskLevel } from "@/types";
import { getSupabaseServer } from "@/lib/supabase/server";
import { riskLevelForScore } from "@/lib/hr/analytics";

export interface DirectoryEmployee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  role: string;
  location: string;
  status: string;
  joined: string | null;
  performance: number | null;
  risk: RiskLevel;
  riskScore: number | null;
  skills: string[];
}

export interface EmployeeSkill {
  name: string;
  proficiency: string | null;
  years: number | null;
  verified: boolean;
}

export interface EmployeeGoal {
  id: string;
  title: string;
  category: string | null;
  status: string;
  progress: number;
  dueDate: string | null;
  startDate: string | null;
}

export interface EmployeeReview {
  id: string;
  type: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  rating: number | null;
  status: string;
  strengths: string | null;
  improvements: string | null;
}

export interface EmployeeFeedback {
  id: string;
  category: string | null;
  message: string | null;
  status: string | null;
  visibility: string | null;
  fromName: string;
  createdAt: string | null;
}

export interface EmployeeAttendance {
  date: string;
  status: string;
}

export interface EmployeeTraining {
  id: string;
  title: string;
  status: string;
  enrolledAt: string | null;
  completedAt: string | null;
  score: number | null;
}

export interface OnboardingDetail {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  tasks: { id: string; title: string; status: string; dueDate: string | null }[];
}

export interface EmployeeDetail {
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
  experienceYears: number | null;
  salaryBand: string | null;
  manager: { id: string; name: string; role: string } | null;
  skills: EmployeeSkill[];
  goals: EmployeeGoal[];
  reviews: EmployeeReview[];
  attendanceRate: number | null;
  recentAttendance: EmployeeAttendance[];
  feedback: EmployeeFeedback[];
  training: EmployeeTraining[];
  onboarding: OnboardingDetail[];
  riskHistory: { period: string; score: number | null; level: string | null }[];
  latestRisk: { score: number; level: RiskLevel } | null;
}

// ---------------------------------------------------------------------------
// Directory list
// ---------------------------------------------------------------------------

export async function fetchEmployeeDirectory(): Promise<DirectoryEmployee[]> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("Supabase is not configured.");

  const [empRes, riskRes, revRes, skillRes] = await Promise.all([
    supabase.from("employees").select(`
      id, employee_code, date_of_joining, employment_status, location,
      profiles(full_name, email, avatar_url),
      departments(name),
      roles(title)
    `),
    supabase.from("risk_scores").select("employee_id, period, score"),
    supabase.from("performance_reviews").select("employee_id, rating, period_end"),
    supabase.from("employee_skills").select("employee_id, skills(name)"),
  ]);

  for (const [label, res] of [
    ["employees", empRes],
    ["risk_scores", riskRes],
    ["performance_reviews", revRes],
    ["employee_skills", skillRes],
  ] as const) {
    if (res.error) throw new Error(`Failed to load ${label}: ${res.error.message}`);
  }

  const employees = (empRes.data ?? []) as unknown as EmployeeDirRow[];
  const risks = (riskRes.data ?? []) as { employee_id: string; period: string; score: number | null }[];
  const reviews = (revRes.data ?? []) as { employee_id: string; rating: number | null; period_end: string | null }[];
  const skills = (skillRes.data ?? []) as unknown as { employee_id: string; skills: { name: string } | null }[];

  const latestRisk = new Map<string, { score: number; period: string }>();
  for (const r of risks) {
    if (r.score == null) continue;
    const cur = latestRisk.get(r.employee_id);
    if (!cur || r.period > cur.period) latestRisk.set(r.employee_id, { score: r.score, period: r.period });
  }

  const latestRating = new Map<string, number>();
  for (const r of reviews) {
    if (r.rating == null) continue;
    const cur = latestRating.get(r.employee_id);
    if (cur === undefined) latestRating.set(r.employee_id, r.rating);
  }

  const skillsByEmp = new Map<string, string[]>();
  for (const s of skills) {
    const name = s.skills?.name;
    if (!name) continue;
    const list = skillsByEmp.get(s.employee_id) ?? [];
    list.push(name);
    skillsByEmp.set(s.employee_id, list);
  }

  const rows: DirectoryEmployee[] = (employees ?? []).map((e) => {
    const risk = latestRisk.get(e.id);
    return {
      id: e.id,
      employeeCode: e.employee_code,
      name: e.profiles?.full_name || "Unknown",
      email: e.profiles?.email || "",
      department: e.departments?.name || "—",
      role: e.roles?.title || "—",
      location: e.location || "—",
      status: e.employment_status,
      joined: e.date_of_joining,
      performance: latestRating.get(e.id) ?? null,
      risk: risk ? riskLevelForScore(risk.score) : "low",
      riskScore: risk?.score ?? null,
      skills: skillsByEmp.get(e.id) ?? [],
    };
  });

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

interface EmployeeDirRow {
  id: string;
  employee_code: string;
  date_of_joining: string | null;
  employment_status: string;
  location: string | null;
  profiles: { full_name: string; email: string } | null;
  departments: { name: string } | null;
  roles: { title: string } | null;
}

// ---------------------------------------------------------------------------
// Employee detail
// ---------------------------------------------------------------------------

export async function fetchEmployeeDetail(
  id: string
): Promise<EmployeeDetail | null> {
  const supabase = getSupabaseServer();
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
    tasksRes,
    riskRes,
  ] = await Promise.all([
    supabase
      .from("employees")
      .select(`
        id, employee_code, department_id, role_id, manager_id, date_of_joining,
        employment_status, location, experience_years, salary_band,
        profiles(full_name, email, avatar_url),
        departments(name),
        roles(title)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("employee_skills").select(`
      id, proficiency_level, years_experience, is_verified, skills(name)
    `).eq("employee_id", id),
    supabase.from("goals").select("id, title, category, status, progress, start_date, due_date").eq("employee_id", id).order("created_at", { ascending: true }),
    supabase.from("performance_reviews").select("id, review_type, period_start, period_end, rating, status, strengths, improvements").eq("employee_id", id).order("period_end", { ascending: false }),
    supabase.from("attendance").select("date, status").eq("employee_id", id).order("date", { ascending: false }).limit(60),
    supabase.from("feedback").select(`
      id, category, message, status, visibility, created_at,
      profiles(full_name)
    `).eq("to_employee_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("employee_training").select(`
      id, status, enrolled_at, completed_at, score, training_courses(title)
    `).eq("employee_id", id),
    supabase.from("onboarding_plans").select("id, title, status, start_date").eq("employee_id", id).order("created_at", { ascending: true }),
    supabase
      .from("onboarding_tasks")
      .select("id, plan_id, title, status, due_date")
      .in(
        "plan_id",
        (await supabase.from("onboarding_plans").select("id").eq("employee_id", id)).data?.map((p) => p.id) ?? []
      )
      .order("order_index", { ascending: true }),
    supabase.from("risk_scores").select("period, score, level").eq("employee_id", id).order("period", { ascending: true }),
  ]);

  if (empRes.error) throw new Error(`Failed to load employee: ${empRes.error.message}`);
  const emp = empRes.data as unknown as EmployeeDetailRow | null;
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
  const presentStatuses = ["present", "late", "half_day", "wfh"];
  const attendanceRate =
    attendance.length === 0
      ? null
      : Math.round((attendance.filter((a) => presentStatuses.includes(a.status)).length / attendance.length) * 1000) / 10;

  const tasks = (tasksRes.data ?? []) as TaskRow[];
  const tasksByPlan = new Map<string, { id: string; title: string; status: string; dueDate: string | null }[]>();
  for (const t of tasks) {
    const list = tasksByPlan.get(t.plan_id) ?? [];
    list.push({ id: t.id, title: t.title, status: t.status, dueDate: t.due_date });
    tasksByPlan.set(t.plan_id, list);
  }

  const riskHistory = (riskRes.data ?? []).map((r) => ({
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
    salaryBand: emp.salary_band ?? null,
    manager,
    skills: skills.map((s) => ({
      name: s.skills?.name ?? "Unknown",
      proficiency: s.proficiency_level,
      years: s.years_experience != null ? Number(s.years_experience) : null,
      verified: s.is_verified ?? false,
    })),
    goals: (goalsRes.data ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      status: g.status,
      progress: g.progress ?? 0,
      startDate: g.start_date,
      dueDate: g.due_date,
    })),
    reviews: (reviewsRes.data ?? []).map((r) => ({
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
    onboarding: (onboardingRes.data ?? []).map((p) => ({
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

interface EmployeeDetailRow {
  id: string;
  employee_code: string;
  manager_id: string | null;
  date_of_joining: string | null;
  employment_status: string;
  location: string | null;
  experience_years: number | null;
  salary_band: string | null;
  profiles: { full_name: string; email: string; avatar_url: string | null } | null;
  departments: { name: string } | null;
  roles: { title: string } | null;
}

interface SkillJoinRow {
  id: string;
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