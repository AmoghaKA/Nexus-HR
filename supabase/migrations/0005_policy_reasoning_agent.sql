-- ---------------------------------------------------------------------------
-- Policy Reasoning Agent: uploaded-document metadata + HR write access
-- ---------------------------------------------------------------------------
-- 1. policies keeps a reference to the original uploaded file so answers can
--    link straight to the source document in the 'policies' storage bucket.
-- 2. The 'policies' bucket accepts .docx uploads (PDF/TXT/DOCX are the
--    supported source formats for the reasoning agent).
-- 3. Policy management (upload/delete/re-index) is an HR capability, not
--    restricted to HR admins only.

alter table public.policies
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists mime_type text;

create index if not exists idx_policies_slug on public.policies (slug);

-- Allow .docx alongside pdf/txt/markdown
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('policies', 'policies', false, 25 * 1024 * 1024,
  array['application/pdf', 'text/plain', 'text/markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
set allowed_mime_types = excluded.allowed_mime_types;

-- Broaden policy management from is_hr_admin() to any HR role
drop policy if exists "policies_write_hr_admin" on public.policies;
create policy "policies_write_hr" on public.policies
  for all to authenticated using (is_hr()) with check (is_hr());

drop policy if exists "policy_chunks_write_hr_admin" on public.policy_chunks;
create policy "policy_chunks_write_hr" on public.policy_chunks
  for all to authenticated using (is_hr()) with check (is_hr());

drop policy if exists "policies_storage_insert" on storage.objects;
create policy "policies_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'policies' and is_hr());

drop policy if exists "policies_storage_update" on storage.objects;
create policy "policies_storage_update" on storage.objects
  for update to authenticated using (bucket_id = 'policies' and is_hr()) with check (bucket_id = 'policies' and is_hr());

drop policy if exists "policies_storage_delete" on storage.objects;
create policy "policies_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'policies' and is_hr());