import type {
  AiInsight,
  InsightSeverity,
  RecruitmentStage,
  RiskLevel,
  SkillGap,
  TrendPoint,
} from "@/types";
import { getSupabaseServer } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Workforce data package
//
// This is the *summarized, structured* payload that will later be sent to
// Gemini so the model can compose narrative briefings. It is intentionally
// NOT raw database rows — trends, deltas, and rollups are computed here.
// ---------------------------------------------------------------------------

export interface DepartmentStats {
  department: string;
  headcount: number;
  avgPerformance: number | null;
  goalCompletionPct: number | null;
  attendanceRatePct: number | null;
  attendanceVariabilityPct: number | null;
  negativeFeedbackCount: number;
  highRiskCount: number;
  avgRiskScore: number | null;
  riskTrendDelta: number | null;
  skillCoveragePct: number | null;
  openRolesCount: number;
}

export interface OrgTrends {
  performance: TrendPoint[];
  attendance: TrendPoint[];
  goals: TrendPoint[];
  headcount: TrendPoint[];
}

export interface RiskSignals {
  highRiskCount: number;
  criticalRiskCount: number;
  highOrCriticalPct: number | null;
  topDrivers: { driver: string; employees: number }[];
}

export interface RecruitmentMetrics {
  openRoles: number;
  totalCandidates: number;
  activeCandidates: number;
  hiredLast90Days: number;
  byStage: RecruitmentStage[];
  avgDaysSinceApplied: number | null;
}

export interface OnboardingMetrics {
  activePlans: number;
  delayedTasks: number;
  overdueTaskPct: number | null;
  avgProgressPct: number | null;
}

export interface EmployeeGoalSummary {
  employee: string;
  department: string;
  completionPct: number;
  activeCount: number;
}

export interface WorkforceDataPackage {
  generatedAt: string;
  departments: DepartmentStats[];
  trends: OrgTrends;
  risk: RiskSignals;
  skills: { gaps: SkillGap[]; overallCoveragePct: number | null };
  onboarding: OnboardingMetrics;
  recruitment: RecruitmentMetrics;
  goalsByEmployee: EmployeeGoalSummary[];
}

export interface WorkforceBriefing {
  package: WorkforceDataPackage;
  insights: AiInsight[];
}

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

interface EmployeeRow {
  id: string;
  department_id: string | null;
  date_of_joining: string | null;
  employment_status: string;
  profiles: { full_name: string } | null;
  departments: { name: string } | null;
}

interface RiskRow {
  employee_id: string;
  period: string;
  score: number | null;
  factors: Record<string, unknown> | null;
}

function employeeDeptName(e: EmployeeRow): string {
  return e.departments?.name ?? "Unassigned";
}

async function fetchBaseData() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("Supabase is not configured.");

  const [employeesRes, risksRes, reviewsRes, goalsRes, attendanceRes, feedbackRes, skillsRes, jobsRes, candidatesRes, plansRes, tasksRes] =
    await Promise.all([
      supabase.from("employees").select("id, department_id, date_of_joining, employment_status, profiles(full_name), departments(name)"),
      supabase.from("risk_scores").select("employee_id, period, score, factors"),
      supabase.from("performance_reviews").select("employee_id, rating, period_end"),
      supabase.from("goals").select("employee_id, status, progress, due_date, created_at"),
      supabase.from("attendance").select("employee_id, date, status"),
      supabase.from("feedback").select("to_employee_id, category, status, created_at"),
      supabase.from("employee_skills").select("employee_id, skills(name)"),
      supabase.from("jobs").select("id, status"),
      supabase.from("candidates").select("id, status, applied_at, job_id"),
      supabase.from("onboarding_plans").select("id, employee_id, status, start_date"),
      supabase.from("onboarding_tasks").select("plan_id, status, due_date"),
    ]);

  for (const [label, res] of [
    ["employees", employeesRes],
    ["risk_scores", risksRes],
    ["performance_reviews", reviewsRes],
    ["goals", goalsRes],
    ["attendance", attendanceRes],
    ["feedback", feedbackRes],
    ["employee_skills", skillsRes],
    ["jobs", jobsRes],
    ["candidates", candidatesRes],
    ["onboarding_plans", plansRes],
    ["onboarding_tasks", tasksRes],
  ] as const) {
    if (res.error) throw new Error(`Failed to load ${label}: ${res.error.message}`);
  }

  return {
    employees: (employeesRes.data ?? []) as unknown as EmployeeRow[],
    risks: (risksRes.data ?? []) as RiskRow[],
    reviews: (reviewsRes.data ?? []) as { employee_id: string; rating: number | null; period_end: string | null }[],
    goals: (goalsRes.data ?? []) as { employee_id: string; status: string; progress: number | null; due_date: string | null }[],
    attendance: (attendanceRes.data ?? []) as { employee_id: string; date: string; status: string }[],
    feedback: (feedbackRes.data ?? []) as { to_employee_id: string; category: string | null; status: string | null; created_at: string | null }[],
    skills: (skillsRes.data ?? []) as unknown as { employee_id: string; skills: { name: string } | null }[],
    jobs: (jobsRes.data ?? []) as { id: string; status: string }[],
    candidates: (candidatesRes.data ?? []) as { id: string; status: string; applied_at: string | null; job_id: string | null }[],
    plans: (plansRes.data ?? []) as { id: string; employee_id: string; status: string; start_date: string | null }[],
    tasks: (tasksRes.data ?? []) as { plan_id: string; status: string; due_date: string | null }[],
  };
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number | null {
  const mean = avg(values);
  if (mean == null || values.length < 2) return null;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function monthLabelAt(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

/** Builds per-month trend series ending `count` months ago. */
function lastMonthlyTrend<T extends { value: number }>(
  f: (start: Date, end: Date) => T,
  count = 6
): (T & { month: string })[] {
  const out: (T & { month: string })[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const point = f(start, end) as T & { month: string };
    point.month = monthLabelAt(start);
    out.push(point);
  }
  return out;
}

export async function buildWorkforceBriefing(): Promise<WorkforceBriefing> {
  const base = await fetchBaseData();
  const pkg = buildDataPackage(base);
  const insights = deriveInsights(pkg);
  return { package: pkg, insights };
}

function buildDataPackage(base: Awaited<ReturnType<typeof fetchBaseData>>): WorkforceDataPackage {
  const { employees, risks, reviews, goals, attendance, feedback, skills, jobs, candidates, plans, tasks } = base;
  const nowYear = new Date().getFullYear();
  const todayISO = new Date().toISOString().slice(0, 10);

  const activeEmployees = employees.filter((e) => !["terminated", "resigned"].includes(e.employment_status));
  const empById = new Map(employees.map((e) => [e.id, e]));
  const deptOf = (id: string) => employeeDeptName(empById.get(id)!);

  const latestRisk = new Map<string, { score: number; period: string; factors: Record<string, unknown> | null }>();
  for (const r of risks) {
    if (r.score == null) continue;
    const cur = latestRisk.get(r.employee_id);
    if (!cur || r.period > cur.period) latestRisk.set(r.employee_id, { score: r.score, period: r.period, factors: r.factors });
  }

  const deptNames = Array.from(new Set(activeEmployees.map(employeeDeptName)));
  const deptStats: DepartmentStats[] = deptNames.map((dept) => {
    const people = activeEmployees.filter((e) => employeeDeptName(e) === dept);
    const ids = new Set(people.map((p) => p.id));
    const deptRisks = Array.from(latestRisk.entries()).filter(([id]) => ids.has(id));
    const ratings = reviews
      .filter((r) => ids.has(r.employee_id) && r.rating != null)
      .map((r) => r.rating!);
    const recentRatings = reviews
      .filter((r) => ids.has(r.employee_id) && r.rating != null && r.period_end != null && r.period_end >= `${nowYear - 1}-01-01`)
      .map((r) => r.rating!);
    const deptGoals = goals.filter((g) => ids.has(g.employee_id));
    const deptAttendance = attendance.filter((a) => ids.has(a.employee_id));
    const deptSkills = skills.filter((s) => ids.has(s.employee_id));

    // Goal completion (active + due)
    const goalPool = deptGoals.filter((g) => g.status === "completed" || g.status === "active" || (g.due_date != null && g.due_date <= todayISO));
    const goalDone = goalPool.filter((g) => g.status === "completed" || (g.progress ?? 0) >= 100).length;
    const goalPct = goalPool.length === 0 ? null : Math.round((goalDone / goalPool.length) * 100);

    // Attendance rate + variability (weekly rates over last 12 weeks)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 84);
    const weekly: Record<string, { total: number; present: number }> = {};
    for (const a of deptAttendance) {
      if (a.date < cutoff.toISOString().slice(0, 10)) continue;
      const week = a.date.slice(0, 10);
      weekly[week] ??= { total: 0, present: 0 };
      weekly[week].total += 1;
      if (["present", "late", "half_day", "wfh"].includes(a.status)) weekly[week].present += 1;
    }
    const weeklyRates = Object.values(weekly)
      .filter((w) => w.total > 0)
      .map((w) => (w.present / w.total) * 100);
    const attendanceRate = avg(weeklyRates);

    const negativeFeedback = feedback.filter(
      (f) =>
        ids.has(f.to_employee_id) &&
        (f.category === "constructive" || f.category === "engagement" || f.category === "manager") &&
        f.created_at != null &&
        f.created_at >= `${nowYear}-01-01`
    ).length;

    const recentRiskScores = deptRisks.map(([, r]) => r.score);
    const deptRiskRows = risks.filter((r) => ids.has(r.employee_id) && r.score != null);
    const riskPeriods = Array.from(new Set(deptRiskRows.map((r) => r.period))).sort().reverse();
    const latestRiskPeriod = riskPeriods[0];
    const earlierRiskPeriod = riskPeriods[3] ?? riskPeriods[riskPeriods.length - 1] ?? null;
    const latestAvgRisk = latestRiskPeriod ? avg(deptRiskRows.filter((r) => r.period === latestRiskPeriod).map((r) => r.score!)) : null;
    const earlierAvgRisk = earlierRiskPeriod ? avg(deptRiskRows.filter((r) => r.period === earlierRiskPeriod).map((r) => r.score!)) : null;
    const riskTrendDelta = latestAvgRisk != null && earlierAvgRisk != null ? Math.round((latestAvgRisk - earlierAvgRisk) * 10) / 10 : null;

    // Skill coverage for this department
    const critical = ["TypeScript", "Cloud Architecture", "AI / ML Engineering", "Data Analysis", "People Management", "Security Compliance"];
    const skillNamesByEmp = new Map<string, Set<string>>();
    for (const s of deptSkills) {
      if (!s.skills?.name) continue;
      const set = skillNamesByEmp.get(s.employee_id) ?? new Set<string>();
      set.add(s.skills.name);
      skillNamesByEmp.set(s.employee_id, set);
    }
    const deptCoverage =
      critical.length === 0
        ? null
        : Math.round(
            (critical.reduce((acc, skill) => {
              const holders = Array.from(skillNamesByEmp.values()).filter((set) => set.has(skill)).length;
              return acc + (people.length ? holders / people.length : 0);
            }, 0) / critical.length) * 100 * 10
          ) / 10;

    return {
      department: dept,
      headcount: people.length,
      avgPerformance: avg(recentRatings.length ? recentRatings : ratings),
      goalCompletionPct: goalPct,
      attendanceRatePct: attendanceRate == null ? null : Math.round(attendanceRate * 10) / 10,
      attendanceVariabilityPct: stddev(weeklyRates) == null ? null : Math.round(stddev(weeklyRates)! * 10) / 10,
      negativeFeedbackCount: negativeFeedback,
      highRiskCount: deptRisks.filter(([, r]) => r.score >= 65).length,
      avgRiskScore: avg(recentRiskScores),
      riskTrendDelta,
      skillCoveragePct: deptCoverage,
      openRolesCount: jobs.filter((j) => j.status === "published").length,
    };
  });

  // Org-level trends
  const trendSeries = (() => {
    const performance = lastMonthlyTrend((start, end) => {
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      const bucket = reviews.filter((r) => r.rating != null && r.period_end != null && r.period_end >= s && r.period_end < e).map((r) => r.rating!);
      return { value: Math.round((avg(bucket) ?? 0) * 100) / 100 };
    });
    const attendanceSeries = lastMonthlyTrend((start, end) => {
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      const bucket = attendance.filter((a) => a.date >= s && a.date < e);
      const present = bucket.filter((a) => ["present", "late", "half_day", "wfh"].includes(a.status)).length;
      return { value: bucket.length ? Math.round((present / bucket.length) * 1000) / 10 : 0 };
    });
    const goalsSeries = lastMonthlyTrend((start, end) => {
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      const bucket = goals.filter((g) => g.due_date != null && g.due_date >= s && g.due_date < e);
      const done = bucket.filter((g) => g.status === "completed" || (g.progress ?? 0) >= 100).length;
      return { value: bucket.length ? Math.round((done / bucket.length) * 100) : 0 };
    });
    // Headcount cumulative by join date
    const headcount = lastMonthlyTrend((start, end) => {
      const e = end.toISOString().slice(0, 10);
      return { value: activeEmployees.filter((emp) => emp.date_of_joining != null && emp.date_of_joining < e).length };
    }, 12);
    return { performance, attendance: attendanceSeries, goals: goalsSeries, headcount };
  })();

  // Risk signals
  const riskScores = Array.from(latestRisk.values()).map((r) => r.score);
  const highRiskCount = riskScores.filter((s) => s >= 65).length;
  const criticalRiskCount = riskScores.filter((s) => s >= 80).length;
  const highOrCriticalPct =
    activeEmployees.length === 0 ? null : Math.round((highRiskCount / activeEmployees.length) * 1000) / 10;
  const driverCounts = new Map<string, number>();
  for (const [, r] of latestRisk) {
    if (!r.factors || typeof r.factors !== "object") continue;
    for (const [key, weight] of Object.entries(r.factors)) {
      if (typeof weight === "number" && weight > 0.3) {
        driverCounts.set(key, (driverCounts.get(key) ?? 0) + 1);
      }
    }
  }
  const topDrivers = Array.from(driverCounts.entries())
    .map(([driver, employees]) => ({ driver: driver.replace(/_/g, " "), employees }))
    .sort((a, b) => b.employees - a.employees)
    .slice(0, 5);

  // Skills
  const skillNamesByEmp = new Map<string, Set<string>>();
  for (const s of skills) {
    if (!s.skills?.name) continue;
    const set = skillNamesByEmp.get(s.employee_id) ?? new Set<string>();
    set.add(s.skills.name);
    skillNamesByEmp.set(s.employee_id, set);
  }
  const criticalSkills = ["TypeScript", "Cloud Architecture", "AI / ML Engineering", "Security Compliance", "Data Analysis", "People Management"];
  const gaps: SkillGap[] = criticalSkills
    .map((skill) => {
      const holders = Array.from(skillNamesByEmp.values()).filter((set) => set.has(skill)).length;
      const coverage = activeEmployees.length ? (holders / activeEmployees.length) * 100 : 0;
      const gap = Math.round(100 - coverage);
      return {
        skill,
        gap,
        priority: gap >= 30 ? ("high" as const) : gap >= 15 ? ("medium" as const) : ("low" as const),
        suggestedAction:
          gap >= 30 ? "Launch structured enablement track" : gap >= 15 ? "Targeted upskilling program" : "Maintain current coverage",
      };
    })
    .sort((a, b) => b.gap - a.gap);
  const overallCoveragePct =
    gaps.length === 0
      ? null
      : Math.round((gaps.reduce((a, b) => a + 100 - b.gap, 0) / gaps.length) * 10) / 10;

  // Onboarding delays
  const taskByPlan = new Map<string, { total: number; done: number; overdue: number }>();
  const now = new Date();
  for (const t of tasks) {
    const bucket = taskByPlan.get(t.plan_id) ?? { total: 0, done: 0, overdue: 0 };
    bucket.total += 1;
    if (t.status === "completed") bucket.done += 1;
    if (t.status !== "completed" && t.due_date != null && t.due_date < todayISO) bucket.overdue += 1;
    taskByPlan.set(t.plan_id, bucket);
  }
  const activePlans = plans.filter((p) => p.status !== "completed");
  const delayedTasks = Array.from(taskByPlan.values()).reduce((a, b) => a + b.overdue, 0);
  const totalOverdueTaskCount = delayedTasks;
  const taskTotals = Array.from(taskByPlan.values());
  const avgProgress =
    taskTotals.length === 0
      ? null
      : Math.round(
          (taskTotals.reduce((a, b) => a + (b.total ? (b.done / b.total) * 100 : 0), 0) / taskTotals.length) * 10
        ) / 10;
  void now;

  // Recruitment
  const openRoles = jobs.filter((j) => j.status === "published").length;
  const totalCandidates = candidates.length;
  const activeCandidates = candidates.filter((c) => ["applied", "screening", "interview", "evaluation", "shortlisted"].includes(c.status)).length;
  const hiredLast90 = activeEmployees.filter((e) => e.date_of_joining != null && e.date_of_joining >= new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)).length;
  const stageLabels: Array<[string, string]> = [
    ["applied", "Applied"],
    ["screening", "Screening"],
    ["interview", "Interviewed"],
    ["evaluation", "Evaluation"],
    ["shortlisted", "Shortlisted"],
    ["hired", "Hired"],
  ];
  const byStage: RecruitmentStage[] = stageLabels.map(([dbStatus, label]) => ({
    stage: label,
    count: candidates.filter((c) => c.status === dbStatus).length,
  }));
  const appliedTimes = candidates
    .filter((c) => c.applied_at != null)
    .map((c) => (Date.now() - new Date(c.applied_at!).getTime()) / 864e5);
  const avgDaysSinceApplied = avg(appliedTimes) == null ? null : Math.round(avg(appliedTimes)!);

  // Goals by employee (for disengagement pattern detection)
  const goalsByEmployee: EmployeeGoalSummary[] = Array.from(
    new Map(activeEmployees.map((e) => [e.id, e])).keys()
  )
    .map((id) => {
      const empGoals = goals.filter((g) => g.employee_id === id);
      const pool = empGoals.filter((g) => g.status === "active" || g.status === "completed");
      const done = pool.filter((g) => g.status === "completed" || (g.progress ?? 0) >= 100).length;
      return {
        employee: empById.get(id)?.profiles?.full_name ?? "Unknown",
        department: deptOf(id),
        completionPct: pool.length === 0 ? 0 : Math.round((done / pool.length) * 100),
        activeCount: empGoals.filter((g) => g.status === "active").length,
      };
    })
    .filter((g) => g.activeCount > 0)
    .sort((a, b) => a.completionPct - b.completionPct);

  return {
    generatedAt: new Date().toISOString(),
    departments: deptStats,
    trends: trendSeries,
    risk: {
      highRiskCount,
      criticalRiskCount,
      highOrCriticalPct,
      topDrivers,
    },
    skills: { gaps, overallCoveragePct },
    onboarding: {
      activePlans: activePlans.length,
      delayedTasks: totalOverdueTaskCount,
      overdueTaskPct: taskTotals.length === 0 ? null : Math.round((totalOverdueTaskCount / taskTotals.reduce((a, b) => a + b.total, 0)) * 100),
      avgProgressPct: avgProgress,
    },
    recruitment: {
      openRoles,
      totalCandidates,
      activeCandidates,
      hiredLast90Days: hiredLast90,
      byStage,
      avgDaysSinceApplied,
    },
    goalsByEmployee,
  };
}

// ---------------------------------------------------------------------------
// Insight derivation (deterministic rules over the summarized package)
// ---------------------------------------------------------------------------

function pct(p: number | null | undefined): string {
  return p == null ? "—" : `${Math.round(p)}%`;
}

function insight(
  partial: Omit<AiInsight, "severity" | "confidence"> & {
    severity?: InsightSeverity;
    confidence?: number;
  }
): AiInsight {
  return {
    severity: "medium",
    confidence: 0.7,
    ...partial,
  };
}

export function deriveInsights(pkg: WorkforceDataPackage): AiInsight[] {
  const insights: AiInsight[] = [];

  const eng = pkg.departments.find((d) => d.department === "Engineering");
  const engGoalTrend = pkg.trends.goals;
  const goalDelta = engGoalTrend.length >= 2 ? engGoalTrend[engGoalTrend.length - 1].value - engGoalTrend[0].value : 0;
  const attDelta = pkg.trends.attendance.length >= 2 ? pkg.trends.attendance[pkg.trends.attendance.length - 1].value - pkg.trends.attendance[0].value : 0;
  const perfDelta = pkg.trends.performance.length >= 2 ? pkg.trends.performance[pkg.trends.performance.length - 1].value - pkg.trends.performance[0].value : 0;

  // 1. Attrition / engagement (multi-source)
  if (eng && (eng.highRiskCount > 0 || eng.negativeFeedbackCount > 0)) {
    const evidence: string[] = [];
    if (goalDelta < 0) evidence.push(`Goal completion ↓ ${Math.abs(goalDelta)} points across the tracked window`);
    if (attDelta < 0) evidence.push(`Attendance rate ↓ ${Math.abs(attDelta)} points`);
    if (eng.attendanceVariabilityPct != null && eng.attendanceVariabilityPct > 8)
      evidence.push(`Attendance volatility ↑ (variability ${eng.attendanceVariabilityPct.toFixed(1)}%)`);
    if (eng.negativeFeedbackCount > 0) evidence.push(`Negative feedback ↑ (${eng.negativeFeedbackCount} records this year)`);
    if (eng.highRiskCount > 0) evidence.push(`${eng.highRiskCount} employees at high risk in Engineering`);
    if (evidence.length >= 2) {
      insights.push(
        insight({
          id: "attrition-eng",
          title: "Engineering attrition risk increased",
          summary: `Multiple signals point to rising disengagement in Engineering: ${evidence[0].toLowerCase()}, and ${(evidence.length > 1 ? evidence[1] : "rising risk scores").toLowerCase()}.`,
          evidence,
          reasoning:
            "Multiple workforce signals (goal completion, attendance, feedback, and risk scores) indicate possible disengagement concentrated in Engineering.",
          recommendedAction: "Review affected employees and schedule manager check-ins.",
          confidence: Math.min(0.9, 0.65 + evidence.length * 0.07),
          category: "attrition",
          severity: eng.highRiskCount >= 5 ? "high" : "medium",
        })
      );
    }
  }

  // 2. Performance decline
  if (perfDelta < 0) {
    insights.push(
      insight({
        id: "perf-decline",
        title: "Average performance trending down",
        summary: `Average review rating declined ${Math.abs(perfDelta).toFixed(2)} points over the last ${pkg.trends.performance.length} months.`,
        evidence: [`Average rating ↓ ${Math.abs(perfDelta).toFixed(2)} points`],
        reasoning: "A sustained drop in review ratings across consecutive cycles often precedes turnover and productivity loss.",
        recommendedAction: "Review recent performance-cycle outcomes and target low-rated segments.",
        confidence: 0.72,
        category: "performance",
        severity: Math.abs(perfDelta) >= 0.3 ? "high" : "medium",
      })
    );
  }

  // 3. Goal completion
  if (goalDelta < -10) {
    const worst = pkg.goalsByEmployee.slice(0, 3);
    insights.push(
      insight({
        id: "goal-completion-drop",
        title: "Goal completion slipped this cycle",
        summary: `${pct(engGoalTrend[engGoalTrend.length - 1]?.value)} of on-time goals completed, down from ${pct(engGoalTrend[0]?.value)} at the start of the tracked window.`,
        evidence: [
          `Goal completion ${goalDelta < 0 ? "↓" : "▲"} ${Math.abs(goalDelta)} months-over-months`,
          ...worst.slice(0, 2).map((g) => `${g.employee} (${g.department}) at ${g.completionPct}% completion`),
        ],
        reasoning: "Slower goal throughput can indicate workload pressure, unclear priorities, or disengagement in the affected teams.",
        recommendedAction: "Rebook 1:1s for employees with the lowest completion rates and rebalance workloads.",
        confidence: 0.78,
        category: "engagement",
        severity: goalDelta <= -20 ? "high" : "medium",
      })
    );
  }

  // 4. Skill gaps
  const bigGap = pkg.skills.gaps.find((g) => g.gap >= 30);
  if (bigGap) {
    insights.push(
      insight({
        id: "skill-gap-critical",
        title: `Skill gap: ${bigGap.skill}`,
        summary: `Coverage of ${bigGap.skill} sits at ${100 - bigGap.gap}%, a ${pct(bigGap.gap)} gap across the workforce.`,
        evidence: pkg.skills.gaps.filter((g) => g.gap >= 15).slice(0, 3).map((g) => `${g.skill}: ${g.gap}% gap`),
        reasoning: "Thin coverage of critical skills increases delivery risk and external hiring dependency.",
        recommendedAction: bigGap.suggestedAction,
        confidence: 0.8,
        category: "skills",
        severity: bigGap.gap >= 40 ? "high" : "medium",
      })
    );
  }

  // 5. Onboarding delays
  if (pkg.onboarding.delayedTasks > 0) {
    const pctOver = pkg.onboarding.overdueTaskPct;
    insights.push(
      insight({
        id: "onboarding-delays",
        title: "Onboarding tasks falling behind",
        summary: `${pkg.onboarding.delayedTasks} onboarding tasks are past due across ${pkg.onboarding.activePlans} active plans.`,
        evidence: [`${pkg.onboarding.delayedTasks} overdue ${pctOver != null ? `(${pctOver}% of all tasks)` : ""}`],
        reasoning: "Delayed onboarding can lengthen time-to-productivity and increase early-tenure attrition risk.",
        recommendedAction: "Prioritize overdue tasks for recent hires and re-staff where capacity is low.",
        confidence: 0.75,
        category: "onboarding",
        severity: pctOver != null && pctOver > 25 ? "high" : "medium",
      })
    );
  }

  // 6. Recruitment pipeline health
  if (pkg.recruitment.openRoles > 0 && pkg.recruitment.activeCandidates < pkg.recruitment.openRoles * 4) {
    insights.push(
      insight({
        id: "pipeline-thin",
        title: "Candidate pipeline is thin",
        summary: `${pkg.recruitment.activeCandidates} active candidates across ${pkg.recruitment.openRoles} open roles.`,
        evidence: [`${pkg.recruitment.activeCandidates} active candidates`, `${pkg.recruitment.openRoles} open positions`],
        reasoning: "A lean pipeline under 4 candidates per role increases time-to-fill and risk of hiring under pressure.",
        recommendedAction: "Broaden sourcing for the highest-demand open roles.",
        confidence: 0.68,
        category: "recruitment",
        severity: "low",
      })
    );
  }

  return insights.sort(
    (a, b) => severityRank(b.severity ?? "info") - severityRank(a.severity ?? "info")
  );
}

function severityRank(s: InsightSeverity | RiskLevel | undefined): number {
  const order: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
  return order[s ?? "medium"] ?? 2;
}

// ---------------------------------------------------------------------------
// Gemini handoff (backend service — model call comes next)
// ---------------------------------------------------------------------------

/**
 * Renders the structured workforce package into a prompt-shaped brief that the
 * Gemini service will send. Intentionally summarized, not raw rows.
 */
export function prepareBriefingPrompt(pkg: WorkforceDataPackage): string {
  return `You are the WorkforceIQ HR analytics assistant.\n
Here is a structured summary of workforce signals. Compose a concise, executive-friendly briefing in plain language.\n
Generated at: ${pkg.generatedAt}\n

DEPARTMENTS
${pkg.departments
  .map((d) => `- ${d.department}: headcount ${d.headcount}, avg perf ${d.avgPerformance ?? "n/a"}, goal completion ${pct(d.goalCompletionPct)}, attendance ${pct(d.attendanceRatePct)} (variability ${d.attendanceVariabilityPct ?? "n/a"}%), negative feedback ${d.negativeFeedbackCount}, high risk ${d.highRiskCount}, avg risk ${d.avgRiskScore ?? "n/a"}`)
  .join("\n")}

TRENDS (${pkg.trends.performance.length} months)
- Performance: ${pkg.trends.performance.map((p) => `${p.month}=${p.value}`).join(", ")}
- Attendance: ${pkg.trends.attendance.map((p) => `${p.month}=${p.value}%`).join(", ")}
- Goal completion: ${pkg.trends.goals.map((p) => `${p.month}=${p.value}%`).join(", ")}
- Headcount: ${pkg.trends.headcount.map((p) => `${p.month}=${p.value}`).join(", ")}

RISK
- High risk: ${pkg.risk.highRiskCount} (${pct(pkg.risk.highOrCriticalPct)} of workforce)
- Top drivers: ${pkg.risk.topDrivers.map((d) => `${d.driver} (${d.employees})`).join(", ") || "none"}

SKILLS
- Overall coverage: ${pct(pkg.skills.overallCoveragePct)}
- Gaps: ${pkg.skills.gaps.slice(0, 5).map((g) => `${g.skill} ${g.gap}% (${g.priority})`).join(", ")}

ONBOARDING
- Active plans: ${pkg.onboarding.activePlans}; delayed tasks: ${pkg.onboarding.delayedTasks}; avg progress: ${pct(pkg.onboarding.avgProgressPct)}

RECRUITMENT
- Open roles: ${pkg.recruitment.openRoles}; active candidates: ${pkg.recruitment.activeCandidates}; hired last 90d: ${pkg.recruitment.hiredLast90Days}; avg days since application: ${pkg.recruitment.avgDaysSinceApplied ?? "n/a"}
`;
}