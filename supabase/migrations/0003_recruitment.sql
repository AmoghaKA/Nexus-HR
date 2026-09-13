-- ---------------------------------------------------------------------------
-- WorkforceIQ — AI Recruitment Intelligence Engine (migration 0003)
-- ---------------------------------------------------------------------------
-- Run this file in the Supabase dashboard (SQL Editor → New query → paste →
-- Run). Wraps the jobs/candidates tables in the fields the Recruitment
-- Intelligence Engine needs and adds a persisted match-assessment table so
-- deterministic skill/experience scoring and Gemini reasoning are stored
-- alongside every candidate–job pairing.
--
--   * jobs       + required_skills / preferred_skills / experience /
--                 education / seniority
--   * candidates + structured resume-analysis fields and the new pipeline
--                 status model:
--                 applied → screening → interview → evaluation → shortlisted → hired
--   * candidate_assessments (must match the response contract in
--     lib/ai/schemas.ts -> CandidateMatch)
--   * resumes bucket widened to accept plain-text files for fast demo flows
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- jobs: explicit requirement definition
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column if not exists required_skills text,
  add column if not exists preferred_skills text,
  add column if not exists experience text,
  add column if not exists education text,
  add column if not exists seniority text;

-- ---------------------------------------------------------------------------
-- candidates: structured fields populated by Gemini resume analysis
-- ---------------------------------------------------------------------------
alter table public.candidates
  add column if not exists current_title text,
  add column if not exists summary text,
  add column if not exists experience_years numeric(4, 1) check (experience_years >= 0),
  add column if not exists education text,
  add column if not exists projects text,
  add column if not exists certifications text,
  add column if not exists relevant_experience text;

-- ---------------------------------------------------------------------------
-- candidates: new pipeline state model
-- applied → screening → interview → evaluation → shortlisted → hired
-- (rejected / withdrawn remain as HR-controlled terminal states; the AI
-- engine never auto-rejects and never writes these itself.)
-- ---------------------------------------------------------------------------
do $$
begin
  alter table public.candidates drop constraint if exists candidates_status_check;
exception when others then null;
end $$;

update public.candidates set status = 'applied' where status = 'new';
update public.candidates set status = 'shortlisted' where status = 'offer';

alter table public.candidates add constraint candidates_status_check check (
  status in ('applied', 'screening', 'interview', 'evaluation', 'shortlisted', 'hired', 'rejected', 'withdrawn')
);
alter table public.candidates alter column status set default 'applied';

-- ---------------------------------------------------------------------------
-- candidate_assessments: hybrid deterministic + Gemini match results
-- ---------------------------------------------------------------------------
create table if not exists public.candidate_assessments (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid not null references public.candidates (id) on delete cascade,
  job_id              uuid not null references public.jobs (id) on delete cascade,
  overall_match       integer not null check (overall_match between 0 and 100),
  skill_match         integer check (skill_match between 0 and 100),
  experience_match    integer check (experience_match between 0 and 100),
  role_relevance      integer check (role_relevance between 0 and 100),
  education_match     integer check (education_match between 0 and 100),
  recommendation      text check (recommendation in ('strong', 'potential', 'needs_assessment')),
  summary             text,
  why_matches         text[] not null default '{}',
  missing_requirements text[] not null default '{}',
  relevant_evidence   text[] not null default '{}',
  interview_focus     text[] not null default '{}',
  strengths           text[] not null default '{}',
  gaps                text[] not null default '{}',
  next_step           text,
  confidence          numeric(4, 3),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (candidate_id, job_id)
);

create index if not exists candidate_assessments_candidate_idx on public.candidate_assessments (candidate_id);
create index if not exists candidate_assessments_job_idx on public.candidate_assessments (job_id);

drop trigger if exists set_candidate_assessments_updated_at on public.candidate_assessments;
create trigger set_candidate_assessments_updated_at
  before update on public.candidate_assessments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS for candidate_assessments (HR only, mirrors the other recruitment tables)
-- ---------------------------------------------------------------------------
alter table public.candidate_assessments enable row level security;

drop policy if exists "candidate_assessments_select_hr" on public.candidate_assessments;
drop policy if exists "candidate_assessments_write_hr" on public.candidate_assessments;

create policy "candidate_assessments_select_hr" on public.candidate_assessments
  for select to authenticated using (is_hr());
create policy "candidate_assessments_write_hr" on public.candidate_assessments
  for all to authenticated using (is_hr()) with check (is_hr());

grant select, insert, update, delete on public.candidate_assessments to authenticated;

-- ---------------------------------------------------------------------------
-- Resumes bucket: also accept plain-text / markdown for quick testing
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', false, 10 * 1024 * 1024,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

commit;