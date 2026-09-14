// ---------------------------------------------------------------------------
// Nexus HR — realistic workforce seed
// ---------------------------------------------------------------------------
// Creates ~100 employees with internally-consistent HR data so every dashboard
// metric, chart, and AI pattern has real Supabase backing.
//
//   npm run seed:workforce
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
// Every row carries a deterministic id derived from its content, so re-running
// upserts the same records instead of duplicating them.
//
// Generated patterns (for later AI analysis):
//   * Engineering: rising attrition risk, declining goal completion for a
//     subset, increased attendance variability, and negative feedback
//     concentrated on a specific cohort.
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Deterministic RNG so re-runs produce identical data.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260912);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min, max) => rand() * (max - min) + min;
const chance = (p) => rand() < p;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const iso = (d) => d.toISOString().slice(0, 10);

function hashId(seed) {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const emailOf = (spec) =>
  `${spec.first}.${spec.last}${spec.emailSuffix ?? ""}@nexushr.demo`.replace(/ /g, ".").toLowerCase();

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const DEPARTMENTS = [
  ["Engineering", "ENG"],
  ["Human Resources", "HR"],
  ["Product", "PDT"],
  ["Sales", "SAL"],
  ["Marketing", "MKT"],
  ["Finance", "FIN"],
  ["Operations", "OPS"],
  ["Customer Support", "SUP"],
];

const ROLES = [
  ["Software Engineer", "ENG-SW", "ENG"],
  ["Senior Software Engineer", "ENG-SSR", "ENG"],
  ["Engineering Lead", "ENG-LD", "ENG"],
  ["Engineering Manager", "ENG-MGR", "ENG"],
  ["DevOps Engineer", "ENG-DEVOPS", "ENG"],
  ["QA Engineer", "ENG-QA", "ENG"],
  ["HR Administrator", "HR-ADM", "HR"],
  ["HR Manager", "HR-MGR", "HR"],
  ["Product Manager", "PDT-PM", "PDT"],
  ["Data Analyst", "PDT-DA", "PDT"],
  ["UX Designer", "PDT-UX", "PDT"],
  ["Product Designer", "PDT-PD", "PDT"],
  ["Account Executive", "SAL-AE", "SAL"],
  ["Sales Manager", "SAL-MGR", "SAL"],
  ["Sales Development Rep", "SAL-SDR", "SAL"],
  ["Marketing Specialist", "MKT-SPC", "MKT"],
  ["Marketing Manager", "MKT-MGR", "MKT"],
  ["Financial Analyst", "FIN-FA", "FIN"],
  ["Operations Coordinator", "OPS-COORD", "OPS"],
  ["Operations Manager", "OPS-MGR", "OPS"],
  ["Customer Success Manager", "SUP-CSM", "SUP"],
  ["Support Engineer", "SUP-SE", "SUP"],
  ["Support Team Lead", "SUP-LD", "SUP"],
];

const SKILL_NAMES = [
  "TypeScript", "React", "Node.js", "Python", "Go", "PostgreSQL", "Supabase", "Next.js",
  "Cloud Architecture", "AWS", "Kubernetes", "Docker", "Terraform", "CI/CD", "Observability",
  "AI / ML Engineering", "Prompt Engineering", "Data Engineering", "Data Visualization",
  "SQL", "ETL Pipelines", "Product Strategy", "UX Research", "Figma", "Design Systems",
  "User Testing", "Sales Negotiation", "Account Management", "Lead Generation",
  "CRM Administration", "Financial Modeling", "Budget Analysis", "Forecasting",
  "Accounts Payable", "Variance Analysis", "People Management", "Recruiting", "Onboarding",
  "Employee Relations", "Compensation Design", "Security Compliance", "Threat Modeling",
  "Penetration Testing", "Incident Response", "Communication", "Technical Writing",
  "Project Management", "Agile Delivery", "Stakeholder Management", "Data Analysis",
  "R", "Statistical Analysis", "A/B Testing", "Business Intelligence", "Tableau",
  "Elasticsearch", "Redis", "GraphQL", "REST APIs", "Serverless", "Microservices",
  "Load Testing", "Performance Tuning", "Accessibility", "Mobile Development", "iOS", "Android",
  "QA Automation", "Test Planning", "Scrum", "Kanban", "OKR Setting", "Mentoring",
  "Interviewing", "Negotiation", "Budgeting", "Risk Management", "Compliance Reporting",
  "Public Speaking", "Workshop Facilitation", "Content Strategy", "SEO", "Paid Media",
  "Email Marketing", "Brand Management", "Customer Success", "Renewal Management",
  "Support Queuing", "KCS", "SLA Management", "Escalation Handling", "Troubleshooting",
  "Linux Administration", "Networking", "Cryptography", "Data Privacy", "GDPR",
  "Workforce Planning", "Payroll Administration", "Benefits Administration", "Policy Drafting",
];

const TRAINING_COURSES = [
  ["Security Awareness 2026", "SEC-101", "security", "beginner", 2, true],
  ["Unconscious Bias at Work", "HR-201", "inclusion", "beginner", 1.5, true],
  ["Rising Leader Program", "LD-301", "leadership", "intermediate", 8, false],
  ["SQL for Product Decisions", "AN-401", "analytics", "intermediate", 6, false],
  ["Advanced Performance Reviews", "HR-402", "hr", "advanced", 4, false],
  ["Interview Training", "HR-403", "hr", "intermediate", 3, true],
  ["AI Fundamentals for Everyone", "AI-501", "ai", "beginner", 4, false],
  ["Cloud Practitioner", "CLD-501", "cloud", "beginner", 6, false],
  ["Incident Management", "OPS-501", "operations", "advanced", 5, true],
  ["Effective 1:1s", "COM-601", "communication", "beginner", 2, false],
  ["Financial Literacy for Managers", "FIN-601", "finance", "beginner", 3, false],
  ["Customer Excellence", "CSS-701", "customer", "beginner", 3, false],
];

const CITIES = ["London", "Berlin", "New York", "Austin", "Warsaw", "Lisbon", "Amsterdam", "Toronto", "Bangalore", "Bogotá"];

const FIRST_NAMES = [
  "Olivia", "Noah", "Emma", "Liam", "Ava", "Lucas", "Mia", "Mateo", "Sofia", "Ethan",
  "Isabella", "Lea", "Charlotte", "Gabriel", "Amelia", "Hugo", "Elena", "Diego", "Grace", "Omar",
  "Zoe", "Kai", "Nina", "Jonas", "Lena", "Felix", "Maya", "Elias", "Clara", "Viktor",
  "Freya", "Arjun", "Priya", "Ravi", "Ananya", "Shiv", "Meera", "Aditi", "Kiran", "Rohan",
  "Lotte", "Pieter", "Ines", "Marc", "Camille", "Julien", "Nadia", "Samir", "Rosa", "Miguel",
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
];

// Cohort flagged with declining engagement (Engineering-heavy pattern).
const AFFECTED_INDICES = (() => {
  const set = new Set();
  for (let i = 0; i < 30; i += 2) set.add(i); // every second engineer
  set.add(34); // Product
  set.add(37);
  set.add(47); // Sales
  set.add(50);
  set.add(53);
  return set;
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function runUpsert(table, rows, onConflict) {
  if (rows.length === 0) return;
  const CHUNK = 400;
  let errors = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(chunk, {
      onConflict,
      ignoreDuplicates: false,
    });
    if (error) {
      errors++;
      console.error(`  [${table}] chunk ${i} failed: ${error.message}`);
    }
  }
  if (errors === 0) console.log(`  ${table}: ${rows.length} rows`);
}

// ---------------------------------------------------------------------------
// 1. Reference data
// ---------------------------------------------------------------------------
async function ensureReferenceData() {
  console.log("[1] Reference data");
  const { error: deptErr } = await supabase
    .from("departments")
    .upsert(
      DEPARTMENTS.map(([name, code]) => ({ name, code })),
      { onConflict: "code" }
    );
  if (deptErr) throw new Error(`departments: ${deptErr.message}`);
  const { data: depts } = await supabase.from("departments").select("id, code");
  const deptId = Object.fromEntries((depts ?? []).map((d) => [d.code, d.id]));

  await runUpsert(
    "roles",
    ROLES.map(([title, code]) => ({ title, code, department_id: deptId[code.slice(0, 3)] ?? deptId["OPS"] })),
    "code"
  );
  const { data: roles } = await supabase.from("roles").select("id, code");
  const roleId = Object.fromEntries((roles ?? []).map((r) => [r.code, r.id]));
  const roleDept = Object.fromEntries(ROLES.map(([, code, dcode]) => [code, deptId[dcode]]));

  await runUpsert(
    "skills",
    SKILL_NAMES.map((name) => ({ name })),
    "name"
  );
  const { data: skills } = await supabase.from("skills").select("id, name");
  const skillId = Object.fromEntries((skills ?? []).map((s) => [s.name, s.id]));

  await runUpsert(
    "training_courses",
    TRAINING_COURSES.map(([title, code, category, difficulty, hours, mandatory]) => ({
      title,
      code,
      category,
      difficulty,
      duration_hours: hours,
      is_mandatory: mandatory,
      provider: "Nexus HR Academy",
    })),
    "code"
  );
  const { data: courseRows } = await supabase.from("training_courses").select("id, code, is_mandatory");

  console.log(`  departments ${DEPARTMENTS.length}, roles ${ROLES.length}, skills ${SKILL_NAMES.length}, courses ${TRAINING_COURSES.length}`);
  return { deptId, roleId, roleDept, skillId, courseRows: courseRows ?? [] };
}

// ---------------------------------------------------------------------------
// 2. Auth users + profiles
// ---------------------------------------------------------------------------
async function ensureProfiles(specs) {
  console.log("[2] Auth users + profiles");
  const existingByEmail = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) existingByEmail.set((u.email ?? "").toLowerCase(), u);
    if (data.users.length < 1000) break;
    page++;
  }

  // Sequential creation avoids the parallel-create race; totals keep it fast.
  let created = 0;
  for (const spec of specs) {
    const email = emailOf(spec);
    if (existingByEmail.has(email)) continue;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: "NexusHR-Seed-2026!",
      email_confirm: true,
      user_metadata: { full_name: `${spec.first} ${spec.last}`, role: "employee" },
      app_metadata: { role: "employee" },
    });
    if (data?.user?.id) {
      existingByEmail.set(email, data.user);
      created++;
    } else if (error) {
      console.error(`  auth FAILED ${email}: ${error.message}`);
    }
  }
  console.log(`  auth users created: ${created}, existing: ${specs.length - created}`);

  // If any creation failed (e.g. "already registered"), a fresh re-list catches them.
  let p = 1;
  for (;;) {
    const { data } = await supabase.auth.admin.listUsers({ page: p, perPage: 1000 });
    for (const u of data.users) existingByEmail.set((u.email ?? "").toLowerCase(), u);
    if (data.users.length < 1000) break;
    p++;
  }

  const byEmail = new Map();
  for (const spec of specs) {
    const user = existingByEmail.get(emailOf(spec));
    if (!user) {
      console.error(`  no auth user for ${emailOf(spec)}`);
      continue;
    }
    byEmail.set(emailOf(spec), user.id);
  }

  // upsert using fetched user metadata for names/emails
  const rows = [];
  for (const spec of specs) {
    const user = existingByEmail.get(emailOf(spec));
    if (!user) continue;
    rows.push({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? `${spec.first} ${spec.last}`,
      email: user.email,
      role: "employee",
    });
  }
  await runUpsert("profiles", rows, "id");
  const map = new Map();
  for (const spec of specs) {
    const user = existingByEmail.get(emailOf(spec));
    if (user) map.set(emailOf(spec), user.id);
  }
  return map;
}

// ---------------------------------------------------------------------------
// 3. Employees
// ---------------------------------------------------------------------------
function buildEmployeeSpecs() {
  const specs = [];
  const deptPlan = [
    ["ENG", 30],
    ["PDT", 12],
    ["HR", 6],
    ["SAL", 15],
    ["MKT", 10],
    ["FIN", 8],
    ["OPS", 9],
    ["SUP", 10],
  ];
  const roleByDept = {
    ENG: ["ENG-SW", "ENG-SW", "ENG-SW", "ENG-SSR", "ENG-SSR", "ENG-DEVOPS", "ENG-QA", "ENG-QA"],
    PDT: ["PDT-PM", "PDT-PM", "PDT-DA", "PDT-UX", "PDT-PD", "PDT-DA"],
    HR: ["HR-ADM", "HR-ADM", "HR-ADM", "HR-MGR", "HR-ADM", "HR-MGR"],
    SAL: ["SAL-SDR", "SAL-SDR", "SAL-SDR", "SAL-AE", "SAL-AE", "SAL-AE", "SAL-AE"],
    MKT: ["MKT-SPC", "MKT-SPC", "MKT-SPC", "MKT-SPC", "MKT-SPC", "MKT-MGR"],
    FIN: ["FIN-FA", "FIN-FA", "FIN-FA", "FIN-FA"],
    OPS: ["OPS-COORD", "OPS-COORD", "OPS-COORD", "OPS-COORD", "OPS-COORD"],
    SUP: ["SUP-CSM", "SUP-CSM", "SUP-CSM", "SUP-SE", "SUP-SE", "SUP-SE", "SUP-SE"],
  };
  const leadRole = {
    ENG: "ENG-MGR",
    PDT: "PDT-PM",
    HR: "HR-MGR",
    SAL: "SAL-MGR",
    MKT: "MKT-MGR",
    FIN: "FIN-FA",
    OPS: "OPS-MGR",
    SUP: "SUP-LD",
  };

  let index = 0;
  const usedEmails = new Set();
  for (const [dept, count] of deptPlan) {
    for (let j = 0; j < count; j++) {
      const isLead = j === 0;
      const now = new Date();
      const joinDate = new Date(randInt(2019, 2026), randInt(0, 11), randInt(1, 28));
      let first = pick(FIRST_NAMES);
      let last = pick(LAST_NAMES);
      let emailSuffix = "";
      let base = `${first}.${last}@nexushr.demo`.replace(/ /g, ".").toLowerCase();
      let n = 2;
      while (usedEmails.has(base + emailSuffix)) {
        emailSuffix = `.${n}`;
        n++;
      }
      usedEmails.add(base + emailSuffix);
      specs.push({
        index,
        dept,
        first,
        last,
        emailSuffix,
        roleCode: isLead ? leadRole[dept] : pick(roleByDept[dept]),
        employeeCode: `EMP-${dept}-${String(j + 1).padStart(4, "0")}`,
        dateOfJoining: iso(joinDate > now ? new Date(now.getFullYear(), now.getMonth() - 2, 1) : joinDate),
        employmentStatus: chance(0.06) ? "probation" : "active",
        location: pick(CITIES),
        experienceYears: randFloat(0.5, 18),
        salaryBand: `${dept.toLowerCase()}-band-${randInt(1, 5)}`,
        isAffected: AFFECTED_INDICES.has(index),
        isLead,
      });
      index++;
    }
  }
  return specs;
}

function buildEmployeeSkills(specs, skillId) {
  const rows = [];
  const core = ["TypeScript", "React", "Node.js", "PostgreSQL", "Cloud Architecture", "Python", "Next.js"];
  const common = Object.keys(skillId).filter((s) => !core.includes(s));
  for (const spec of specs) {
    const count = randInt(6, 12);
    const chosen = new Set();
    let safety = 0;
    while (chosen.size < count && safety < 40) {
      safety++;
      const name = chance(0.5) ? pick(common) : pick(core);
      if (chosen.has(name)) continue;
      chosen.add(name);
      const proficiency = core.includes(name)
        ? pick(["intermediate", "advanced", "advanced", "expert"])
        : pick(["beginner", "beginner", "intermediate", "advanced"]);
      rows.push({
        id: hashId(`emplskill:${spec.profileId}:${name}`),
        employee_id: spec.profileId,
        skill_id: skillId[name],
        proficiency_level: proficiency,
        years_experience: Math.round(randFloat(0.5, 8) * 10) / 10,
        is_verified: chance(0.7),
      });
    }
  }
  return rows;
}

function buildGoals(specs) {
  const rows = [];
  const now = new Date();
  const titles = [
    "Complete certification",
    "Lead a cross-team initiative",
    "Mentor a junior colleague",
    "Close assigned sprint deliverables",
    "Improve product metrics",
    "Finish advanced course",
    "Ship quarter milestone",
    "Launch feature X",
    "Migrate legacy service",
    "Reduce backlog churn",
  ];
  for (const spec of specs) {
    const n = randInt(2, 4);
    for (let i = 0; i < n; i++) {
      const dueOffset = randInt(1, 5);
      const due = new Date(now.getFullYear(), now.getMonth() - dueOffset, 15);
      let progress;
      let status;
      if (spec.isAffected && chance(0.8)) {
        progress = randInt(8, 38);
        status = "active";
      } else if (chance(0.55)) {
        progress = 100;
        status = "completed";
      } else {
        progress = randInt(45, 92);
        status = "active";
      }
      const title = pick(titles);
      rows.push({
        id: hashId(`goal:${spec.profileId}:${title}:${dueOffset}:${i}`),
        employee_id: spec.profileId,
        title,
        description: "",
        category: pick(["career", "performance", "learning", "project", "project"]),
        status,
        start_date: iso(new Date(due.getFullYear(), due.getMonth() - 2, 1)),
        due_date: iso(due),
        progress,
      });
    }
  }
  return rows;
}

function buildAttendance(specs) {
  const rows = [];
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 180);
  const cut = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 45);

  for (const spec of specs) {
    const d = new Date(start);
    while (d <= end) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        let status = "present";
        if (spec.isAffected && d >= cut) {
          const roll = rand();
          if (roll < 0.09) status = "absent";
          else if (roll < 0.19) status = "late";
          else if (roll < 0.26) status = "leave";
          else if (roll < 0.3) status = "half_day";
          else if (roll < 0.4) status = "wfh";
        } else {
          const roll = rand();
          if (roll < 0.005) status = "absent";
          else if (roll < 0.02) status = "late";
          else if (roll < 0.05) status = "leave";
          else if (roll < 0.07) status = "half_day";
          else if (roll < 0.15) status = "wfh";
        }
        rows.push({
          id: hashId(`att:${spec.profileId}:${iso(d)}`),
          employee_id: spec.profileId,
          date: iso(d),
          status,
          check_in: status === "present" || status === "late" ? `${iso(d)}T09:30:00Z` : null,
          check_out: null,
          hours: null,
          notes: null,
        });
      }
      d.setDate(d.getDate() + 1);
    }
  }
  return rows;
}

function buildReviews(specs) {
  const rows = [];
  const now = new Date();
  for (const spec of specs) {
    const reviews = randInt(1, 2);
    for (let i = 0; i < reviews; i++) {
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - randInt(1, 6), 1);
      const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 11, 1);
      let rating;
      if (spec.isAffected && chance(0.75)) rating = randInt(2, 3);
      else rating = randInt(3, 5);
      rows.push({
        id: hashId(`rev:${spec.profileId}:${iso(periodEnd)}:${i}`),
        employee_id: spec.profileId,
        review_type: i === 0 ? "annual" : "quarterly",
        status: "submitted",
        period_start: iso(periodStart),
        period_end: iso(periodEnd),
        rating,
        submitted_at: iso(periodEnd),
        strengths: null,
        improvements: null,
        goals_next: null,
      });
    }
  }
  return rows;
}

function buildFeedback(specs, fromIds) {
  const rows = [];
  const now = new Date();
  for (let i = 0; i < 90; i++) {
    const spec = pick(specs);
    const negative = spec.isAffected && chance(0.6);
    const category = negative
      ? pick(["constructive", "engagement", "manager"])
      : pick(["praise", "peer", "praise", "manager", "praise"]);
    const date = new Date(now.getFullYear(), now.getMonth() - randInt(0, 2), randInt(1, 26));
    rows.push({
      id: hashId(`fb:${i}:${spec.profileId}`),
      from_user_id: pick(fromIds),
      to_employee_id: spec.profileId,
      category,
      message: negative
        ? "Has appeared disengaged recently and missed several commitments."
        : "Delivered strong results and collaborated well with the team.",
      status: "submitted",
      visibility: negative ? "manager" : "public",
      created_at: iso(date),
    });
  }
  return rows;
}

function buildOnboarding(specs) {
  const now = new Date();
  const newHires = specs.filter(
    (spec) => now.getTime() - new Date(spec.dateOfJoining).getTime() < 120 * 864e5
  );
  const taskTitles = [
    "Company orientation",
    "Security & compliance setup",
    "Department onboarding",
    "Tools & access provisioning",
    "Meet the team",
    "First-week plan review",
    "Probation objectives",
    "Buddy assignment",
  ];
  const plans = [];
  const tasks = [];
  for (const spec of newHires) {
    const planId = hashId(`plan:${spec.profileId}`);
    const startDate = new Date(spec.dateOfJoining);
    plans.push({
      id: planId,
      employee_id: spec.profileId,
      title: `${spec.first} ${spec.last} onboarding`,
      status: "in_progress",
      start_date: iso(startDate),
    });
    const n = randInt(6, 8);
    for (let i = 0; i < n; i++) {
      const due = new Date(startDate.getTime() + (i + 1) * 14 * 864e5);
      const complete = chance(0.55);
      const delayed = !complete && due < now;
      tasks.push({
        id: hashId(`task:${planId}:${i}`),
        plan_id: planId,
        title: taskTitles[i % taskTitles.length],
        status: complete ? "completed" : delayed ? "pending" : "in_progress",
        due_date: iso(due),
        completed_at: complete ? iso(due) : null,
        order_index: i,
      });
    }
  }
  return { plans, tasks };
}

function buildTraining(specs, courseRows) {
  const rows = [];
  for (const spec of specs) {
    const n = randInt(1, 3);
    const chosen = new Set();
    for (let i = 0; i < n; i++) {
      const course = pick(courseRows);
      if (chosen.has(course.code)) continue;
      chosen.add(course.code);
      let status;
      if (course.is_mandatory) status = "completed";
      else if (spec.isAffected && chance(0.6)) status = "not_started";
      else status = pick(["in_progress", "completed", "completed"]);
      rows.push({
        id: hashId(`tr:${spec.profileId}:${course.id}`),
        employee_id: spec.profileId,
        course_id: course.id,
        status,
        enrolled_at: iso(new Date()),
        completed_at: status === "completed" ? iso(new Date()) : null,
        score: status === "completed" ? randInt(65, 98) : null,
      });
    }
  }
  return rows;
}

function buildRiskScores(specs) {
  const rows = [];
  const now = new Date();
  for (const spec of specs) {
    for (let i = 5; i >= 0; i--) {
      const period = new Date(now.getFullYear(), now.getMonth() - i, 1);
      let score;
      if (spec.isAffected) score = Math.min(92, Math.round(28 + (5 - i) * randFloat(9, 15)));
      else score = Math.round(randFloat(8, 42));
      const level = score >= 80 ? "critical" : score >= 65 ? "high" : score >= 50 ? "medium" : "low";
      const factors = { tenure_years: Math.round(spec.experienceYears), workload_index: Math.round(randFloat(30, 90)) / 100 };
      if (spec.isAffected && score >= 65) {
        factors.attendance_volatility = Math.round(randFloat(0.6, 0.9) * 100) / 100;
        factors.goal_gap = Math.round(randFloat(0.5, 0.9) * 100) / 100;
        factors.feedback_tone = Math.round(randFloat(0.4, 0.8) * 100) / 100;
      }
      rows.push({
        id: hashId(`risk:${spec.profileId}:${iso(period)}`),
        employee_id: spec.profileId,
        period: iso(period),
        score,
        level,
        factors,
        notes: null,
      });
    }
  }
  return rows;
}

const REQUIREMENT_SETS = {
  "Frontend Engineer": { required: "TypeScript, React, Next.js", preferred: "Supabase, GraphQL, Design Systems, Accessibility", experience: "2+ years", education: "Bachelor's in CS or equivalent", seniority: "Mid-level" },
  "Backend Engineer": { required: "Node.js, PostgreSQL, REST APIs", preferred: "Go, GraphQL, Redis, Serverless", experience: "2+ years", education: "Bachelor's in CS or equivalent", seniority: "Mid-level" },
  "Senior Backend Engineer": { required: "Node.js, PostgreSQL, Cloud Architecture, Microservices", preferred: "Go, Kubernetes, Redis, Performance Tuning", experience: "5+ years", education: "Bachelor's in CS or equivalent", seniority: "Senior" },
  "DevOps Engineer": { required: "AWS, Docker, Kubernetes, CI/CD", preferred: "Terraform, Observability, Security Compliance", experience: "3+ years", education: "Bachelor's or equivalent experience", seniority: "Mid-level" },
  "QA Engineer": { required: "QA Automation, Test Planning, TypeScript", preferred: "Load Testing, CI/CD, Accessibility", experience: "2+ years", education: "Any degree or equivalent experience", seniority: "Mid-level" },
  "Product Manager": { required: "Product Strategy, Stakeholder Management, Agile Delivery", preferred: "Data Analysis, A/B Testing, OKR Setting", experience: "4+ years", education: "Bachelor's or MBA", seniority: "Senior" },
  "Data Analyst": { required: "SQL, Data Visualization, Data Analysis", preferred: "Tableau, Statistical Analysis, Python", experience: "2+ years", education: "Bachelor's in a quantitative field", seniority: "Mid-level" },
  "Account Executive": { required: "Sales Negotiation, Account Management", preferred: "CRM Administration, Forecasting", experience: "3+ years", education: "Any degree", seniority: "Mid-level" },
  "Sales Development Rep": { required: "Lead Generation, Communication", preferred: "CRM Administration", experience: "1+ year", education: "Any degree", seniority: "Entry level" },
  "Marketing Specialist": { required: "Content Strategy, SEO, Email Marketing", preferred: "Paid Media, Brand Management, Data Analysis", experience: "2+ years", education: "Bachelor's in Marketing or equivalent", seniority: "Mid-level" },
  "Customer Success Manager": { required: "Customer Success, Renewal Management, Communication", preferred: "CRM Administration, Data Analysis", experience: "3+ years", education: "Any degree", seniority: "Mid-level" },
  "Support Engineer": { required: "Troubleshooting, Communication, REST APIs", preferred: "Linux Administration, Elasticsearch, Networking", experience: "1+ year", education: "Any degree or equivalent experience", seniority: "Entry level" },
};

const JOBS = [
  ["Frontend Engineer", "ENG-SW", "full_time"],
  ["Backend Engineer", "ENG-SW", "full_time"],
  ["Senior Backend Engineer", "ENG-SSR", "full_time"],
  ["DevOps Engineer", "ENG-DEVOPS", "full_time"],
  ["QA Engineer", "ENG-QA", "full_time"],
  ["Product Manager", "PDT-PM", "full_time"],
  ["Data Analyst", "PDT-DA", "full_time"],
  ["Account Executive", "SAL-AE", "full_time"],
  ["Sales Development Rep", "SAL-SDR", "full_time"],
  ["Marketing Specialist", "MKT-SPC", "full_time"],
  ["Customer Success Manager", "SUP-CSM", "full_time"],
  ["Support Engineer", "SUP-SE", "contract"],
];

const CANDIDATE_STATUSES = [
  "applied", "applied", "applied",
  "screening", "screening",
  "interview", "interview",
  "evaluation",
  "shortlisted",
  "hired", "hired",
  "rejected", "withdrawn",
];

const CANDIDATE_TITLES = [
  "Frontend Developer", "Full-Stack Developer", "Platform Engineer", "DevOps Engineer", "QA Engineer",
  "Product Manager", "Data Analyst", "Account Executive", "Sales Development Representative",
  "Marketing Specialist", "Customer Success Manager", "Technical Support Engineer",
];
const CANDIDATE_SUMMARIES = [
  "Software engineer with a product mindset and a track record of shipping reliable, well-tested features.",
  "Cross-functional operator who turns ambiguous requirements into measurable deliverables.",
  "Hands-on specialist with strong analytical skills and clear written communication.",
  "Customer-focused professional experienced in owning relationships and driving renewals.",
  "Builder who values clean architecture, observability, and pragmatic trade-offs.",
];
const EDUCATION_SAMPLES = [
  "Bachelor's in Computer Science", "Bachelor's in Business Administration", "Master's in Data Science",
  "Associate's degree", "High school diploma", "Bachelor's in Design",
];
const PROJECT_SAMPLES = [
  "Rebuilt the checkout flow, lifting conversion by 12% while cutting page load time in half.",
  "Migrated a legacy monolith to a containerised service behind a reverse proxy.",
  "Introduced a weekly reporting cadence that gave leadership a single source of truth.",
  "Automated a manual onboarding process, saving around 8 hours per week of team time.",
];
const CERT_SAMPLES = [
  "AWS Certified Cloud Practitioner",
  "Certified Kubernetes Application Developer",
  "Tableau Desktop Specialist",
  "Professional Scrum Master I",
  "None",
];

function buildRecruitment(roleDept, hiringManagerEmpId) {
  return JOBS.map(([title, roleCode, type]) => {
    const req = REQUIREMENT_SETS[title] ?? {};
    return {
      id: hashId("job:" + title),
      title,
      department_id: roleDept[roleCode] ?? null,
      hiring_manager_id: hiringManagerEmpId,
      status: "published",
      employment_type: type,
      location: pick(CITIES),
      headcount: randInt(1, 3),
      salary_band: "range-negotiable",
      description: `Open position for ${title}${req.experience ? `. Looking for ${req.experience} of experience and ${req.education}.` : ""}`,
      requirements: "Relevant experience and team fit.",
      required_skills: req.required ?? null,
      preferred_skills: req.preferred ?? null,
      experience: req.experience ?? null,
      education: req.education ?? null,
      seniority: req.seniority ?? null,
    };
  });
}

function buildCandidates(allJobs) {
  const candidates = [];
  for (let i = 0; i < 60; i++) {
    const email = `candidate${i}@example.com`;
    const job = pick(allJobs);
    const skillCount = randInt(6, 12);
    const skillNames = new Set();
    let safety = 0;
    while (skillNames.size < skillCount && safety < 40) {
      safety++;
      skillNames.add(pick(SKILL_NAMES));
    }
    candidates.push({
      id: hashId("cand:" + email),
      job_id: job.id,
      full_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      email,
      status: pick(CANDIDATE_STATUSES),
      source: pick(["LinkedIn", "Referral", "Indeed", "Career site"]),
      applied_at: iso(new Date(new Date().setDate(new Date().getDate() - randInt(2, 120)))),
      notes: null,
      current_title: pick(CANDIDATE_TITLES),
      summary: pick(CANDIDATE_SUMMARIES),
      experience_years: Math.round(randFloat(0.5, 15) * 10) / 10,
      education: pick(EDUCATION_SAMPLES),
      projects: pick(PROJECT_SAMPLES),
      certifications: pick(CERT_SAMPLES),
      relevant_experience: `Worked on ${job.title.replace(/ Engineer\b/, "").toLowerCase()} deliverables for the past ${randInt(1, 4)} years.`,
      hasResume: chance(0.7),
      skill_names: [...skillNames],
      required_skills: (REQUIREMENT_SETS[job.title]?.required ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }
  return candidates;
}

function buildCandidateSkills(candidates, skillId) {
  const rows = [];
  for (const c of candidates) {
    for (const name of c.skill_names) {
      if (!skillId[name]) continue;
      rows.push({
        id: hashId("candskill:" + c.id + ":" + name),
        candidate_id: c.id,
        skill_id: skillId[name],
      });
    }
  }
  return rows;
}

function resumeTextFor(c) {
  return [
    `${c.full_name}`,
    c.current_title,
    "",
    "Summary",
    c.summary,
    "",
    "Skills",
    c.skill_names.join(", "),
    "",
    "Experience",
    `${c.relevant_experience} Total experience ~${Math.round(c.experience_years)} years.`,
    "",
    "Education",
    c.education,
    "",
    "Projects",
    c.projects,
    "",
    "Certifications",
    c.certifications,
  ].join("\n");
}

function buildResumes(candidates) {
  const rows = [];
  for (const c of candidates) {
    if (!c.hasResume) continue;
    rows.push({
      id: hashId("resume:" + c.id),
      candidate_id: c.id,
      file_path: `candidate/${c.id}/seed_resume.txt`,
      file_name: `${c.full_name.replace(/\s+/g, "_")}_resume.txt`,
      file_type: "text/plain",
      file_size: resumeTextFor(c).length,
      content_text: resumeTextFor(c),
    });
  }
  return rows;
}

const pickMissing = (c) => {
  const pool = (c.required_skills ?? []).filter((s) => !c.skill_names.includes(s));
  return pool.length > 0 ? pool : [];
};

function buildAssessments(candidates) {
  const rows = [];
  for (const c of candidates) {
    if (!c.hasResume) continue;
    if (c.status === "applied" && !chance(0.35)) continue;

    const skillMatch = clamp(Math.round(randFloat(42, 96)), 0, 100);
    const experienceMatch = clamp(Math.round(randFloat(40, 95)), 0, 100);
    const roleRelevance = clamp(Math.round(randFloat(45, 98)), 0, 100);
    const educationMatch = clamp(Math.round(randFloat(55, 100)), 0, 100);
    const overall = clamp(
      Math.round(skillMatch * 0.4 + experienceMatch * 0.25 + roleRelevance * 0.2 + educationMatch * 0.15),
      0,
      100
    );
    const recommendation = overall >= 80 ? "strong" : overall >= 55 ? "potential" : "needs_assessment";

    const topSkill = c.skill_names[0] ?? "communication";
    const secondSkill = c.skill_names[1] ?? "collaboration";
    const strengths = [
      `Solid ${topSkill} experience that maps directly to the role.`,
      `Strong track record of ${secondSkill} in a team setting.`,
    ];
    const gaps = pickMissing(c).map((s) => `No direct evidence of ${s} on the latest resume.`);
    if (gaps.length === 0) gaps.push("No major requirement gaps identified on the resume.");
    const focus = [
      `Probe depth of ${topSkill} with a concrete scenario.`,
      `Validate ${experienceMatch >= 70 ? "ownership" : "learning"} framing from ${c.relevant_experience}`,
    ];

    rows.push({
      id: hashId("assessment:" + c.id + ":" + c.job_id),
      candidate_id: c.id,
      job_id: c.job_id,
      overall_match: overall,
      skill_match: skillMatch,
      experience_match: experienceMatch,
      role_relevance: roleRelevance,
      education_match: educationMatch,
      recommendation,
      summary: `${c.full_name} shows a ${recommendation === "strong" ? "strong" : recommendation === "potential" ? "promising but partial" : "limited, to-be-validated"} fit for the role based on resume evidence.`,
      why_matches: [
        `Relevant experience in ${c.current_title} with ${Math.round(c.experience_years)} years in total.`,
        `Lists ${c.skill_names.length} skills, led by ${topSkill}.`,
      ],
      missing_requirements: gaps,
      relevant_evidence: [c.relevant_experience],
      interview_focus: focus,
      strengths,
      gaps,
      next_step: recommendation === "strong" ? "Move to interview." : "Screen with a short call before deciding next steps.",
      confidence: Math.round(randFloat(0.7, 0.95) * 1000) / 1000,
      updated_at: iso(new Date(new Date().setDate(new Date().getDate() - randInt(1, 14)))),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { roleDept, skillId, courseRows } = await ensureReferenceData();

  const specs = buildEmployeeSpecs();
  const profileIdByEmail = await ensureProfiles(specs);
  const withProfiles = specs
    .filter((s) => profileIdByEmail.has(emailOf(s)))
    .map((s) => ({ ...s, profileId: profileIdByEmail.get(emailOf(s)) }));

  console.log(`[3] Employees (${withProfiles.length})`);
  await runUpsert(
    "employees",
    withProfiles.map((s) => ({
      id: s.profileId,
      profile_id: s.profileId,
      employee_code: s.employeeCode,
      department_id: roleDept[s.roleCode] ?? null,
      role_id: null, // filled below from roles lookup
      manager_id: null,
      date_of_joining: s.dateOfJoining,
      employment_status: s.employmentStatus,
      location: s.location,
      experience_years: Math.round(s.experienceYears * 10) / 10,
      salary_band: s.salaryBand,
    })),
    "employee_code"
  );

  // Resolve role ids and manager links.
  const { data: roleRows } = await supabase.from("roles").select("id, code");
  const roleIdMap = Object.fromEntries((roleRows ?? []).map((r) => [r.code, r.id]));
  const { data: empRowsOut } = await supabase
    .from("employees")
    .select("id, employee_code")
    .in("employee_code", withProfiles.map((s) => s.employeeCode));
  const empIdByCode = Object.fromEntries((empRowsOut ?? []).map((e) => [e.employee_code, e.id]));
  const leadByDept = new Map();
  const empRoleUpdates = [];
  for (const s of withProfiles) {
    const empId = empIdByCode[s.employeeCode];
    if (!empId) continue;
    if (s.isLead) leadByDept.set(s.dept, empId);
    const roleCode = s.roleCode;
    empRoleUpdates.push({
      id: empId,
      employee_code: s.employeeCode,
      profile_id: empId,
      role_id: roleIdMap[roleCode] ?? null,
    });
  }
  await runUpsert("employees", empRoleUpdates, "id");
  const managerUpdates = withProfiles
    .filter((s) => !s.isLead && empIdByCode[s.employeeCode])
    .map((s) => ({
      id: s.profileId,
      employee_code: s.employeeCode,
      profile_id: s.profileId,
      manager_id: leadByDept.get(s.dept) ?? null,
    }));
  await runUpsert("employees", managerUpdates, "id");

  console.log("[4] Employee skills");
  await runUpsert("employee_skills", buildEmployeeSkills(withProfiles, skillId), "id");

  console.log("[5] Goals");
  await runUpsert("goals", buildGoals(withProfiles), "id");

  console.log("[6] Attendance");
  await runUpsert("attendance", buildAttendance(withProfiles), "id");

  console.log("[7] Performance reviews");
  await runUpsert("performance_reviews", buildReviews(withProfiles), "id");

  console.log("[8] Feedback");
  const fromIds = withProfiles.map((s) => s.profileId);
  await runUpsert("feedback", buildFeedback(withProfiles, fromIds), "id");

  console.log("[9] Onboarding");
  const { plans, tasks } = buildOnboarding(withProfiles);
  await runUpsert("onboarding_plans", plans, "id");
  await runUpsert("onboarding_tasks", tasks, "id");

  console.log("[10] Training");
  await runUpsert("employee_training", buildTraining(withProfiles, courseRows), "id");

  console.log("[11] Risk scores");
  await runUpsert("risk_scores", buildRiskScores(withProfiles), "id");

  console.log("[12] Jobs + candidates + assessments");
  const jobs = buildRecruitment(roleDept, empIdByCode["EMP-ENG-0001"] ?? null);
  const { data: jobsOut, error: jobsErr } = await supabase.from("jobs").upsert(jobs, { onConflict: "id" }).select("id");
  if (jobsErr) throw new Error(`jobs: ${jobsErr.message}`);

  const candidates = buildCandidates(jobsOut ?? []);
  await runUpsert("candidates", candidates, "id");
  await runUpsert("candidate_skills", buildCandidateSkills(candidates, skillId), "id");
  await runUpsert("resumes", buildResumes(candidates), "id");
  await runUpsert("candidate_assessments", buildAssessments(candidates), "id");

  console.log("[13] AI insights (org-wide)");
  await runUpsert(
    "ai_insights",
    [
      {
        id: hashId("ai:eng-low"),
        category: "attrition",
        severity: "high",
        title: "Engineering engagement at a low",
        content: "Multiple signals indicate rising disengagement in Engineering.",
        metadata: { source: "seed" },
        is_read: false,
      },
    ],
    "id"
  );

  console.log(`\nDone. ${withProfiles.length} employees seeded.`);
  console.log("Affected (declining-engagement) cohort:", withProfiles.filter((s) => s.isAffected).length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});