-- ---------------------------------------------------------------------------
-- Adaptive onboarding: allow tasks to be explicitly "blocked" so HR can flag
-- tasks the new hire cannot complete (e.g. waiting on laptop/access) and the
-- adaptive assessment can surface Blocked alongside Completed/Pending/Overdue.
-- ---------------------------------------------------------------------------

alter table public.onboarding_tasks
  drop constraint if exists onboarding_tasks_status_check,
  add constraint onboarding_tasks_status_check
    check (status in ('pending', 'in_progress', 'completed', 'skipped', 'blocked'));