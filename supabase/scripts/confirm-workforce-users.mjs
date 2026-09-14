#!/usr/bin/env node
/**
 * One-off: confirms sign-in for the existing seeded employee accounts so they
 * can actually log in (the seed previously created them with email_confirm
 * disabled). HR demo accounts are left untouched.
 *
 * Run with: node --env-file=.env.local confirm-workforce-users.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }

  const targets = users.filter(
    (u) =>
      (u.email ?? "").toLowerCase().endsWith("@nexushr.demo") &&
      u.app_metadata?.role === "employee"
  );

  let updated = 0;
  let failed = 0;
  for (const user of targets) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: { ...user.user_metadata, role: "employee" },
      app_metadata: { ...user.app_metadata, role: "employee" },
    });
    if (error) {
      failed++;
      console.error(`  FAILED ${user.email}: ${error.message}`);
    } else {
      updated++;
    }
  }

  console.log(`Confirmed ${updated} employee account(s) (${failed} failed).`);
  if (updated) {
    console.log("They can now sign in with password NexusHR-Seed-2026! as employees.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});