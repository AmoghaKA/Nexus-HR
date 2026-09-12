-- ---------------------------------------------------------------------------
-- WorkforceIQ — database schema (migration 0001)
-- ---------------------------------------------------------------------------
-- Run this file in the Supabase dashboard (SQL Editor → New query → paste →
-- Run). Supabase ships with uuid generation (`gen_random_uuid()`), `auth.uid()`
-- and `auth.role()` helpers, so no extra extensions are required.
--
-- This migration creates:
--   * RLS helper functions (current_role, is_hr, is_hr_admin, current_employee_id)
--   * all 29 application tables (UUID PKs, FKs, check constraints, timestamps)
--   * indexes on hot query paths
--   * an `updated_at` trigger for every table that tracks it
--
-- 0002_rls.sql adds Row Level Security, storage buckets, and grants.
-- ---------------------------------------------------------------------------

begin;

-- RLS helper functions are defined AFTER the tables they reference (below).

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auth/signup trigger: mirror a new auth user into `profiles`
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'role' = 'hr' then 'hr_admin'
      when new.raw_user_meta_data ->> 'role' = 'hr_admin' then 'hr_admin'
      when new.raw_user_meta_data ->> 'role' = 'hr_manager' then 'hr_manager'
      else 'employee'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  avatar_url  text,
  role        text not null default 'employee'
              check (role in ('hr_admin', 'hr_manager', 'employee')),
  employee_id uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- roles (job roles / positions)
-- ---------------------------------------------------------------------------
create table if not exists public.roles (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  code          text not null unique,
  department_id uuid references public.departments (id) on delete set null,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null unique references public.profiles (id) on delete cascade,
  employee_code     text not null unique,
  department_id     uuid references public.departments (id) on delete set null,
  role_id           uuid references public.roles (id) on delete set null,
  manager_id        uuid references public.employees (id) on delete set null,
  date_of_joining   date,
  employment_status text not null default 'active'
                    check (employment_status in ('active', 'probation', 'on_leave', 'terminated', 'resigned')),
  location          text,
  experience_years  numeric(4, 1) default 0 check (experience_years >= 0),
  salary_band       text, -- never exposed to employees (see employees_public view)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS helper functions (security definer → behave like the table owner even
-- from inside policies; defined after profiles/employees so the SQL bodies
-- resolve. Policies in 0002_rls.sql consume these.)
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_hr()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('hr_admin', 'hr_manager'),
    false
  )
$$;

create or replace function public.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'hr_admin',
    false
  )
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.employees where profile_id = auth.uid() limit 1
$$;

-- ---------------------------------------------------------------------------
-- skills / employee_skills
-- ---------------------------------------------------------------------------
create table if not exists public.skills (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.employee_skills (
  id                 uuid primary key default gen_random_uuid(),
  employee_id        uuid not null references public.employees (id) on delete cascade,
  skill_id           uuid not null references public.skills (id) on delete cascade,
  proficiency_level  text check (proficiency_level in ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience   numeric(4, 1) default 0 check (years_experience >= 0),
  is_verified        boolean not null default false,
  verified_by        uuid references public.employees (id) on delete set null,
  verified_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (employee_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- jobs / candidates / candidate_skills / resumes / interviews
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  department_id     uuid references public.departments (id) on delete set null,
  hiring_manager_id uuid references public.employees (id) on delete set null,
  status            text not null default 'draft'
                    check (status in ('draft', 'published', 'closed', 'filled')),
  employment_type   text check (employment_type in ('full_time', 'part_time', 'contract', 'intern')),
  location          text,
  headcount         integer default 1 check (headcount >= 1),
  description       text,
  requirements      text,
  salary_band       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.candidates (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references public.jobs (id) on delete cascade,
  full_name   text not null,
  email       text not null,
  phone       text,
  status      text not null default 'new'
              check (status in ('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  source      text,
  applied_at  timestamptz not null default now(),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.candidate_skills (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  skill_id     uuid not null references public.skills (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (candidate_id, skill_id)
);

create table if not exists public.resumes (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  file_path    text not null,
  file_name    text not null,
  file_type    text,
  file_size    bigint,
  content_text text,
  uploaded_by  uuid references public.profiles (id) on delete set null,
  uploaded_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.interviews (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references public.jobs (id) on delete cascade,
  candidate_id  uuid not null references public.candidates (id) on delete cascade,
  interviewer_id uuid references public.employees (id) on delete set null,
  interview_type text check (interview_type in ('phone', 'video', 'onsite', 'panel')),
  status        text not null default 'scheduled'
                check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  scheduled_at  timestamptz,
  meeting_link  text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.interview_questions (
  id           uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews (id) on delete cascade,
  title        text,
  question     text not null,
  order_index  integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.interview_evaluations (
  id            uuid primary key default gen_random_uuid(),
  interview_id  uuid not null references public.interviews (id) on delete cascade,
  interviewer_id uuid references public.employees (id) on delete set null,
  skills_rating   integer check (skills_rating between 1 and 5),
  communication   integer check (communication between 1 and 5),
  overall_rating  integer check (overall_rating between 1 and 5),
  recommendation text check (recommendation in ('strong_no', 'no', 'maybe', 'yes', 'strong_yes')),
  notes         text,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- goals / goal_progress
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  title       text not null,
  description text,
  category    text check (category in ('career', 'performance', 'learning', 'personal', 'project')),
  status      text not null default 'draft'
              check (status in ('draft', 'active', 'completed', 'archived')),
  start_date  date,
  due_date    date,
  progress    smallint not null default 0 check (progress between 0 and 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.goal_progress (
  id               uuid primary key default gen_random_uuid(),
  goal_id          uuid not null references public.goals (id) on delete cascade,
  progress_percent smallint check (progress_percent between 0 and 100),
  comment          text,
  logged_by        uuid references public.profiles (id) on delete set null,
  logged_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- performance_reviews / feedback
-- ---------------------------------------------------------------------------
create table if not exists public.performance_reviews (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees (id) on delete cascade,
  reviewer_id   uuid references public.profiles (id) on delete set null,
  review_type   text check (review_type in ('annual', 'quarterly', 'probation', 'promotion', 'self')),
  status        text not null default 'draft'
                check (status in ('draft', 'submitted', 'acknowledged', 'closed')),
  period_start  date,
  period_end    date,
  rating        integer check (rating between 1 and 5),
  strengths     text,
  improvements  text,
  goals_next    text,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.feedback (
  id              uuid primary key default gen_random_uuid(),
  from_user_id    uuid references public.profiles (id) on delete set null,
  to_employee_id  uuid not null references public.employees (id) on delete cascade,
  category        text check (category in ('praise', 'constructive', 'peer', 'manager', 'engagement')),
  message         text not null,
  status          text not null default 'submitted'
                  check (status in ('draft', 'submitted', 'acknowledged')),
  visibility      text not null default 'private'
                  check (visibility in ('private', 'manager', 'public')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- attendance / leave_requests
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  date        date not null,
  status      text not null default 'present'
              check (status in ('present', 'absent', 'late', 'half_day', 'wfh', 'leave')),
  check_in    timestamptz,
  check_out   timestamptz,
  hours       numeric(4, 2) check (hours >= 0),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (employee_id, date)
);

create table if not exists public.leave_requests (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  type        text not null check (type in ('annual', 'sick', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other')),
  start_date  date not null,
  end_date    date not null,
  days        numeric(5, 1) not null default 1,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reason      text,
  approver_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ---------------------------------------------------------------------------
-- onboarding
-- ---------------------------------------------------------------------------
create table if not exists public.onboarding_plans (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  title       text not null,
  status      text not null default 'draft'
              check (status in ('draft', 'in_progress', 'completed')),
  start_date  date,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.onboarding_tasks (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.onboarding_plans (id) on delete cascade,
  title       text not null,
  description text,
  assignee_id uuid references public.employees (id) on delete set null,
  status      text not null default 'pending'
              check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  due_date    date,
  completed_at timestamptz,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- training
-- ---------------------------------------------------------------------------
create table if not exists public.training_courses (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  code           text not null unique,
  description    text,
  category       text,
  difficulty     text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_hours numeric(6, 1) check (duration_hours >= 0),
  provider       text,
  is_mandatory   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.employee_training (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees (id) on delete cascade,
  course_id       uuid not null references public.training_courses (id) on delete cascade,
  status          text not null default 'not_started'
                  check (status in ('not_started', 'in_progress', 'completed', 'expired')),
  enrolled_at     timestamptz not null default now(),
  completed_at    timestamptz,
  score           numeric(5, 2),
  certificate_url text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (employee_id, course_id)
);

-- ---------------------------------------------------------------------------
-- policies / policy_chunks
-- ---------------------------------------------------------------------------
create table if not exists public.policies (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  slug       text not null unique,
  category   text check (category in ('hr', 'finance', 'it', 'security', 'conduct')),
  status     text not null default 'published'
             check (status in ('draft', 'published', 'archived')),
  version    integer not null default 1,
  content    text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.policy_chunks (
  id              uuid primary key default gen_random_uuid(),
  policy_id       uuid not null references public.policies (id) on delete cascade,
  chunk_index     integer not null,
  content         text not null,
  character_count integer default 0,
  created_at      timestamptz not null default now(),
  unique (policy_id, chunk_index)
);

-- ---------------------------------------------------------------------------
-- risk_scores / ai_insights / notifications / audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.risk_scores (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  period      date not null, -- first day of the month scored
  score       smallint check (score between 0 and 100),
  level       text check (level in ('low', 'medium', 'high', 'critical')),
  factors     jsonb not null default '{}',
  notes       text,
  generated_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (employee_id, period)
);

create table if not exists public.ai_insights (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees (id) on delete cascade, -- null = org-wide
  category    text,
  severity    text not null default 'info'
              check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  title       text not null,
  content     text not null,
  metadata    jsonb not null default '{}',
  is_read     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type         text not null,
  title        text not null,
  body         text,
  data         jsonb not null default '{}',
  is_read      boolean not null default false,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- indexes (FK + hot filter paths)
-- ---------------------------------------------------------------------------
create index if not exists idx_profiles_role        on public.profiles (role);
create index if not exists idx_profiles_employee_id on public.profiles (employee_id);

create index if not exists idx_employees_department_id on public.employees (department_id);
create index if not exists idx_employees_role_id        on public.employees (role_id);
create index if not exists idx_employees_manager_id     on public.employees (manager_id);
create index if not exists idx_employees_status         on public.employees (employment_status);

create index if not exists idx_roles_department_id on public.roles (department_id);
create index if not exists idx_skills_category     on public.skills (category);

create index if not exists idx_employee_skills_employee_id on public.employee_skills (employee_id);
create index if not exists idx_employee_skills_skill_id    on public.employee_skills (skill_id);

create index if not exists idx_jobs_department_id on public.jobs (department_id);
create index if not exists idx_jobs_status        on public.jobs (status);
create index if not exists idx_jobs_hiring_manager on public.jobs (hiring_manager_id);

create index if not exists idx_candidates_job_id  on public.candidates (job_id);
create index if not exists idx_candidates_email   on public.candidates (email);
create index if not exists idx_candidates_status  on public.candidates (status);

create index if not exists idx_candidate_skills_candidate_id on public.candidate_skills (candidate_id);
create index if not exists idx_candidate_skills_skill_id     on public.candidate_skills (skill_id);

create index if not exists idx_resumes_candidate_id on public.resumes (candidate_id);

create index if not exists idx_interviews_job_id         on public.interviews (job_id);
create index if not exists idx_interviews_candidate_id   on public.interviews (candidate_id);
create index if not exists idx_interviews_interviewer_id on public.interviews (interviewer_id);
create index if not exists idx_interviews_status         on public.interviews (status);
create index if not exists idx_interviews_scheduled_at   on public.interviews (scheduled_at);

create index if not exists idx_interview_questions_interview_id on public.interview_questions (interview_id);

create index if not exists idx_interview_evaluations_interview_id on public.interview_evaluations (interview_id);
create index if not exists idx_interview_evaluations_interviewer   on public.interview_evaluations (interviewer_id);

create index if not exists idx_goals_employee_id on public.goals (employee_id);
create index if not exists idx_goals_status      on public.goals (status);
create index if not exists idx_goals_due_date    on public.goals (due_date);

create index if not exists idx_goal_progress_goal_id on public.goal_progress (goal_id);
create index if not exists idx_goal_progress_logged  on public.goal_progress (logged_at);

create index if not exists idx_perf_reviews_employee_id on public.performance_reviews (employee_id);
create index if not exists idx_perf_reviews_reviewer_id on public.performance_reviews (reviewer_id);
create index if not exists idx_perf_reviews_status      on public.performance_reviews (status);

create index if not exists idx_feedback_to_employee   on public.feedback (to_employee_id);
create index if not exists idx_feedback_from_user     on public.feedback (from_user_id);
create index if not exists idx_feedback_status        on public.feedback (status);

create index if not exists idx_attendance_employee_id on public.attendance (employee_id);
create index if not exists idx_attendance_date        on public.attendance (date);

create index if not exists idx_leave_requests_employee_id on public.leave_requests (employee_id);
create index if not exists idx_leave_requests_status      on public.leave_requests (status);

create index if not exists idx_onboarding_plans_employee_id on public.onboarding_plans (employee_id);
create index if not exists idx_onboarding_plans_status      on public.onboarding_plans (status);

create index if not exists idx_onboarding_tasks_plan_id     on public.onboarding_tasks (plan_id);
create index if not exists idx_onboarding_tasks_assignee_id on public.onboarding_tasks (assignee_id);

create index if not exists idx_employee_training_employee_id on public.employee_training (employee_id);
create index if not exists idx_employee_training_course_id   on public.employee_training (course_id);

create index if not exists idx_policies_status on public.policies (status);

create index if not exists idx_policy_chunks_policy_id on public.policy_chunks (policy_id);

create index if not exists idx_risk_scores_employee_id on public.risk_scores (employee_id);

create index if not exists idx_ai_insights_employee_id on public.ai_insights (employee_id);
create index if not exists idx_ai_insights_created_at  on public.ai_insights (created_at);

create index if not exists idx_notifications_recipient_id on public.notifications (recipient_id);
create index if not exists idx_notifications_is_read      on public.notifications (is_read);

create index if not exists idx_audit_logs_user_id        on public.audit_logs (user_id);
create index if not exists idx_audit_logs_entity_type    on public.audit_logs (entity_type);
create index if not exists idx_audit_logs_created_at     on public.audit_logs (created_at);

-- ---------------------------------------------------------------------------
-- signup trigger + updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'departments', 'roles', 'employees', 'skills', 'employee_skills',
    'jobs', 'candidates', 'candidate_skills', 'resumes', 'interviews',
    'interview_questions', 'interview_evaluations', 'goals', 'performance_reviews',
    'feedback', 'attendance', 'leave_requests', 'onboarding_plans',
    'onboarding_tasks', 'training_courses', 'employee_training', 'policies',
    'ai_insights', 'notifications'
  ]
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = 'set_updated_at'
        and tgrelid = to_regclass('public.' || t)
    ) then
      execute format(
        'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        t
      );
    end if;
  end loop;
end $$;

commit;