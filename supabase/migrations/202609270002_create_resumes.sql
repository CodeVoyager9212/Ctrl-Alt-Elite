-- Résumé upload & management (Omar El Akrae)
-- 1) Private storage bucket for the files
-- 2) public.resumes table: one row per uploaded résumé
-- 3) public.resumes_by_user view: one row per user -> user_id, full_name, resume_1, resume_2, ...

-- 1) Storage bucket -----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880, -- 5 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Files are stored as  <user_id>/<timestamp>-<file name>
-- Each user can only touch files inside their own folder.
create policy "Users can read their own resume files"
on storage.objects for select to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload their own resume files"
on storage.objects for insert to authenticated
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete their own resume files"
on storage.objects for delete to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 2) Table ----------------------------------------------------------------------
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default '',
  file_name text not null,
  file_path text not null unique,
  file_size integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index resumes_user_id_idx on public.resumes (user_id);

-- Only one primary résumé per user
create unique index resumes_one_primary_per_user
on public.resumes (user_id) where is_primary;

alter table public.resumes enable row level security;

revoke all on table public.resumes from anon;
grant select, insert, update, delete on table public.resumes to authenticated;

create policy "Users can read their own resumes"
on public.resumes for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own resumes"
on public.resumes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own resumes"
on public.resumes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own resumes"
on public.resumes for delete to authenticated
using ((select auth.uid()) = user_id);

-- 3) View: one row per user, résumés side by side --------------------------------
create view public.resumes_by_user
with (security_invoker = true)
as
with numbered as (
  select
    r.*,
    row_number() over (
      partition by r.user_id
      order by r.is_primary desc, r.created_at
    ) as n
  from public.resumes as r
)
select
  p.id as user_id,
  p.full_name,
  count(n.id) as total_resumes,
  max(n.file_name) filter (where n.n = 1) as resume_1,
  max(n.file_name) filter (where n.n = 2) as resume_2,
  max(n.file_name) filter (where n.n = 3) as resume_3,
  max(n.file_name) filter (where n.n = 4) as resume_4,
  max(n.file_name) filter (where n.n = 5) as resume_5
from public.profiles as p
left join numbered as n on n.user_id = p.id
group by p.id, p.full_name;

grant select on public.resumes_by_user to authenticated;
