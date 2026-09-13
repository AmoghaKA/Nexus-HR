-- ---------------------------------------------------------------------------
-- WorkforceIQ — Intelligent Interview Agent (migration 0006)
-- ---------------------------------------------------------------------------
-- Run this file in the Supabase dashboard (SQL Editor → New query → paste →
-- Run), then reload the schema cache with:  notify pgrst, 'reload schema';
--
-- Persists the end-to-end interview flow so interviewer work is not lost:
--
--   * jobs.interview_question_set   — the AI-generated, role-specific question
--                                     set produced by the Interview Setup flow
--                                     (sections across Technical / Behavioral /
--                                     Scenario, each question with follow-up
--                                     probes). Stored per role so every
--                                     interviewer works from the same set.
--   * interview_evaluation_rows     — per-question records captured during the
--                                     interview: the question asked, the
--                                     candidate's response, a 1-5 rating and
--                                     interviewer notes. This raw material is
--                                     what the AI insight is derived from.
--   * interviews.ai_insight         — the structured, advisory-only AI summary
--                                     (technical competency, communication,
--                                     problem solving, role fit, strengths,
--                                     concerns, evidence). It is insight, not a
--                                     decision — HR always makes the call.
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- jobs: persisted role-specific interview question set
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column if not exists interview_question_set jsonb;

-- ---------------------------------------------------------------------------
-- interviews: persisted advisory AI insight
-- ---------------------------------------------------------------------------
alter table public.interviews
  add column if not exists ai_insight jsonb;

-- ---------------------------------------------------------------------------
-- interview_evaluation_rows: per-question interview records
-- ---------------------------------------------------------------------------
create table if not exists public.interview_evaluation_rows (
  id                 uuid primary key default gen_random_uuid(),
  interview_id       uuid not null references public.interviews (id) on delete cascade,
  interviewer_id     uuid references public.employees (id) on delete set null,
  question           text not null,
  candidate_response text,
  rating             integer check (rating between 1 and 5),
  notes              text,
  created_at         timestamptz not null default now()
);

create index if not exists interview_evaluation_rows_interview_idx
  on public.interview_evaluation_rows (interview_id);

-- ---------------------------------------------------------------------------
-- RLS for interview_evaluation_rows (HR only, mirrors interviews)
-- ---------------------------------------------------------------------------
alter table public.interview_evaluation_rows enable row level security;

drop policy if exists "interview_evaluation_rows_select_hr" on public.interview_evaluation_rows;
drop policy if exists "interview_evaluation_rows_write_hr" on public.interview_evaluation_rows;

create policy "interview_evaluation_rows_select_hr" on public.interview_evaluation_rows
  for select to authenticated using (is_hr());
create policy "interview_evaluation_rows_write_hr" on public.interview_evaluation_rows
  for all to authenticated using (is_hr()) with check (is_hr());

grant select, insert, update, delete on public.interview_evaluation_rows to authenticated;

commit;