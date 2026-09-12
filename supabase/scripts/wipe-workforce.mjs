import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const DEMO_EMAILS = [
  "hr@workforceiq.demo",
  "hr.manager@workforceiq.demo",
  "employee@workforceiq.demo",
];

const { data: seededProfiles } = await supabase
  .from("profiles")
  .select("id, email")
  .eq("role", "employee")
  .not("email", "in", `(${DEMO_EMAILS.map((e) => `"${e}"`).join(",")})`);

const seededIds = (seededProfiles ?? []).filter((p) => p.email?.endsWith("@workforceiq.demo")).map((p) => p.id);
const seededEmails = new Set((seededProfiles ?? []).filter((p) => p.email?.endsWith("@workforceiq.demo")).map((p) => p.email));

console.log("seeded profiles to wipe:", seededIds.length);

async function delRows(table, column, values, label) {
  let ran = 0;
  for (let i = 0; i < values.length; i += 500) {
    const chunk = values.slice(i, i + 500);
    const { error } = await supabase.from(table).delete().in(column, chunk);
    if (error) throw new Error(`${label} delete: ${error.message}`);
    ran += chunk.length;
  }
  console.log(`${label}: deleted ${ran}`);
}

// children -> employees -> profiles (no children reference these employee rows)
await delRows("employees", "profile_id", seededIds, "employees");
await delRows("profiles", "id", seededIds, "profiles");

// wipe every auth user on the seeded emails (removes duplicates too)
let page = 1;
let deleted = 0;
for (;;) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  for (const u of data.users) {
    if (u.email && seededEmails.has(u.email.toLowerCase())) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) console.error(`auth delete ${u.email}: ${delErr.message}`);
      else deleted++;
    }
  }
  if (data.users.length < 1000) break;
  page++;
}
console.log("auth users deleted:", deleted);
console.log("Wipe complete.");