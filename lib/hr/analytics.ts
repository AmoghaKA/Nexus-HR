import type {
  BarDatum,
  Employee,
  Onboarding,
  RecruitmentStage,
  SeriesPoint,
  SkillGap,
  StatCardData,
  TrendPoint,
} from "@/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface HrDashboardData {
  stats: StatCardData[];
  headcountTrend: TrendPoint[];
  attendanceTrend: TrendPoint[];
  performanceTrend: TrendPoint[];
  goalTrend: TrendPoint[];
  departmentDistribution: SeriesPoint[];
  riskDistribution: BarDatum[];
  skillGaps: SkillGap[];
  skillCoverage: number;
  pipeline: RecruitmentStage[];
  onboarding: Onboarding[];
  highRisk: Employee[];
  generatedAt: string;
}

interface EmployeeRow {
  id: string;
  employee_code: string;
  profile_id: string;
  department_id: string | null;
  role_id: string | null;
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

interface RiskRow {
  employee_id: string;
  period: string;
  score: number | null;
  level: string | null;
  factors: Record<string, unknown> | null;
}

// Critical skills the organization tracks coverage against.
export const CRITICAL_SKILLS = [
  { name: "TypeScript", minProficiency: "intermediate" },
  { name: "Cloud Architecture", minProficiency: "intermediate" },
  { name: "AI / ML Engineering", minProficiency: "intermediate" },
  { name: "Security Compliance", minProficiency: "intermediate" },
  { name: "Data Analysis", minProficiency: "intermediate" },
  { name: "People Management", minProficiency: "intermediate" },
] as const;

const SKILL_ACTION: Record<string, string> = {
  "Cloud Architecture": "Launch cloud certification track",
  "AI / ML Engineering": "Partner learning path with hands-on sprints",
  "Security Compliance": "Run mandatory awareness training",
  "Data Analysis": "Analyst enablement workshop",
  "People Management": "Manager cohort program",
  TypeScript: "Frontend upskilling bootcamp",
};

export function riskLevelForScore(score: number): Employee["risk"] {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

/** Returns { key, label, start, end } for the last `count` months ending at `endDate`. */
function lastMonths(count: number, endDate = new Date()) {
  const months: {
    key: string;
    label: string;
    start: Date;
    end: Date;
  }[] = [];
  const cursor = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);
  for (let i = 0; i < count; i++) {
    const end = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    months.unshift({
      key: monthKey(start),
      label: monthLabel(start),
      start,
      end,
    });
  }
  return months;
}

export async function computeHrDashboardData(): Promise<HrDashboardData> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const now = new Date();
  const todayString = now.toISOString().slice(0, 10);

  const [employeesRes, risksRes, reviewsRes, goalsRes, attendanceRes, skillsRes, jobsRes, candidatesRes, onboardingRes, tasksRes] =
    await Promise.all([
      supabase.from("employees").select(`
        id, employee_code, profile_id, department_id, role_id, manager_id,
        date_of_joining, employment_status, location, experience_years, salary_band,
        profiles(full_name, email, avatar_url),
        departments(name),
        roles(title)
      `),
      supabase.from("risk_scores").select("employee_id, period, score, level, factors"),
      supabase.from("performance_reviews").select("employee_id, rating, period_end, status, review_type"),
      supabase.from("goals").select("employee_id, status, progress, due_date, created_at"),
      supabase.from("attendance").select("employee_id, date, status"),
      supabase.from("employee_skills").select("employee_id, proficiency_level, skills(name)"),
      supabase.from("jobs").select("id, title, status"),
      supabase.from("candidates").select("id, status"),
      supabase.from("onboarding_plans").select("id, employee_id, title, status, start_date"),
      supabase.from("onboarding_tasks").select("plan_id, status"),
    ]);

  for (const [label, res] of [
    ["employees", employeesRes],
    ["risk_scores", risksRes],
    ["performance_reviews", reviewsRes],
    ["goals", goalsRes],
    ["attendance", attendanceRes],
    ["employee_skills", skillsRes],
    ["jobs", jobsRes],
    ["candidates", candidatesRes],
    ["onboarding_plans", onboardingRes],
    ["onboarding_tasks", tasksRes],
  ] as const) {
    if (res.error) {
      throw new Error(`Failed to load ${label}: ${res.error.message}`);
    }
  }

  const employees = (employeesRes.data ?? []) as unknown as EmployeeRow[];
  const risks = (risksRes.data ?? []) as RiskRow[];
  const reviews = (reviewsRes.data ?? []) as { employee_id: string; rating: number | null; period_end: string | null; status: string }[];
  const goals = (goalsRes.data ?? []) as { employee_id: string; status: string; progress: number | null; due_date: string | null; created_at: string | null }[];
  const attendance = (attendanceRes.data ?? []) as { employee_id: string; date: string; status: string }[];
  const employeeSkills = (skillsRes.data ?? []) as unknown as { employee_id: string; proficiency_level: string | null; skills: { name: string } | null }[];
  const jobs = (jobsRes.data ?? []) as { id: string; title: string; status: string }[];
  const candidates = (candidatesRes.data ?? []) as { id: string; status: string }[];
  const plans = (onboardingRes.data ?? []) as { id: string; employee_id: string; title: string; status: string; start_date: string | null }[];
  const tasks = (tasksRes.data ?? []) as { plan_id: string; status: string }[];

  const activeEmployees = employees.filter(
    (e) => e.employment_status !== "terminated" && e.employment_status !== "resigned"
  );
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  // ---- Latest risk score per employee -------------------------------------
  const latestRiskByEmployee = new Map<string, { score: number; period: string }>();
  for (const r of risks) {
    if (r.score == null) continue;
    const current = latestRiskByEmployee.get(r.employee_id);
    if (!current || r.period > current.period) {
      latestRiskByEmployee.set(r.employee_id, { score: r.score, period: r.period });
    }
  }

  const highRiskCount = Array.from(latestRiskByEmployee.values()).filter(
    (r) => r.score >= 65
  ).length;

  // ---- Performance --------------------------------------------------------
  const latestReviewByEmployee = new Map<string, number>();
  for (const r of reviews) {
    if (r.rating == null) continue;
    const existing = latestReviewByEmployee.get(r.employee_id);
    if (existing === undefined) {
      latestReviewByEmployee.set(r.employee_id, r.rating);
    }
  }
  const avgRatingValues = Array.from(latestReviewByEmployee.values());
  const averagePerformance =
    avgRatingValues.length === 0
      ? 0
      : avgRatingValues.reduce((a, b) => a + b, 0) / avgRatingValues.length;

  // ---- Goal completion ----------------------------------------------------
  const activeOrDueGoals = goals.filter(
    (g) =>
      g.status === "completed" ||
      g.status === "active" ||
      (g.due_date != null && g.due_date <= todayString)
  );
  const completedGoals = activeOrDueGoals.filter(
    (g) => g.status === "completed" || (g.progress ?? 0) >= 100
  ).length;
  const goalCompletion =
    activeOrDueGoals.length === 0
      ? 0
      : Math.round((completedGoals / activeOrDueGoals.length) * 100);

  // ---- Attendance (last 60 days) ------------------------------------------
  const attendanceCutoff = new Date(now);
  attendanceCutoff.setDate(now.getDate() - 60);
  const recentAttendance = attendance.filter((a) => a.date >= attendanceCutoff.toISOString().slice(0, 10));
  const attendancePresent = recentAttendance.filter((a) =>
    ["present", "late", "half_day", "wfh"].includes(a.status)
  ).length;
  const attendanceRate =
    recentAttendance.length === 0
      ? 0
      : Math.round((attendancePresent / recentAttendance.length) * 1000) / 10;

  // ---- Skill coverage -----------------------------------------------------
  const skillsByEmployee = new Map<string, string[]>();
  for (const s of employeeSkills) {
    const name = s.skills?.name;
    if (!name) continue;
    const list = skillsByEmployee.get(s.employee_id) ?? [];
    list.push(name);
    skillsByEmployee.set(s.employee_id, list);
  }

  const skillCoverageList = CRITICAL_SKILLS.map((skill) => {
    const holders = Array.from(skillsByEmployee.entries()).filter(([, names]) =>
      names.includes(skill.name)
    ).length;
    return {
      name: skill.name,
      coverage: activeEmployees.length === 0 ? 0 : (holders / activeEmployees.length) * 100,
    };
  });
  const skillCoverage =
    Math.round(
      (skillCoverageList.reduce((a, b) => a + b.coverage, 0) / skillCoverageList.length) * 10
    ) / 10;

  const skillGaps: SkillGap[] = skillCoverageList
    .map((s) => ({
      skill: s.name,
      gap: Math.round(100 - s.coverage),
      priority: (100 - s.coverage) >= 30 ? ("high" as const) : (100 - s.coverage) >= 15 ? ("medium" as const) : ("low" as const),
      suggestedAction: SKILL_ACTION[s.name] ?? "Targeted skill enablement program",
    }))
    .sort((a, b) => b.gap - a.gap);

  // ---- New hires (last 30 days) -------------------------------------------
  const hireCutoff = new Date(now);
  hireCutoff.setDate(now.getDate() - 30);
  const newHires = activeEmployees.filter(
    (e) => e.date_of_joining != null && e.date_of_joining >= hireCutoff.toISOString().slice(0, 10)
  ).length;

  const openPositions = jobs.filter((j) => j.status === "published").length;

  // ---- Trends --------------------------------------------------------------
  const headcountTrend = buildHeadcountTrend(activeEmployees);
  const attendanceTrend = buildAttendanceTrend(attendance);
  const performanceTrend = buildPerformanceTrend(reviews);
  const goalTrend = buildGoalTrend(goals);

  // ---- Department distribution ----------------------------------------------
  const deptCounts = new Map<string, number>();
  for (const e of activeEmployees) {
    const name = e.departments?.name ?? "Unassigned";
    deptCounts.set(name, (deptCounts.get(name) ?? 0) + 1);
  }
  const departmentDistribution: SeriesPoint[] = Array.from(deptCounts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // ---- Attrition risk distribution -------------------------------------------
  const riskCounts: Record<Employee["risk"], number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const r of latestRiskByEmployee.values()) {
    riskCounts[riskLevelForScore(r.score)] += 1;
  }
  const riskDistribution: BarDatum[] = [
    { category: "Low", value: riskCounts.low, fill: "#10b981" },
    { category: "Medium", value: riskCounts.medium, fill: "#f59e0b" },
    { category: "High", value: riskCounts.high, fill: "#ef4444" },
    { category: "Critical", value: riskCounts.critical, fill: "#b91c1c" },
  ];

  // ---- High risk employees ---------------------------------------------------
  const highRisk: Employee[] = Array.from(latestRiskByEmployee.entries())
    .map(([id, r]) => {
      const emp = employeeById.get(id);
      return {
        id,
        name: emp?.profiles?.full_name ?? "Unknown",
        role: emp?.roles?.title ?? "—",
        department: emp?.departments?.name ?? "—",
        risk: riskLevelForScore(r.score),
        score: r.score,
      };
    })
    .filter((e) => e.risk === "high" || e.risk === "critical")
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // ---- Recruitment pipeline ---------------------------------------------------
  const stageMap: Array<[string, string]> = [
    ["applied", "Applied"],
    ["screening", "Screening"],
    ["interview", "Interviewed"],
    ["evaluation", "Evaluation"],
    ["shortlisted", "Shortlisted"],
    ["hired", "Hired"],
  ];
  const pipeline: RecruitmentStage[] = stageMap.map(([dbStatus, label]) => ({
    stage: label,
    count: candidates.filter((c) => c.status === dbStatus).length,
  }));

  // ---- Onboarding progress -----------------------------------------------------
  const taskCounts = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    const bucket = taskCounts.get(t.plan_id) ?? { total: 0, done: 0 };
    bucket.total += 1;
    if (t.status === "completed") bucket.done += 1;
    taskCounts.set(t.plan_id, bucket);
  }
  const onboarding: Onboarding[] = plans
    .filter((p) => taskCounts.has(p.id))
    .map((p) => {
      const c = taskCounts.get(p.id)!;
      const emp = employeeById.get(p.employee_id);
      return {
        id: p.id,
        name: emp?.profiles?.full_name ?? "Unknown",
        role: emp?.roles?.title ?? "—",
        startedOn: p.start_date
          ? new Date(p.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "",
        progress: c.total === 0 ? 0 : Math.round((c.done / c.total) * 100),
      };
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  return {
    stats: [
      {
        id: "total-employees",
        label: "Total Employees",
        value: activeEmployees.length.toLocaleString(),
        change: newHires,
        hint: "active headcount",
        icon: "users",
      },
      {
        id: "new-hires",
        label: "New Hires",
        value: String(newHires),
        hint: "last 30 days",
        icon: "user-plus",
      },
      {
        id: "open-positions",
        label: "Open Positions",
        value: String(openPositions),
        hint: "published roles",
        icon: "briefcase",
      },
      {
        id: "high-risk",
        label: "High Risk Employees",
        value: String(highRiskCount),
        change: Math.round(highRiskCount),
        hint: "score ≥ 65",
        icon: "alert",
      },
      {
        id: "avg-performance",
        label: "Average Performance",
        value: `${averagePerformance.toFixed(1)} / 5`,
        hint: "latest review ratings",
        icon: "target",
      },
      {
        id: "goal-completion",
        label: "Goal Completion",
        value: `${goalCompletion}%`,
        hint: "active & due goals",
        icon: "flag",
      },
      {
        id: "attendance",
        label: "Attendance Rate",
        value: `${attendanceRate}%`,
        hint: "last 60 days",
        icon: "calendar",
      },
      {
        id: "skill-coverage",
        label: "Skill Coverage",
        value: `${skillCoverage}%`,
        hint: "of critical skills",
        icon: "layers",
      },
    ],
    headcountTrend,
    attendanceTrend,
    performanceTrend,
    goalTrend,
    departmentDistribution,
    riskDistribution,
    skillGaps,
    skillCoverage,
    pipeline,
    onboarding,
    highRisk,
    generatedAt: now.toISOString(),
  };
}

function buildHeadcountTrend(employees: EmployeeRow[]): TrendPoint[] {
  const months = lastMonths(12);
  let running = 0;
  const counts = months.map((m) => {
    const end = m.end.toISOString().slice(0, 10);
    running += employees.filter(
      (e) => e.date_of_joining != null && e.date_of_joining <= end
    ).length;
    return { month: m.label, value: running };
  });
  return counts.filter((p, i) => i === 0 || p.value > 0);
}

function buildAttendanceTrend(attendance: { date: string; status: string }[]): TrendPoint[] {
  const months = lastMonths(6);
  return months.map((m) => {
    const start = m.start.toISOString().slice(0, 10);
    const end = m.end.toISOString().slice(0, 10);
    const bucket = attendance.filter((a) => a.date >= start && a.date < end);
    const present = bucket.filter((a) => ["present", "late", "half_day", "wfh"].includes(a.status)).length;
    const rate = bucket.length === 0 ? 0 : Math.round((present / bucket.length) * 1000) / 10;
    return { month: m.label, value: rate };
  });
}

function buildPerformanceTrend(
  reviews: { rating: number | null; period_end: string | null }[]
): TrendPoint[] {
  return lastMonths(6)
    .map((m) => {
      const start = m.start.toISOString().slice(0, 10);
      const end = m.end.toISOString().slice(0, 10);
      const bucket = reviews.filter(
        (r) => r.rating != null && r.period_end != null && r.period_end >= start && r.period_end < end
      );
      const avg =
        bucket.length === 0
          ? null
          : bucket.reduce((a, b) => a + (b.rating ?? 0), 0) / bucket.length;
      return avg === null ? null : { month: m.label, value: avg };
    })
    .filter((p): p is TrendPoint => p !== null);
}

function buildGoalTrend(
  goals: { status: string; progress: number | null; due_date: string | null }[]
): TrendPoint[] {
  return lastMonths(6)
    .map((m) => {
      const start = m.start.toISOString().slice(0, 10);
      const end = m.end.toISOString().slice(0, 10);
      const bucket = goals.filter((g) => g.due_date != null && g.due_date >= start && g.due_date < end);
      if (bucket.length === 0) return null;
      const done = bucket.filter(
        (g) => g.status === "completed" || (g.progress ?? 0) >= 100
      ).length;
      return { month: m.label, value: Math.round((done / bucket.length) * 100) };
    })
    .filter((p): p is TrendPoint => p !== null);
}