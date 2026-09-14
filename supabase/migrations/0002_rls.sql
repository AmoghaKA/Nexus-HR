-- ---------------------------------------------------------------------------
-- Nexus HR — Row Level Security, views, storage, grants (migration 0002)
-- ---------------------------------------------------------------------------
-- Run AFTER 0001_schema.sql. Everything here depends on the helper functions
-- and tables created in 0001.
--
-- Conventions:
--   * every table has RLS enabled
--   * "own data" rows are filtered with current_employee_id() → the employee
--     row linked to the signed-in user's profile
--   * HR workspace access uses is_hr() (hr_admin + hr_manager)
--   * destructive admin-only writes use is_hr_admin()
--   * salaries only leave the `employees` table through the `employees_public`
--     security-invoker view, which never exposes salary_band
-- ---------------------------------------------------------------------------

begin;

-- ===========================================================================
-- profiles
-- ===========================================================================
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_hr" on public.profiles
  for select using (id = auth.uid() or is_hr());

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own_or_hr" on public.profiles
  for update using (id = auth.uid() or is_hr())
  with check ((id = auth.uid() and role = 'employee') or is_hr());
-- employees may edit their own row but can never escalate their role.

-- ===========================================================================
-- departments / roles / skills (HR-managed catalogs)
-- ===========================================================================
alter table public.departments enable row level security;
create policy "departments_select_authenticated" on public.departments
  for select to authenticated using (true);
create policy "departments_write_hr_admin" on public.departments
  for all to authenticated using (is_hr_admin()) with check (is_hr_admin());

alter table public.roles enable row level security;
create policy "roles_select_authenticated" on public.roles
  for select to authenticated using (true);
create policy "roles_write_hr_admin" on public.roles
  for all to authenticated using (is_hr_admin()) with check (is_hr_admin());

alter table public.skills enable row level security;
create policy "skills_select_authenticated" on public.skills
  for select to authenticated using (true);
create policy "skills_write_hr_admin" on public.skills
  for all to authenticated using (is_hr_admin()) with check (is_hr_admin());

-- ===========================================================================
-- employees
-- ===========================================================================
alter table public.employees enable row level security;

create policy "employees_select_own_or_hr" on public.employees
  for select using (profile_id = auth.uid() or is_hr());

create policy "employees_insert_hr" on public.employees
  for insert to authenticated with check (is_hr());

create policy "employees_update_hr" on public.employees
  for update to authenticated using (is_hr()) with check (is_hr());

-- employees_public: the ONLY safe read path for non-HR roles. Security-invoker
-- means the caller's RLS still applies to the underlying tables, and salary_band
-- is never projected.
create or replace view public.employees_public
with (security_invoker = true) as
select
  e.id, e.profile_id, e.employee_code, e.department_id, e.role_id, e.manager_id,
  e.date_of_joining, e.employment_status, e.location, e.experience_years,
  p.full_name, p.email, p.avatar_url,
  d.name as department_name,
  r.title as role_title
from public.employees e
join public.profiles p on p.id = e.profile_id
left join public.departments d on d.id = e.department_id
left join public.roles r on r.id = e.role_id;

-- ===========================================================================
-- employee_skills
-- ===========================================================================
alter table public.employee_skills enable row level security;

create policy "employee_skills_select_own_or_hr" on public.employee_skills
  for select using (employee_id = current_employee_id() or is_hr());
create policy "employee_skills_insert_own_or_hr" on public.employee_skills
  for insert to authenticated with check (employee_id = current_employee_id() or is_hr());
create policy "employee_skills_update_own_or_hr" on public.employee_skills
  for update to authenticated using (employee_id = current_employee_id() or is_hr()) with check (employee_id = current_employee_id() or is_hr());
create policy "employee_skills_delete_own_or_hr" on public.employee_skills
  for delete to authenticated using (employee_id = current_employee_id() or is_hr());

-- ===========================================================================
-- recruitment: jobs / candidates / candidate_skills / resumes / interviews
-- ===========================================================================
alter table public.jobs enable row level security;
create policy "jobs_select_authenticated" on public.jobs
  for select to authenticated using (true);
create policy "jobs_write_hr" on public.jobs
  for all to authenticated using (is_hr()) with check (is_hr());

alter table public.candidates enable row level security;
create policy "candidates_select_hr" on public.candidates
  for select to authenticated using (is_hr());
create policy "candidates_insert_hr" on public.candidates
  for insert to authenticated with check (is_hr());
create policy "candidates_update_hr" on public.candidates
  for update to authenticated using (is_hr()) with check (is_hr());

alter table public.candidate_skills enable row level security;
create policy "candidate_skills_select_hr" on public.candidate_skills
  for select to authenticated using (is_hr());
create policy "candidate_skills_write_hr" on public.candidate_skills
  for all to authenticated using (is_hr()) with check (is_hr());

alter table public.resumes enable row level security;
create policy "resumes_select_hr" on public.resumes
  for select to authenticated using (is_hr());
create policy "resumes_write_hr" on public.resumes
  for all to authenticated using (is_hr()) with check (is_hr());

alter table public.interviews enable row level security;
create policy "interviews_select_hr" on public.interviews
  for select to authenticated using (is_hr());
create policy "interviews_write_hr" on public.interviews
  for all to authenticated using (is_hr()) with check (is_hr());

alter table public.interview_questions enable row level security;
create policy "interview_questions_select_hr" on public.interview_questions
  for select to authenticated using (is_hr());
create policy "interview_questions_write_hr" on public.interview_questions
  for all to authenticated using (is_hr()) with check (is_hr());

alter table public.interview_evaluations enable row level security;
create policy "interview_evaluations_select_hr" on public.interview_evaluations
  for select to authenticated using (is_hr());
create policy "interview_evaluations_write_hr" on public.interview_evaluations
  for all to authenticated using (is_hr()) with check (is_hr());

-- ===========================================================================
-- goals / goal_progress
-- ===========================================================================
alter table public.goals enable row level security;

create policy "goals_select_own_or_hr" on public.goals
  for select using (employee_id = current_employee_id() or is_hr());
create policy "goals_insert_own_or_hr" on public.goals
  for insert to authenticated with check (employee_id = current_employee_id() or is_hr());
create policy "goals_update_own_or_hr" on public.goals
  for update to authenticated using (employee_id = current_employee_id() or is_hr()) with check (employee_id = current_employee_id() or is_hr());
create policy "goals_delete_own_or_hr" on public.goals
  for delete to authenticated using (employee_id = current_employee_id() or is_hr());

alter table public.goal_progress enable row level security;

create policy "goal_progress_select_own_or_hr" on public.goal_progress
  for select using (
    goal_id in (select id from public.goals where employee_id = current_employee_id())
    or is_hr()
  );
create policy "goal_progress_insert_own_or_hr" on public.goal_progress
  for insert to authenticated with check (
    goal_id in (select id from public.goals where employee_id = current_employee_id())
    or is_hr()
  );
create policy "goal_progress_update_own_or_hr" on public.goal_progress
  for update to authenticated using (
    goal_id in (select id from public.goals where employee_id = current_employee_id())
    or is_hr()
  ) with check (
    goal_id in (select id from public.goals where employee_id = current_employee_id())
    or is_hr()
  );

-- ===========================================================================
-- performance_reviews / feedback
-- ===========================================================================
alter table public.performance_reviews enable row level security;

create policy "perf_reviews_select_own_reviewer_or_hr" on public.performance_reviews
  for select using (
    employee_id = current_employee_id() or reviewer_id = auth.uid() or is_hr()
  );
create policy "perf_reviews_insert_hr" on public.performance_reviews
  for insert to authenticated with check (is_hr());
create policy "perf_reviews_update_hr" on public.performance_reviews
  for update to authenticated using (is_hr()) with check (is_hr());

alter table public.feedback enable row level security;

create policy "feedback_select_own_or_hr" on public.feedback
  for select using (
    to_employee_id = current_employee_id() or from_user_id = auth.uid() or is_hr()
  );
create policy "feedback_insert_self_or_hr" on public.feedback
  for insert to authenticated with check (from_user_id = auth.uid() or is_hr());
create policy "feedback_update_hr" on public.feedback
  for update to authenticated using (is_hr()) with check (is_hr());

-- ===========================================================================
-- attendance / leave_requests
-- ===========================================================================
alter table public.attendance enable row level security;

create policy "attendance_select_own_or_hr" on public.attendance
  for select using (employee_id = current_employee_id() or is_hr());
create policy "attendance_write_hr" on public.attendance
  for all to authenticated using (is_hr()) with check (is_hr());

alter table public.leave_requests enable row level security;

create policy "leave_select_own_or_hr" on public.leave_requests
  for select using (employee_id = current_employee_id() or is_hr());
create policy "leave_insert_own" on public.leave_requests
  for insert to authenticated with check (employee_id = current_employee_id());
create policy "leave_update_own_or_hr" on public.leave_requests
  for update to authenticated using (employee_id = current_employee_id() or is_hr()) with check (employee_id = current_employee_id() or is_hr());
create policy "leave_delete_own_or_hr" on public.leave_requests
  for delete to authenticated using (employee_id = current_employee_id() or is_hr());

-- ===========================================================================
-- onboarding
-- ===========================================================================
alter table public.onboarding_plans enable row level security;

create policy "onboarding_plans_select_own_or_hr" on public.onboarding_plans
  for select using (employee_id = current_employee_id() or is_hr());
create policy "onboarding_plans_write_hr" on public.onboarding_plans
  for all to authenticated using (is_hr()) with check (is_hr());

alter table public.onboarding_tasks enable row level security;

create policy "onboarding_tasks_select_own_or_hr" on public.onboarding_tasks
  for select using (
    plan_id in (select id from public.onboarding_plans where employee_id = current_employee_id())
    or is_hr()
  );
create policy "onboarding_tasks_insert_hr" on public.onboarding_tasks
  for insert to authenticated with check (is_hr());
create policy "onboarding_tasks_update_own_or_hr" on public.onboarding_tasks
  for update to authenticated using (
    plan_id in (select id from public.onboarding_plans where employee_id = current_employee_id())
    or is_hr()
  ) with check (
    plan_id in (select id from public.onboarding_plans where employee_id = current_employee_id())
    or is_hr()
  );
create policy "onboarding_tasks_delete_hr" on public.onboarding_tasks
  for delete to authenticated using (is_hr());

-- ===========================================================================
-- training
-- ===========================================================================
alter table public.training_courses enable row level security;
create policy "courses_select_authenticated" on public.training_courses
  for select to authenticated using (true);
create policy "courses_write_hr_admin" on public.training_courses
  for all to authenticated using (is_hr_admin()) with check (is_hr_admin());

alter table public.employee_training enable row level security;

create policy "employee_training_select_own_or_hr" on public.employee_training
  for select using (employee_id = current_employee_id() or is_hr());
create policy "employee_training_insert_own_or_hr" on public.employee_training
  for insert to authenticated with check (employee_id = current_employee_id() or is_hr());
create policy "employee_training_update_own_or_hr" on public.employee_training
  for update to authenticated using (employee_id = current_employee_id() or is_hr()) with check (employee_id = current_employee_id() or is_hr());
create policy "employee_training_delete_own_or_hr" on public.employee_training
  for delete to authenticated using (employee_id = current_employee_id() or is_hr());

-- ===========================================================================
-- policies / policy_chunks
-- ===========================================================================
alter table public.policies enable row level security;
create policy "policies_select_authenticated" on public.policies
  for select to authenticated using (true);
create policy "policies_write_hr_admin" on public.policies
  for all to authenticated using (is_hr_admin()) with check (is_hr_admin());

alter table public.policy_chunks enable row level security;
create policy "policy_chunks_select_authenticated" on public.policy_chunks
  for select to authenticated using (true);
create policy "policy_chunks_write_hr_admin" on public.policy_chunks
  for all to authenticated using (is_hr_admin()) with check (is_hr_admin());

-- ===========================================================================
-- risk_scores / ai_insights / notifications / audit_logs
-- ===========================================================================
alter table public.risk_scores enable row level security;

create policy "risk_scores_select_own_or_hr" on public.risk_scores
  for select using (employee_id = current_employee_id() or is_hr());
create policy "risk_scores_write_hr" on public.risk_scores
  for all to authenticated using (is_hr()) with check (is_hr());
create policy "risk_scores_delete_hr_admin" on public.risk_scores
  for delete to authenticated using (is_hr_admin());

alter table public.ai_insights enable row level security;

create policy "ai_insights_select_own_or_hr" on public.ai_insights
  for select using (
    employee_id is null or employee_id = current_employee_id() or is_hr()
  );
create policy "ai_insights_write_hr_or_self" on public.ai_insights
  for all to authenticated using (is_hr() or employee_id = current_employee_id()) with check (is_hr() or employee_id = current_employee_id());

alter table public.notifications enable row level security;

create policy "notifications_select_own_or_hr" on public.notifications
  for select using (recipient_id = auth.uid() or is_hr());
create policy "notifications_update_own_or_hr" on public.notifications
  for update to authenticated using (recipient_id = auth.uid() or is_hr()) with check (recipient_id = auth.uid() or is_hr());
create policy "notifications_insert_hr" on public.notifications
  for insert to authenticated with check (is_hr());

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_hr_admin" on public.audit_logs
  for select to authenticated using (is_hr_admin());
create policy "audit_logs_insert_authenticated" on public.audit_logs
  for insert to authenticated with check (user_id = auth.uid());
-- audit rows are append-only; no update/delete policies.

-- ===========================================================================
-- Storage buckets + objects policies
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5 * 1024 * 1024, array['image/png', 'image/jpeg', 'image/webp']),
  ('resumes', 'resumes', false, 10 * 1024 * 1024, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('policies', 'policies', false, 25 * 1024 * 1024, array['application/pdf', 'text/plain', 'text/markdown'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- avatars: public read; owner write
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and owner = auth.uid());
create policy "avatars_owner_update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and owner = auth.uid()) with check (bucket_id = 'avatars' and owner = auth.uid());
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and owner = auth.uid());

-- resumes: owner uploads/reads own; HR reads all
create policy "resumes_owner_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'resumes' and owner = auth.uid());
create policy "resumes_owner_select" on storage.objects
  for select to authenticated using (bucket_id = 'resumes' and owner = auth.uid());
create policy "resumes_hr_select" on storage.objects
  for select to authenticated using (bucket_id = 'resumes' and is_hr());

-- policies: authenticated reads; hr_admin writes
create policy "policies_storage_read" on storage.objects
  for select to authenticated using (bucket_id = 'policies');
create policy "policies_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'policies' and is_hr_admin());
create policy "policies_storage_update" on storage.objects
  for update to authenticated using (bucket_id = 'policies' and is_hr_admin()) with check (bucket_id = 'policies' and is_hr_admin());
create policy "policies_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'policies' and is_hr_admin());

-- ===========================================================================
-- Grants (idempotent)
-- ===========================================================================
grant usage on schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

grant select on all sequences in schema public to authenticated;

grant select on public.employees_public to authenticated;

commit;