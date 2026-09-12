// ---------------------------------------------------------------------------
// WorkforceIQ — demo user seeder
// ---------------------------------------------------------------------------
// Creates (or updates) two confirmed auth users plus their profiles and
// employee records, so the dashboards have real credentials after the
// migrations and seed.sql have been applied.
//
// Usage:
//   npm run seed
//
// Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY from .env.local (see package.json "seed" script).
// The service role key is required — it bypasses RLS and can confirm emails,
// set app_metadata, and write profiles/employees.
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "Missing Supabase env vars. Copy .env.example to .env.local and set " +
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first."
  );
  process.exit(1);
}

const DEMO_USERS = [
  {
    email: "hr@workforceiq.demo",
    password: "WorkforceIQ-HR-2026!",
    fullName: "Ava Reynolds",
    appRole: "hr_admin",
    workspaceClip: "hr",
    employeeCode: "EMP-HR-0001",
    departmentCode: "HR",
    roleCode: "HR-ADM",
    employmentStatus: "active",
    dateOfJoining: "2021-03-15",
    salaryBand: "hr-band-3",
  },
  {
    email: "hr.manager@workforceiq.demo",
    password: "WorkforceIQ-HR-2026!",
    fullName: "Liam Chang",
    appRole: "hr_manager",
    workspaceClip: "hr",
    employeeCode: "EMP-HR-0002",
    departmentCode: "HR",
    roleCode: "HR-MGR",
    employmentStatus: "active",
    dateOfJoining: "2019-06-01",
    salaryBand: "hr-band-4",
  },
  {
    email: "employee@workforceiq.demo",
    password: "WorkforceIQ-EMP-2026!",
    fullName: "Maya Patel",
    appRole: "employee",
    workspaceClip: "employee",
    employeeCode: "EMP-ENG-0001",
    departmentCode: "ENG",
    roleCode: "ENG-SW",
    employmentStatus: "active",
    dateOfJoining: "2022-01-10",
    salaryBand: "eng-band-2",
  },
];

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  let page = null;
  for (let i = 0; i < 100; i++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: i + 1, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 1000) return null;
    void page;
    page = i;
  }
  return null;
}

async function ensureAuthUser(spec) {
  const existing = await findUserByEmail(spec.email);
  if (existing) {
    console.log(`  auth: ${spec.email} exists (${existing.id})`);
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      user_metadata: { full_name: spec.fullName, role: spec.appRole },
      app_metadata: { role: spec.appRole },
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: spec.email,
    password: spec.password,
    email_confirm: true,
    user_metadata: { full_name: spec.fullName, role: spec.appRole },
    app_metadata: { role: spec.appRole },
  });
  if (error) throw error;
  console.log(`  auth: created ${spec.email} (${data.user.id})`);
  return data.user.id;
}

async function ensureProfile(userId, spec) {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, full_name: spec.fullName, email: spec.email, role: spec.appRole },
      { onConflict: "id", ignoreDuplicates: false }
    );
  if (error) {
    console.error(`  profiles: SKIPPED for ${spec.email} -> ${error.message}`);
  } else {
    console.log(`  profiles: ensured ${spec.email} role=${spec.appRole}`);
  }
}

async function ensureEmployee(spec) {
  const { data: dept } = await supabase.from("departments").select("id").eq("code", spec.departmentCode).maybeSingle();
  const { data: roleRec } = await supabase.from("roles").select("id").eq("code", spec.roleCode).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", spec.email).maybeSingle();

  if (!profile) {
    console.error(`  employees: SKIPPED ${spec.email} (no profile row)`);
    return;
  }

  const { error } = await supabase
    .from("employees")
    .upsert(
      {
        profile_id: profile.id,
        employee_code: spec.employeeCode,
        department_id: dept?.id ?? null,
        role_id: roleRec?.id ?? null,
        date_of_joining: spec.dateOfJoining,
        employment_status: spec.employmentStatus,
        salary_band: spec.salaryBand,
      },
      { onConflict: "employee_code", ignoreDuplicates: false }
    );
  if (error) {
    console.error(`  employees: SKIPPED ${spec.email} -> ${error.message}`);
  } else {
    console.log(`  employees: ensured ${spec.email} (${spec.employeeCode})`);
  }
}

async function main() {
  for (const spec of DEMO_USERS) {
    console.log(`\n${spec.email}:`);
    try {
      const userId = await ensureAuthUser(spec);
      await ensureProfile(userId, spec);
      await ensureEmployee(spec);
    } catch (err) {
      console.error(`  FAILED -> ${err.message}`);
    }
  }

  console.log("\nDone. Sign-in users:");
  console.log("  HR Admin : hr@workforceiq.demo        / WorkforceIQ-HR-2026!");
  console.log("  HR Manager: hr.manager@workforceiq.demo / WorkforceIQ-HR-2026!");
  console.log("  Employee : employee@workforceiq.demo  / WorkforceIQ-EMP-2026!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});