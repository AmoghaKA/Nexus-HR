import { getSupabaseServer } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Workforce Skill Graph
//
// Deterministic mapping of employees → skills → roles → business requirements.
// Every number on /hr/skills comes from this pure aggregation so the page is
// instant and repeatable; the AI layer (analyzeWorkforceSkills) adds narrative
// on top of the same data.
// ---------------------------------------------------------------------------

export interface SkillCandidate {
  id: string;
  name: string;
  role: string;
  department: string;
  years: number;
}

export interface SkillGraphRow {
  skill: string;
  category: string;
  available: number;
  required: number;
  gap: number;
  coverage_pct: number;
  holders: SkillCandidate[];
  candidates: SkillCandidate[];
}

export interface SkillGraphData {
  totalSkills: number;
  activeCount: number;
  coveredHeadcount: number;
  requiredHeadcount: number;
  coverage_pct: number;
  topGap: number;
  rows: SkillGraphRow[];
  topGaps: SkillGraphRow[];
}

export interface RawSkillData {
  skills: { id: string; name: string; category: string | null }[];
  employeeSkills: { skill_id: string; employee_id: string }[];
  employees: {
    id: string;
    employment_status: string;
    experience_years: number | null;
    name: string;
    role: string | null;
    department: string | null;
  }[];
}

const ACTIVE_EXCLUDED = ["terminated", "resigned"];

// ---------------------------------------------------------------------------
// Skill → business area mapping (tuned to the seeded catalog, ~120 skills)
// ---------------------------------------------------------------------------

const GROUP_KEYWORDS: Record<string, string[]> = {
  software: [
    "typescript", "react", "node", "python", "golang", "postgresql", "supabase", "next.js",
    "cloud", "aws", "kubernetes", "docker", "terraform", "ci/cd", "observability",
    "elasticsearch", "redis", "graphql", "rest", "serverless", "microservices",
    "load testing", "performance tuning", "mobile", "ios", "android", "qa automation",
    "test planning", "linux", "networking", "troubleshooting", "css", "engineering", "architecture",
  ],
  "data-ai": [
    "ai / ml", "machine learning", "prompt", "data engineering", "data visualization",
    "data analysis", "sql", "etl pipelines", "statistical", "a/b testing",
    "business intelligence", "tableau", "analytics", "data", "ml", "llm",
  ],
  security: ["security", "threat modeling", "penetration", "incident response", "cryptography", "data privacy", "gdpr"],
  people: [
    "people management", "recruiting", "onboarding", "employee relations", "compensation",
    "mentoring", "interviewing", "workforce planning", "payroll", "benefits", "policy drafting",
    "hr", "leadership",
  ],
  "product-design": ["product strategy", "ux research", "ux", "ui", "figma", "design systems", "user testing", "product"],
  sales: ["sales negotiation", "account management", "lead generation", "crm", "deal", "sales"],
  finance: ["financial modeling", "budget analysis", "forecasting", "accounts payable", "variance analysis", "budgeting", "finance"],
  marketing: ["content strategy", "seo", "paid media", "email marketing", "brand management"],
  business: [
    "project management", "agile delivery", "scrum", "kanban", "okr setting", "stakeholder management",
    "risk management", "compliance reporting", "operations", "workshop",
  ],
  support: ["customer success", "support queuing", "kcs", "sla management", "escalation handling", "renewal", "customer"],
  communications: ["communication", "technical writing", "public speaking", "facilitation", "writing"],
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  engineering: ["software"],
  software: ["software"],
  product: ["product-design"],
  design: ["product-design"],
  sales: ["sales"],
  finance: ["finance"],
  hr: ["people"],
  leadership: ["people"],
  analytics: ["data-ai"],
  data: ["data-ai"],
  security: ["security"],
  operations: ["business"],
  support: ["support"],
  "customer-success": ["support"],
  marketing: ["marketing"],
};

const ROLE_GROUP_KEYWORDS: Record<string, string[]> = {
  software: ["engineer", "developer", "programmer", "engineering", "devops", "qa", "support eng"],
  "data-ai": ["data analyst", "data", "analytics", "intelligence"],
  security: ["security"],
  people: ["hr", "people"],
  "product-design": ["product", "designer", "ux", "ui"],
  sales: ["sales", "account executive", "sdr", "revenue"],
  finance: ["financial", "finance", "account"],
  marketing: ["marketing", "brand"],
  business: ["operations", "coordinator", "facilities", "logistics"],
  support: ["support", "success"],
  communications: ["communication", "press"],
};

function tokenGroups(tokens: Record<string, string[]>, haystack: string): string[] {
  const text = haystack.toLowerCase();
  const found: string[] = [];
  for (const [group, keywords] of Object.entries(tokens)) {
    if (keywords.some((k) => text.includes(k))) found.push(group);
  }
  return found;
}

function groupsForSkill(name: string, category: string | null): string[] {
  const fromCategory = category ? CATEGORY_ALIASES[category.toLowerCase()] ?? [] : [];
  const fromName = tokenGroups(GROUP_KEYWORDS, name);
  return [...new Set([...fromCategory, ...fromName])];
}

function roleArea(role: string, department: string): string[] {
  return tokenGroups(ROLE_GROUP_KEYWORDS, `${role} ${department}`);
}

function needsSkill(role: string, department: string, skillGroups: string[]): boolean {
  if (skillGroups.length === 0) return true; // unidentified skill → benchmark everyone
  const areas = roleArea(role, department);
  return skillGroups.some((g) => areas.includes(g));
}

// ---------------------------------------------------------------------------
// Pure aggregation
// ---------------------------------------------------------------------------

export function computeSkillGraphData(raw: RawSkillData): SkillGraphData {
  const active = raw.employees.filter((e) => !ACTIVE_EXCLUDED.includes(e.employment_status));
  const activeCount = active.length;

  const holdersById = new Map<string, SkillCandidate[]>();
  for (const row of raw.employeeSkills) {
    const emp = raw.employees.find((e) => e.id === row.employee_id);
    if (!emp || ACTIVE_EXCLUDED.includes(emp.employment_status)) continue;
    const list = holdersById.get(row.skill_id) ?? [];
    list.push({
      id: emp.id,
      name: emp.name,
      role: emp.role ?? "",
      department: emp.department ?? "",
      years: emp.experience_years ?? 0,
    });
    holdersById.set(row.skill_id, list);
  }

  const rows: SkillGraphRow[] = raw.skills.map((s) => {
    const skillGroups = groupsForSkill(s.name, s.category);
    const holders = (holdersById.get(s.id) ?? []).sort((a, b) => b.years - a.years);

    const canUse = (e: (typeof active)[number]) => needsSkill(e.role ?? "", e.department ?? "", skillGroups);
    const needCount = active.filter(canUse).length;
    const required = Math.max(1, needCount > 0 ? needCount : Math.round(activeCount * 0.2));

    const available = holders.length;
    const gap = Math.max(0, required - available);
    const coverage_pct = Math.round((available / required) * 1000) / 10;

    const candidates = active
      .filter((e) => !holders.some((h) => h.id === e.id))
      .filter(canUse)
      .sort((a, b) => (b.experience_years ?? 0) - (a.experience_years ?? 0))
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role ?? "",
        department: e.department ?? "",
        years: e.experience_years ?? 0,
      }));

    return { skill: s.name, category: s.category ?? categoryFallback(s.name), available, required, gap, coverage_pct, holders, candidates };
  });

  const requiredHeadcount = rows.reduce((acc, r) => acc + r.required, 0);
  const coveredHeadcount = rows.reduce((acc, r) => acc + r.available, 0);
  const coverage_pct = requiredHeadcount > 0 ? Math.round((coveredHeadcount / requiredHeadcount) * 1000) / 10 : 0;
  const sorted = [...rows].sort((a, b) => b.gap - a.gap || b.required - a.required);

  return {
    totalSkills: rows.length,
    activeCount,
    coveredHeadcount,
    requiredHeadcount,
    coverage_pct,
    topGap: sorted[0]?.gap ?? 0,
    rows: [...rows].sort((a, b) => a.skill.localeCompare(b.skill)),
    topGaps: sorted.slice(0, 8),
  };
}

function categoryFallback(name: string): string {
  const all = tokenGroups(GROUP_KEYWORDS, name);
  return all[0] ?? "general";
}

// ---------------------------------------------------------------------------
// Server fetcher for /hr/skills (page).
// ---------------------------------------------------------------------------

export async function fetchSkillGraphData(): Promise<SkillGraphData | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const [skillsRes, estRes, empRes] = await Promise.all([
    supabase.from("skills").select("id, name, category").order("name"),
    supabase.from("employee_skills").select("skill_id, employee_id"),
    supabase
      .from("employees")
      .select("id, employment_status, experience_years, profiles(full_name), roles(title), departments(name)"),
  ]);
  if (skillsRes.error || estRes.error || empRes.error) return null;

  const employees = ((empRes.data ?? []) as unknown as {
    id: string;
    employment_status: string;
    experience_years: number | null;
    profiles: { full_name: string } | null;
    roles: { title: string } | null;
    departments: { name: string } | null;
  }[]).map((e) => ({
    id: e.id,
    employment_status: e.employment_status,
    experience_years: e.experience_years,
    name: e.profiles?.full_name ?? "Unknown",
    role: e.roles?.title ?? null,
    department: e.departments?.name ?? null,
  }));

  return computeSkillGraphData({
    skills: (skillsRes.data ?? []) as { id: string; name: string; category: string | null }[],
    employeeSkills: (estRes.data ?? []) as { skill_id: string; employee_id: string }[],
    employees,
  });
}