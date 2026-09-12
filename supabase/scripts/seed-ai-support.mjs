// ---------------------------------------------------------------------------
// WorkforceIQ — AI support data: policies + interviews
// ---------------------------------------------------------------------------
// Creates policy documents (with chunks for retrieval-grounded Q&A) and
// interview records (with questions + submitted evaluations so the AI
// evaluation feature has real data to reason over).
//
//   npm run seed:ai
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
// Every row carries a deterministic id derived from its content, so re-running
// upserts the same records instead of duplicating them.
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

function hashId(seed) {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ---------------------------------------------------------------------------
// Policies (paragrephed so chunking keeps sections roughly together)
// ---------------------------------------------------------------------------

const POLICY_TEXTS = [
  {
    title: "Remote Work Policy",
    slug: "remote-work",
    category: "hr",
    content: [
      "1. Purpose. This policy defines how WorkforceIQ supports flexible and remote work arrangements while preserving collaboration, fairness, and security.",
      "2. Eligibility. Employees whose role and manager confirm remote suitability may work remotely. Team members should agree on core collaboration hours with their team.",
      "3. Scheduling and attendance. Remote days are recorded in the attendance system as 'wfh'. Employees must be available during agreed core hours and respond to messages within a reasonable window on working days.",
      "4. Equipment and security. The company provides equipment for health-safety and security requirements. Remote workers must connect through the company VPN, lock screens, and report any suspected data breach to IT immediately.",
      "5. Expenses. Home-office reimbursements are available within the approved allowance as described in the Finance policy. Travel to the office is not reimbursed for routine remote days.",
      "6. Requesting an arrangement. Employees request remote arrangements through HR. Arrangements are reviewed at least annually and can be paused when business needs change.",
    ].join("\n\n"),
  },
  {
    title: "Paid Time Off (PTO) and Leave Policy",
    slug: "pto-and-leave",
    category: "hr",
    content: [
      "1. Purpose. This policy explains annual leave, sickness, and other time off, and how it is requested and approved.",
      "2. Annual leave. Full-time employees accrue annual leave. Requests are submitted through the HR system, should be planned with the manager, and are approved based on business coverage.",
      "3. Sick leave. Employees unable to work due to illness should notify their manager on the first day of absence and submit a sick leave request. Medical documentation may be requested for absences longer than three days.",
      "4. Other types of leave. Parental, bereavement, and other statutory leave are handled per employment legislation and the individual's contract. See HR for details.",
      "5. Approval and record keeping. Leave requests require manager approval; the team calendar should reflect planned time off. Unapproved absence may be treated under the attendance policy.",
    ].join("\n\n"),
  },
  {
    title: "Data Security Policy",
    slug: "data-security",
    category: "security",
    content: [
      "1. Purpose. This policy protects WorkforceIQ data, systems, and the data we process on behalf of customers and employees.",
      "2. Access control. Access to systems is role-based, granted on a need-to-know basis, and reviewed quarterly. Shared credentials are prohibited.",
      "3. Data handling. Employee and customer data must be handled under the data classification guidelines. Production data is never copied into personal environments or local machines outside approved tooling.",
      "4. Incidents. Any suspected breach, phishing attempt, or unusual system behavior must be reported to IT and the security team within 24 hours. Do not delete evidence.",
      "5. Compliance training. Mandatory security training is assigned through the learning system each year and must be completed by the due date.",
    ].join("\n\n"),
  },
  {
    title: "Expense and Reimbursement Policy",
    slug: "expenses",
    category: "finance",
    content: [
      "1. Purpose. This policy defines which business expenses are reimbursable and how to claim them.",
      "2. Eligible expenses. Business travel, client meals, required equipment, and approved home-office items are reimbursable when they are business-related, pre-approved where required, and accompanied by receipts.",
      "3. Submission. Expenses are submitted within 30 days of the expense date. Claims above the standard threshold require manager and finance approval.",
      "4. Ineligible expenses. Personal items, duplicate claims, speculative costs, and expenses for remote days' routine utilities are not reimbursable.",
      "5. Audit. Finance may request documentation for any claim. Fraudulent claims are treated as misconduct.",
    ].join("\n\n"),
  },
  {
    title: "Code of Conduct",
    slug: "code-of-conduct",
    category: "conduct",
    content: [
      "1. Purpose. This policy sets expectations for respectful, professional, and ethical behavior across WorkforceIQ.",
      "2. Respectful workplace. Harassment, discrimination, retaliation, and bullying are prohibited. All employees are expected to contribute to an inclusive environment.",
      "3. Conflicts of interest. Employees must disclose actual or potential conflicts of interest to HR or their manager. Gifts and entertainment from business partners must comply with the gift threshold.",
      "4. Reporting. Concerns can be raised with a manager, HR, or confidentially through the ethics channel. Retaliation against anyone reporting in good faith is prohibited.",
      "5. Compliance. Violations are addressed under the disciplinary policy and may include termination.",
    ].join("\n\n"),
  },
  {
    title: "IT Acceptable Use Policy",
    slug: "acceptable-use",
    category: "it",
    content: [
      "1. Purpose. This policy governs the responsible use of WorkforceIQ computers, accounts, networks, and company data.",
      "2. Permitted use. Company resources are for work purposes. Occasional personal use is permitted when it does not interfere with work, consume excessive resources, or risk security.",
      "3. Prohibited use. Installing unapproved software, bypassing controls, accessing sensitive data without authorization, and using company systems for unrelated business are prohibited.",
      "4. Passwords and MFA. Multi-factor authentication is mandatory for all company accounts. Passwords must be unique and never shared.",
      "5. Software and devices. Only approved devices and software may connect to the corporate network. Lost or stolen devices must be reported to IT immediately.",
    ].join("\n\n"),
  },
];

async function seedPolicies() {
  const policyRows = POLICY_TEXTS.map((p) => ({
    id: hashId("policy:" + p.slug),
    title: p.title,
    slug: p.slug,
    category: p.category,
    status: "published",
    version: 1,
    content: p.content,
  }));

  // Align ids with any pre-existing rows (by slug) so the primary-key upsert
  // updates in place without rewriting ids (which breaks chunk FKs).
  const slugs = policyRows.map((p) => p.slug);
  const { data: existing } = await supabase
    .from("policies")
    .select("id, slug")
    .in("slug", slugs);
  const idForSlug = Object.fromEntries((existing ?? []).map((p) => [p.slug, p.id]));
  for (const p of policyRows) {
    if (idForSlug[p.slug]) p.id = idForSlug[p.slug];
  }

  const { data: upserted, error: policyErr } = await supabase
    .from("policies")
    .upsert(policyRows, { onConflict: "id" })
    .select("id, slug");
  if (policyErr) throw new Error(`policies: ${policyErr.message}`);

  const idBySlug = Object.fromEntries((upserted ?? []).map((p) => [p.slug, p.id]));

  // Chunks are derived data: wipe existing chunks for these policies first so
  // the (policy_id, chunk_index) unique pair can be rewritten cleanly.
  const chunkIds = Object.values(idBySlug).filter(Boolean);
  if (chunkIds.length > 0) {
    const { error: delErr } = await supabase
      .from("policy_chunks")
      .delete()
      .in("policy_id", chunkIds);
    if (delErr) throw new Error(`policy_chunks delete: ${delErr.message}`);
  }

  const chunkRows = [];
  for (const p of policyRows) {
    const policyId = idBySlug[p.slug];
    if (!policyId) continue;
    // Keep section boundaries mostly intact by splitting on blank lines ~2k chars.
    const blocks = p.content.split(/\n\n+/);
    let buffer = "";
    let index = 0;
    const flush = () => {
      if (!buffer.trim()) return;
      chunkRows.push({
        id: hashId(`chunk:${p.slug}:${index}`),
        policy_id: policyId,
        chunk_index: index,
        content: buffer.trim(),
        character_count: buffer.trim().length,
      });
      index += 1;
      buffer = "";
    };
    for (const block of blocks) {
      if ((buffer + block).length > 1800 && buffer) flush();
      buffer = `${buffer}\n\n${block}`.trim();
    }
    flush();
  }

  const { error: chunkErr } = await supabase
    .from("policy_chunks")
    .upsert(chunkRows, { onConflict: "id" });
  if (chunkErr) throw new Error(`policy_chunks: ${chunkErr.message}`);

  console.log(`[1] Policies (${policyRows.length}) + chunks (${chunkRows.length})`);
  return policyRows;
}

// ---------------------------------------------------------------------------
// Interviews (with questions + submitted evaluations for completed ones)
// ---------------------------------------------------------------------------

const QUESTIONS = [
  ["Tell me about a project where you had to make a difficult technical or product trade-off.", "Judgment"],
  ["How do you prioritize work when multiple deadlines collide?", "Prioritization"],
  ["Describe a time you resolved a conflict with a teammate or customer.", "Collaboration"],
  ["What does success in your first 90 days look like to you?", "Role understanding"],
];

async function seedInterviews() {
  const { data: candRows, error: candErr } = await supabase
    .from("candidates")
    .select("id, full_name, status, job_id");
  if (candErr) throw new Error(`candidates: ${candErr.message}`);
  const candidates = candRows ?? [];

  const progressed = candidates.filter((c) =>
    ["screening", "interview", "offer", "hired", "rejected"].includes(c.status)
  );
  const picked = [...progressed].sort(() => rand() - 0.5).slice(0, 24);

  const interviews = [];
  const questions = [];
  const evaluations = [];

  for (const cand of picked) {
    const interviewId = hashId("interview:" + cand.id);
    const completed = ["offer", "hired", "rejected"].includes(cand.status);
    const type = completed ? "panel" : cand.status === "screening" ? "phone" : "video";

    interviews.push({
      id: interviewId,
      job_id: cand.job_id,
      candidate_id: cand.id,
      interviewer_id: null,
      interview_type: type,
      status: completed ? "completed" : "scheduled",
      scheduled_at: completed ? isoDaysAgo(randInt(3, 30)) : isoDaysAhead(randInt(1, 14)),
      meeting_link: completed ? null : `https://meet.workforceiq.demo/${hashId("m:" + cand.id).slice(0, 8)}`,
      notes: completed ? "Evaluations submitted." : null,
    });

    if (completed) {
      QUESTIONS.forEach(([question, skill], qi) => {
        questions.push({
          id: hashId(`iq:${cand.id}:${qi}`),
          interview_id: interviewId,
          title: skill,
          question,
          order_index: qi,
        });
      });

      const evaluatorCount = cand.status === "hired" ? 2 : 1;
      for (let e = 0; e < evaluatorCount; e++) {
        const positive = ["offer", "hired"].includes(cand.status);
        const rating = positive ? (cand.status === "hired" ? 5 : 4) : 2;
        const rec = cand.status === "hired" ? "strong_yes" : cand.status === "offer" ? "yes" : "no";
        evaluations.push({
          id: hashId(`ie:${cand.id}:${e}`),
          interview_id: interviewId,
          interviewer_id: null,
          skills_rating: rating,
          communication: positive ? rating : rating - 1,
          overall_rating: rating,
          recommendation: rec,
          notes: positive
            ? "Candidate demonstrated the required capabilities and communication. Recommend moving forward."
            : "Candidate did not meet the expected bar for the role during this interview.",
          submitted_at: isoDaysAgo(randInt(1, 12)),
        });
      }
    }
  }

  const upsert = async (table, rows) => {
    if (!rows.length) return;
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`${table}: ${error.message}`);
  };

  await upsert("interviews", interviews);
  await upsert("interview_questions", questions);
  await upsert("interview_evaluations", evaluations);

  console.log(
    `[2] Interviews (${interviews.length}) + questions (${questions.length}) + evaluations (${evaluations.length})`
  );
}

const isoDaysAgo = (days) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
const isoDaysAhead = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

async function main() {
  try {
    await seedPolicies();
    await seedInterviews();
    console.log("Done.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
}

main();