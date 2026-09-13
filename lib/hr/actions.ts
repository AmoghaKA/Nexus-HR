"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import type { PickerOption } from "@/lib/ai/actions";

// ---------------------------------------------------------------------------
// HR server actions for onboarding: reference data + new-hire provisioning.
// A new hire gets a confirmed auth account, a role-flagged profile, an
// employee row (code/list/manager/experience/start date), and their skill
// tags — so the adaptive onboarding journey can personalize against all of it.
// ---------------------------------------------------------------------------

export interface NewHireInput {
  fullName: string;
  email: string;
  departmentId: string;
  roleId: string;
  experienceYears: number;
  skills: string[];
  managerId: string | null;
  dateOfJoining: string;
}

export interface NewHireOptions {
  departments: PickerOption[];
  roles: PickerOption[];
  managers: PickerOption[];
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function listNewHireOptions(): Promise<{ ok: boolean; options?: NewHireOptions; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const [deptRes, roleRes, empRes] = await Promise.all([
      supabase.from("departments").select("id, name, code").order("name"),
      supabase.from("roles").select("id, title, code").order("title"),
      supabase
        .from("employees")
        .select("id, profiles(full_name), roles(title), employment_status")
        .order("date_of_joining", { ascending: false })
        .limit(100),
    ]);
    if (deptRes.error || roleRes.error || empRes.error) {
      return { ok: false, error: deptRes.error?.message ?? roleRes.error?.message ?? empRes.error?.message };
    }

    const empData = (empRes.data ?? []) as unknown as {
      id: string;
      profiles: { full_name: string } | null;
      roles: { title: string } | null;
      employment_status: string;
    }[];
    const managers = empData
      .filter((e) => !["terminated", "resigned"].includes(e.employment_status))
      .map((e) => ({
        value: e.id,
        label: e.profiles?.full_name ?? "Unknown",
        sub: e.roles?.title ?? "No role",
      }));

    return {
      ok: true,
      options: {
        departments: ((deptRes.data ?? []) as { id: string; name: string; code: string }[]).map((d) => ({
          value: d.id,
          label: d.name,
          sub: d.code,
        })),
        roles: ((roleRes.data ?? []) as { id: string; title: string; code: string }[]).map((r) => ({
          value: r.id,
          label: r.title,
          sub: r.code,
        })),
        managers,
      },
    };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Failed to load onboarding options.") };
  }
}

async function employeeCodeFor(supabase: NonNullable<ReturnType<typeof getSupabaseServer>>, deptCode: string): Promise<string> {
  const { count } = await supabase.from("employees").select("id", { count: "exact", head: true });
  const prefix = `EMP-${(deptCode || "GEN").toUpperCase().slice(0, 3)}-`;
  const base = (count ?? 0) + 1;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${prefix}${String(base + attempt).padStart(4, "0")}`;
    const { data: existing } = await supabase.from("employees").select("id").eq("employee_code", code).maybeSingle();
    if (!existing) return code;
  }
  return `${prefix}${String(Date.now() % 100000).padStart(6, "0")}`;
}

async function skillIdFor(supabase: NonNullable<ReturnType<typeof getSupabaseServer>>, name: string): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;

  const { data: existing } = await supabase.from("skills").select("id").eq("name", clean).maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await supabase
    .from("skills")
    .insert({ name: clean, category: null })
    .select("id")
    .single();
  if (error || !created) return null;
  return (created as { id: string }).id;
}

export interface ProvisionNewHireResult {
  ok: boolean;
  employeeId?: string;
  employeeCode?: string;
  temporaryPassword?: string;
  error?: string;
}

/** Creates the auth account + profile + employee row + skill tags for a new
 *  hire, so HR can immediately generate their adaptive onboarding journey. */
export async function provisionNewHire(input: NewHireInput): Promise<ProvisionNewHireResult> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const fullName = input.fullName.trim();
    const email = input.email.trim().toLowerCase();
    if (!fullName || !email) return { ok: false, error: "Full name and a valid email are required." };

    const temporaryPassword = `WorkforceIQ-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}!`;

    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "employee" },
      app_metadata: { role: "employee" },
    });
    if (createError) {
      return { ok: false, error: createError.message };
    }
    const userId = data!.user.id;

    await supabase
      .from("profiles")
      .upsert(
        { id: userId, full_name: fullName, email, role: "employee" },
        { onConflict: "id", ignoreDuplicates: false }
      );

    const { data: dept } = await supabase
      .from("departments")
      .select("code")
      .eq("id", input.departmentId || "")
      .maybeSingle();
    const deptCode = (dept as { code: string } | null)?.code ?? "GEN";

    const employeeCode = await employeeCodeFor(supabase, deptCode);

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .insert({
        profile_id: userId,
        employee_code: employeeCode,
        department_id: input.departmentId || null,
        role_id: input.roleId || null,
        manager_id: input.managerId || null,
        date_of_joining: input.dateOfJoining || null,
        employment_status: "probation",
        experience_years: Math.max(0, Math.round(input.experienceYears * 10) / 10),
      })
      .select("id")
      .single();
    if (empError) {
      // Roll back the orphaned auth user so re-submission works cleanly.
      await supabase.auth.admin.deleteUser(userId);
      return { ok: false, error: empError.message };
    }

    const proficiency = input.experienceYears >= 2 ? "intermediate" : "beginner";
    for (const skillName of input.skills) {
      const skillId = await skillIdFor(supabase, skillName);
      if (!skillId) continue;
      await supabase
        .from("employee_skills")
        .upsert(
          {
            employee_id: (employee as { id: string }).id,
            skill_id: skillId,
            proficiency_level: proficiency,
            years_experience: Math.max(0, input.experienceYears),
          },
          { onConflict: "employee_id,skill_id", ignoreDuplicates: false }
        );
    }

    return {
      ok: true,
      employeeId: (employee as { id: string }).id,
      employeeCode,
      temporaryPassword,
    };
  } catch (error) {
    return { ok: false, error: messageOf(error, "Failed to provision the new hire.") };
  }
}