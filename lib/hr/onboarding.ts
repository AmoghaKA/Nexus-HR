import { getSupabaseServer } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// HR Onboarding overview (server-side, /hr/onboarding page.
// Uses the service role so RLS never filters the HR console; the page itself
// is only reachable by HR via the role-gated proxy.
// ---------------------------------------------------------------------------

export interface OnboardingOverviewTask {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
}

export interface OnboardingOverviewPlan {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  tasks: OnboardingOverviewTask[];
}

export interface OnboardingOverview {
  employeeId: string;
  employeeCode: string;
  name: string;
  role: string;
  department: string;
  manager: string | null;
  experience: number | null;
  skills: string[];
  joined: string | null;
  plans: OnboardingOverviewPlan[];
  counts: { total: number; completed: number; pending: number; overdue: number; blocked: number };
  progressPct: number;
  overallStatus: "not_started" | "on_track" | "at_risk" | "completed";
}

const EXCLUDED_STATUSES = ["terminated", "resigned"];

function classifyTask(status: string, dueDate: string | null, now: string): "completed" | "pending" | "overdue" | "blocked" {
  if (status === "completed") return "completed";
  if (status === "blocked") return "blocked";
  if (status === "skipped") return "pending";
  if (dueDate && dueDate < now && status !== "completed") return "overdue";
  return "pending";
}

export async function fetchOnboardingOverview(): Promise<OnboardingOverview[] | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const empRes = await supabase
    .from("employees")
    .select(
      "id, employee_code, experience_years, date_of_joining, employment_status, manager_id, profiles(full_name), roles(title), departments(name)"
    )
    .order("date_of_joining", { ascending: false })
    .limit(100);
  if (empRes.error) return null;

  const employees = ((empRes.data ?? []) as unknown as {
    id: string;
    employee_code: string;
    experience_years: number | null;
    date_of_joining: string | null;
    employment_status: string;
    manager_id: string | null;
    profiles: { full_name: string } | null;
    roles: { title: string } | null;
    departments: { name: string } | null;
  }[]).filter((e) => !EXCLUDED_STATUSES.includes(e.employment_status));

  if (employees.length === 0) return [];

  const ids = employees.map((e) => e.id);

  const [skillsRes, managerRes, plansRes] = await Promise.all([
    supabase
      .from("employee_skills")
      .select("skill_id, employee_id, skills(name)")
      .in("employee_id", ids),
    supabase
      .from("employees")
      .select("id, profiles(full_name)")
      .in("id", [...new Set(employees.map((e) => e.manager_id).filter(Boolean) as string[])]),
    supabase.from("onboarding_plans").select("id, employee_id, title, status, start_date").in("employee_id", ids),
  ]);
  if (skillsRes.error || managerRes.error || plansRes.error) return null;

  const skillsByEmployee = new Map<string, string[]>();
  for (const row of (skillsRes.data ?? []) as unknown as {
    employee_id: string;
    skills: { name: string } | null;
  }[]) {
    const list = skillsByEmployee.get(row.employee_id) ?? [];
    if (row.skills?.name) list.push(row.skills.name);
    skillsByEmployee.set(row.employee_id, list);
  }

  const managerNames = new Map<string, string>();
  for (const row of (managerRes.data ?? []) as unknown as { id: string; profiles: { full_name: string } | null }[]) {
    if (row.profiles?.full_name) managerNames.set(row.id, row.profiles.full_name);
  }

  const plans = (plansRes.data ?? []) as {
    id: string;
    employee_id: string;
    title: string;
    status: string;
    start_date: string | null;
  }[];
  const planIds = plans.map((p) => p.id);

  const tasksRes = planIds.length
    ? await supabase
        .from("onboarding_tasks")
        .select("id, plan_id, title, status, due_date")
        .in("plan_id", planIds)
        .order("order_index", { ascending: true })
    : { data: [] as unknown[], error: null as null };
  if (tasksRes.error) return null;

  const tasksByPlan = new Map<string, OnboardingOverviewTask[]>();
  for (const row of (tasksRes.data ?? []) as unknown as {
    id: string;
    plan_id: string;
    title: string;
    status: string;
    due_date: string | null;
  }[]) {
    const list = tasksByPlan.get(row.plan_id) ?? [];
    list.push({ id: row.id, title: row.title, status: row.status, dueDate: row.due_date });
    tasksByPlan.set(row.plan_id, list);
  }

  const plansByEmployee = new Map<string, OnboardingOverviewPlan[]>();
  for (const p of plans) {
    const list = plansByEmployee.get(p.employee_id) ?? [];
    list.push({
      id: p.id,
      title: p.title,
      status: p.status,
      startDate: p.start_date,
      tasks: tasksByPlan.get(p.id) ?? [],
    });
    plansByEmployee.set(p.employee_id, list);
  }

  const today = new Date().toISOString().slice(0, 10);

  return employees.map((e) => {
    const plans = plansByEmployee.get(e.id) ?? [];
    const counts = { total: 0, completed: 0, pending: 0, overdue: 0, blocked: 0 };
    for (const plan of plans) {
      for (const t of plan.tasks) {
        counts.total += 1;
        const bucket = classifyTask(t.status, t.dueDate, today);
        counts[bucket] += 1;
      }
    }
    const progressPct = counts.total === 0 ? 0 : Math.round((counts.completed / counts.total) * 100);
    const overallStatus =
      counts.total === 0
        ? "not_started"
        : counts.completed >= counts.total
          ? "completed"
          : counts.overdue > 0 || counts.blocked > 0
            ? "at_risk"
            : "on_track";

    return {
      employeeId: e.id,
      employeeCode: e.employee_code,
      name: e.profiles?.full_name ?? "Unknown",
      role: e.roles?.title ?? "—",
      department: e.departments?.name ?? "—",
      manager: e.manager_id ? managerNames.get(e.manager_id) ?? null : null,
      experience: e.experience_years != null ? Number(e.experience_years) : null,
      skills: skillsByEmployee.get(e.id) ?? [],
      joined: e.date_of_joining,
      plans,
      counts,
      progressPct,
      overallStatus,
    };
  });
}