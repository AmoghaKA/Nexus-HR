# Nexus HR — Supabase backend

Nexus HR runs entirely on Supabase: **PostgreSQL** (schema + Row Level
Security), **Auth** (email/password), and **Storage** (resumes, policies,
avatars). No other database is used.

## Roles

| Role         | Workspace                          | Capabilities (RLS)                 |
| ------------ | ---------------------------------- | ---------------------------------- |
| `hr_admin`   | `/hr/dashboard`                    | Full HR access, catalog writes, audit reads, storage admin for policies |
| `hr_manager` | `/hr/dashboard`                    | Full HR access, no destructive catalog/storage admin |
| `employee`   | `/employee/dashboard`              | Own profile, goals, skills, leave, attendance, training, policies, AI insights |

> Routing maps both `hr_admin` and `hr_manager` to the HR workspace. Legacy
> `"hr"` values in `app_metadata.role` are still tolerated.

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable                       | Required        | Who can see it  |
| ------------------------------ | --------------- | --------------- |
| `NEXT_PUBLIC_SUPABASE_URL`     | yes             | browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| yes             | browser + server |
| `SUPABASE_SERVICE_ROLE_KEY`    | seed + server   | server ONLY     |
| `QWEN_API_KEY`             | AI features     | server ONLY     |
| `GEMINI_API_KEY`           | AI fallback     | server ONLY     |

The app still boots without env vars and shows honest "not configured" states.

## Setup

1. **Apply migrations** — Supabase dashboard → SQL Editor. Paste and run in
   order:
   - `migrations/0001_schema.sql` — helper functions, all tables, indexes,
     `updated_at` trigger, auth-signup trigger that mirrors new users into
     `profiles`.
   - `migrations/0002_rls.sql` — enables RLS on every table, defines policies,
     the salary-safe `employees_public` security-invoker view, storage buckets
     and object policies, and object/sequence/function grants.
2. **Seed reference data** — paste and run `seed.sql` (departments, job roles,
   skills, training catalog, policies + chunks). It is idempotent.
3. **Create demo users** — from the repo root:
   ```
   npm install
   npm run seed
   ```
   This creates (or updates) confirmed auth users plus `profiles` and
   `employees` rows via the **service role key**:

   | Email                        | Password                | Role        |
   | ---------------------------- | ----------------------- | ----------- |
   | `hr@nexushr.demo`        | `NexusHR-HR-2026!`  | `hr_admin`  |
   | `hr.manager@nexushr.demo`| `NexusHR-HR-2026!`  | `hr_manager`|
   | `employee@nexushr.demo`  | `NexusHR-EMP-2026!` | `employee`  |

## Schema

29 tables with UUID primary keys and FKs:

`profiles`, `employees`, `departments`, `roles`, `skills`, `employee_skills`,
`jobs`, `candidates`, `candidate_skills`, `resumes`, `interviews`,
`interview_questions`, `interview_evaluations`, `goals`, `goal_progress`,
`performance_reviews`, `feedback`, `attendance`, `leave_requests`,
`onboarding_plans`, `onboarding_tasks`, `training_courses`,
`employee_training`, `policies`, `policy_chunks`, `risk_scores`, `ai_insights`,
`notifications`, `audit_logs`.

Key points:

- Every table has `created_at` (+ `updated_at` where mutable) maintained by
  triggers.
- Text-mapped status/enums are guarded by `CHECK` constraints (e.g.
  `profiles.role`, `leave_requests.type`).
- Hot query paths are indexed (FK columns, statuses, dates, unique business
  keys).
- A signup trigger (`on_auth_user_created`) inserts a `profiles` row for every
  new auth user; role defaults to `employee` unless the signup metadata carries
  `role=hr`/`hr_admin`/`hr_manager`.
- `employees.salary_band` is **never readable by employees** — it is excluded
  from the `employees_public` security-invoker view, and the base table's RLS
  only allows HR to see that column's row.

## Row Level Security

- `public.current_role()`, `public.is_hr()`, `public.is_hr_admin()`, and
  `public.current_employee_id()` are `security definer` helpers used inside
  policies (owned by the migration runner, so no policy recursion on
  `profiles`).
- **Own-data pattern**: employees see exactly the rows where
  `employee_id = current_employee_id()` (goals, skills, leave, attendance,
  training, risk scores, AI insights) or `recipient_id = auth.uid()`
  (notifications) or `id = auth.uid()` (profiles).
- **HR pattern**: `is_hr()` (both HR roles) reads/writes the full HR domain;
  `is_hr_admin()` is reserved for catalog/storage/audit writes.
- Recruitment (candidates, resumes, interviews, evaluations) is HR-only.
- `audit_logs` is append-only for authenticated users and selectable only by
  `hr_admin`.
- The proxy (`proxy.ts`) additionally enforces workspace routing:
  `hr_admin`/`hr_manager` → `/hr/*`, `employee` → `/employee/*`; signed-out
  users are redirected to `/login`.

## Storage buckets

| Bucket    | Public | Access policy                                                       |
| --------- | ------ | ------------------------------------------------------------------- |
| `avatars` | yes    | authenticated read; owner inserts/updates/deletes own files          |
| `resumes` | no     | owner uploads/reads own; HR reads all                                |
| `policies`| no     | authenticated reads; `hr_admin` writes                               |

## Verification checklist

1. `npm run build` and `npm run lint` pass.
2. Sign in as `employee@nexushr.demo` → lands on `/employee/dashboard`;
   `/hr/*` redirects away.
3. Sign in as `hr@nexushr.demo` → lands on `/hr/dashboard`; can read all
   `employees`, `profiles`, recruitment rows; `/employee/*` redirects away.
4. As employee, `select salary_band from employees` returns nothing (RLS
   blocks non-own rows and the view excludes the column).
5. Storage: employee can upload a resume to `resumes/<own-folder>`, HR can read
   it, employee cannot read HR folders.
6. Sign out returns the session to `/login` and protected routes redirect there.