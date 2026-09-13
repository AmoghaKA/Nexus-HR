# WorkforceIQ

**Workforce Intelligence, Powered by AI.**

WorkforceIQ is a full-stack HR analytics platform that connects every stage of the employee
lifecycle — recruitment, onboarding, performance, skills, attrition and policies — and reasons
**across** those domains with AI so HR leaders know what's happening in their workforce and exactly
what to do next.

It ships as two fully-separated workspaces:

| Workspace | Who it's for | Route prefix |
| --- | --- | --- |
| **HR Workspace** | HR admins & managers | `/hr/*` |
| **Employee Workspace** | Individual employees (self-service) | `/employee/*` |

Every AI feature is backed by **real live data** (Supabase/PostgreSQL) and **real AI model calls**
(Gemini by default, with automatic multi-provider failover) — nothing is hardcoded or canned.

---

## Table of contents

- [What the project does](#what-the-project-does)
- [Core features](#core-features)
- [How the AI thinks](#how-the-ai-thinks)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [Seeded demo data](#seeded-demo-data)
- [Scripts](#scripts)
- [AI provider configuration](#ai-provider-configuration)
- [Database, RLS & privacy](#database-rls--privacy)
- [Verification](#verification)
- [Deployment](#deployment)

---

## What the project does

WorkforceIQ turns raw HR data into an **explainable, actionable AI narrative** about your workforce.

- **Understand** — one live command center: workforce health score, headcount & attendance trends,
  department composition, goal completion, performance trajectories, skill coverage and the
  recruitment funnel.
- **Predict** — per-employee attrition risk with the specific drivers behind it (declining
  attendance, falling review ratings, negative feedback, lagging goals), plus per-department risk
  trends.
- **Discover** — a skills catalog where every skill in the org is benchmarked against what roles
  actually require, exposing coverage gaps and candidates to fill them.
- **Empower** — employees get their own analysis: performance coaching, skill plans, learning
  recommendations, career paths, adaptive onboarding and a goal manager.

The system is deliberately **privacy-first**: RLS ensures employees only ever read data linked to
their own profile, and the AI is instructed to ignore protected characteristics entirely.

---

## Core features

### HR workspace (`/hr/*`)

| Feature | What it does |
| --- | --- |
| **AI Workforce Command Center** (`/hr/dashboard`) | Live pulse of the workforce: synthesized **Workforce Health Score** (0–100 across risk, attendance, performance, goals, skills, onboarding, recruitment), Top Risks & Top Opportunities from the AI briefing, an **AI Actions** panel that generates on-demand retention plans and per-department manager actions, plus KPI stats and trend charts. |
| **AI Workforce Copilot** (`/hr/copilot`) | Ask questions in plain English ("Which departments carry the highest attrition risk?", "Who should we shortlist for the backend role?", "What drives the attendance decline in Engineering?"). The copilot classifies intent, pulls the **specific** data needed, and returns a structured answer — with evidence, reasoning, recommended actions, confidence and clickable links straight to the relevant profile or candidate. |
| **Workforce Brief** | One-click AI briefing of the whole workforce, persisted to the `ai_insights` store with every insight carrying evidence + reasoning + severity + confidence. |
| **Recruitment** (`/hr/recruitment`) | Jobs, a pipeline board with stage counts, candidate cards with AI-generated assessments (match score, strengths, missing requirements, interview focus), candidate comparison, AI interview question sets and interview evaluation aggregation. |
| **Employees** (`/hr/employees`) | Searchable directory with per-employee AI analysis dialogs (strengths, risk signals, recommended actions). |
| **Attrition** (`/hr/attrition`) | AI analysis of organizational risk: per-department drill-downs, risk drivers and mitigation actions. |
| **Workforce Overview** (`/hr/workforce`) | People-level table of risk score, risk level, latest rating, attendance and the signals driving them; at-a-glance panels for high-risk employees and onboarding plans that need help. |
| **Performance** (`/hr/performance`) | AI analysis combining review ratings, attendance patterns and goal progress into manager action plans. |
| **Skills** (`/hr/skills`) | Skill graph with coverage per skill vs requirements, top gaps, and AI-generated upskilling plans. |
| **Onboarding** (`/hr/onboarding`) | Phase/task-level onboarding view; AI intervention suggestions for overdue and blocked plans. |
| **Policies** (`/hr/policies`) | Policy documents with **retrieval-grounded AI Q&A** (answers cite the source document). |
| **Reports** (`/hr/reports`) | Consolidates the health score, executive summary, attrition-by-department, top risk employees, skill gaps, recruitment funnel and onboarding health into one report, with a "How WorkforceIQ Thinks" method section. |

### Employee workspace (`/employee/*`)

| Feature | What it does |
| --- | --- |
| **Employee dashboard** | Personal overview with an AI employee briefing, goals, KPIs and upcoming tasks. |
| **Profile** | The signed-in employee's own details (reads only RLS-visible rows for their profile). |
| **Performance** | Performance coach that turns your reviews, attendance and goals into coaching advice. |
| **Goals** | Goal manager with AI writing assistance. |
| **Skills** | Personal skill list with AI development plan. |
| **Learning** | AI learning plan + recommended courses. |
| **Career** | AI career plan and trajectories. |
| **Onboarding** | Adaptive onboarding assistant tuned to your own plan's status. |
| **Policies** | Your own copy of the policy library with AI Q&A. |

---

## How the AI thinks

Every AI insight in WorkforceIQ passes through the same 5-stage pipeline:

```
Multiple HR Data Sources → AI Signal Detection → Cross-Source Reasoning → Explainable Insights → Recommended Actions
```

1. **Multiple HR Data Sources** — Recruitment, onboarding, performance, goals, skills, attendance and
   policies live in one connected PostgreSQL model.
2. **AI Signal Detection** — each domain is analysed independently by a structured-output model call.
3. **Cross-Source Reasoning** — signals are combined so insights reflect the compound nature of risk
   (e.g. falling attendance + a dropped review rating + negative feedback → elevated attrition risk).
4. **Explainable Insights** — every insight carries `evidence`, `reasoning`, a `severity` level and a
   `confidence` score. Nothing is a black box.
5. **Recommended Actions** — insights finish with concrete, entity-targeted next steps
   (employee / team / department / recruiter).

Mechanics worth knowing:

- **Strict JSON contracts** — every model call passes a `responseSchema` and the output is normalized
  and validated in `lib/ai/schemas.ts` so malformed model output can never reach the UI.
- **Multi-provider failover router** (`lib/ai/router.ts`) — tries Gemini first, then falls back to
  OpenRouter, Groq and Mistral when a provider is unavailable (rate limit, timeout, dropped key).
  Only providers with an API key configured are attempted.
- **Guardrails in the system prompt** — the model is instructed to reason only over the supplied
  data, never to fabricate names or numbers, to frame estimates probabilistically and to ignore all
  protected characteristics.
- **Persistence** — generated briefings, retention plans, manager actions and employee/candidate
  analyses are stored in the `ai_insights` table so the UI can prove real records were created.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js **16.3.5** (App Router, Turbopack, TypeScript strict) |
| UI | React 19, Tailwind CSS v4, Radix UI primitives, Recharts |
| Database & auth | Supabase (PostgreSQL, row-level security, storage, email auth) |
| AI | Google Gemini (primary) with OpenRouter / Groq / Mistral failover (`@google/generative-ai`) |
| PDF parsing | `pdf-parse` (resume ingestion) |

---

## Project structure

```
app/
  page.tsx                 # Marketing landing (hero, capabilities, "How WorkforceIQ Thinks")
  hr/                      # HR workspace: dashboard, recruitment, employees, attrition,
                           #   workforce, performance, skills, onboarding, policies, reports, copilot
  employee/                # Employee workspace: dashboard, profile, goals, learning,
                           #   performance, skills, career, onboarding, policies
  api/health               # Health check (reports configured AI providers)
components/
  ui/                      # Design-system primitives (button, card, badge, dialog, …)
  layout/                  # App shell, navigation, logo
  hr/                      # HR features: charts, panels, copilot workspace, AI shared UI
  employee/                # Employee features: goals, skills, learning, performance, onboarding
lib/
  ai/                      # All AI code:
    router.ts              #   multi-provider failover router
    gemini.ts / openai-compatible.ts / json.ts   # provider adapters
    schemas.ts             #   JSON output contracts + normalizers
    briefing.ts            #   workforce data package + AI briefing + health score
    copilot.ts             #   intent classification → targeted data → structured answers
    command.ts             #   retention plans and manager-action generation
    features.ts            #   per-page analyses (attrition, performance, skills, …)
    store.ts               #   ai_insights persistence
    actions.ts             #   server actions (guarded, HR-only where required)
  hr/                      # HR data layer (analytics, recruitment, skills, onboarding…)
  employee/                # Employee data layer (RLS-scoped reads per signed-in user)
  auth/                    # Auth + workspace routing helpers
  supabase/                # Browser/server Supabase clients
supabase/
  migrations/0001..0006.sql  # schema (29 tables), RLS, recruitment, onboarding, policies, interviews
  scripts/*.mjs             # seeders (demo users, workforce, AI support, confirm)
  seed.sql                  # departments, roles, skills, training catalog, starter policies
types/index.ts            # shared domain types
```

---

## Prerequisites

- **Node.js 20+** (the seed scripts use `--env-file`, available since Node 20.6)
- A **Supabase project** (free tier works) — dashboard at https://supabase.com
- A **Gemini API key** from Google AI Studio (free tier available). If you have none, the other
  providers can be used instead — see [AI provider configuration](#ai-provider-configuration).

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Then fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` and at least one AI key (see `.env.example` for details).

### 3. Set up the database

In the Supabase dashboard (**SQL Editor → New query → paste → Run**), run the migrations **in order**:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_recruitment.sql`
4. `supabase/migrations/0004_onboarding_tasks_blocked.sql`
5. `supabase/migrations/0005_policy_reasoning_agent.sql`
6. `supabase/migrations/0006_interview_agent.sql`

If any migration creates new tables/columns after the schema cache was built, refresh it:

```sql
notify pgrst, 'reload schema';
```

Then apply the base seed data (`departments`, `roles`, `skills`, `training catalog`, `policies`):

- paste `supabase/seed.sql` into the SQL Editor and run it.

### 4. Seed demo users

```bash
npm run seed
```

This creates confirmed auth users with profiles + employee records (see
[Demo accounts](#demo-accounts)).

### 5. Seed the workforce (recommended for the demo experience)

```bash
npm run seed:workforce   # ~100 employees across departments with consistent HR data
npm run seed:ai          # policy documents + interview question sets & evaluations
npm run confirm:workforce
```

The seeder is idempotent — re-running it upserts the same deterministic rows instead of duplicating
them. After seeding, every dashboard, chart and AI feature has real Supabase data to reason over.

### 6. Run the app

```bash
npm run dev
```

Open http://localhost:3000. Watch the console for the AI provider health summary.
Run `curl http://localhost:3000/api/health` (or open it in the browser) to see which providers are on.

> **Note:** the app also runs without any API keys — features render honest "not configured"
> placeholder states instead of pretending to work.

---

## Demo accounts

| Role | Email | Password | Workspace |
| --- | --- | --- | --- |
| HR admin | `hr@workforceiq.demo` | `WorkforceIQ-HR-2026!` | `/hr/*` |
| HR manager | `hr.manager@workforceiq.demo` | `WorkforceIQ-HR-2026!` | `/hr/*` |
| Employee (Engineering) | `employee@workforceiq.demo` | `WorkforceIQ-EMP-2026!` | `/employee/*` |

---

## Seeded demo data

Everything is **realistic but synthetic**, created so every AI feature has believable data to reason
over:

- **Base seed** (`seed.sql`): 8 departments, 12 job roles, skills catalog, training catalog, starter
  policy documents.
- **Workforce seed** (`seed:workforce`): ~100 employees with internally-consistent data across risk
  scores, performance reviews, goals, attendance records, feedback and employee skills. The seed
  deliberately embeds a story the AI can find — e.g. an Engineering cohort with rising attrition
  risk, declining goal completion, increased attendance variability and concentrated negative
  feedback. Asking the copilot questions will surface exactly these patterns.
- **AI support seed** (`seed:ai`): policy documents with chunks (for retrieval-grounded Q&A) and
  interview question sets with submitted evaluations (so the AI evaluation feature has real data).

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint over the codebase |
| `npm run seed` | Create/update the 3 demo auth users + profiles + employee rows |
| `npm run seed:workforce` | Seed ~100 employees with driven HR signals |
| `npm run seed:ai` | Seed policy documents and interview records |
| `npm run confirm:workforce` | Confirm emails for the seeded employee accounts |

`supabase/scripts/wipe-workforce.mjs` is available (not wired to npm) to clear seeded workforce rows
if you need a clean slate.

---

## AI provider configuration

The router selects providers in `AI_PROVIDER_ORDER` and skips any with no API key set.

```env
GEMINI_API_KEY=              # primary (gemini-2.5-flash / gemini-flash-latest)
OPENROUTER_API_KEY=          # free models, text-only
GROQ_API_KEY=                # free tier models
MISTRAL_API_KEY=             # free tier models
AI_PROVIDER_ORDER=gemini,openrouter,groq,mistral
AI_PROVIDER_COOLDOWN_MS=5000 # provider skip window after an outage-class failure
```

If only `GROQ_API_KEY` is set, Groq is used for everything. If the top provider starts failing
mid-request, the router transparently falls back instead of breaking the feature.

---

## Database, RLS & privacy

- **29 application tables** (employees, profiles, departments, roles, jobs, candidates, interviews,
  skills, employee_skills, onboarding_plans/tasks, performance_reviews, goals, attendance, feedback,
  risk_scores, policies, ai_insights, and more), all with UUID PKs, FKs, check constraints and
  `updated_at` triggers.
- **Row Level Security is the privacy backbone**: an employee can only `SELECT` their own profile,
  goals, skills, etc. (via `current_employee_id()`), while HR roles get the appropriate scope.
  Employee-facing reads are filtered **in the database**, never by hiding things in the UI.
- AI reasoning about people is instructed to ignore protected characteristics (gender, age, race,
  religion, family status, disability, nationality).
- The `ai_insights` table is a first-class store: generated briefings, retention plans, manager
  actions and analyses are persisted with category, severity, evidence, reasoning, confidence and
  affected entities.

---

## Verification

```bash
npx tsc --noEmit   # full TypeScript typecheck (strict)
npm run lint       # ESLint (0 errors, 0 warnings expected)
npm run build      # production build (includes both of the above)
```

---

## Deployment

WorkforceIQ deploys anywhere Next.js runs (Vercel, a Node server, Docker, etc.).

1. Set all `NEXT_PUBLIC_*` and server-side env vars from `.env.example` in the host's environment.
2. Apply migrations `0001`–`0006` + `seed.sql` to the production Supabase project (`notify pgrst, 'reload schema';` after).
3. Run the seed scripts (`npm run seed`, optionally `seed:workforce`, `seed:ai`) against the
   production database.
4. Build with `npm run build` and start with `npm run start`.

> Back-end AI calls and privileged DB access (service role) run exclusively on the server — never
> expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

---

## Legal / disclaimer

WorkforceIQ is a demonstration platform. AI-generated insights and recommendations are estimates
derived from data — they are not guarantees and should be reviewed by HR before acting.