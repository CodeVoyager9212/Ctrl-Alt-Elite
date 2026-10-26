-- Sprint 2 - Feature 3: Job Application Submission and Tracking
-- Group 2 (Alfred, Anas, Omar)
--
-- Uses the existing tables:
--   public.profiles  (Sprint 1)  account type: job-seeker / recruiter
--   public.resumes   (Sprint 1)  the résumé sent with the application
--   public.jobs      (Sprint 2, Find Jobs)  the job posting, recruiter_id = who posted it
--
-- Creates public.applications: one row per job seeker per job, with a tracked status.

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  resume_file_name text not null default '',  -- kept even if the résumé is deleted later
  status text not null default 'Applied'
    constraint applications_status_check
    check (status in ('Applied', 'Under Review', 'Interview', 'Offered', 'Rejected')),
  applied_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  constraint applications_one_per_job unique (job_id, user_id)
);

create index applications_user_id_idx on public.applications (user_id);
create index applications_job_id_idx on public.applications (job_id);

-- Remember when the status last changed ("in this status for N days")
create function public.set_application_status_changed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end;
$$;

create trigger set_applications_status_changed_at
before update on public.applications
for each row
execute function public.set_application_status_changed_at();

revoke execute on function public.set_application_status_changed_at()
from public, anon, authenticated;

-- Security -------------------------------------------------------------------------
alter table public.applications enable row level security;

revoke all on table public.applications from anon;
grant select, insert on table public.applications to authenticated;
grant update (status) on table public.applications to authenticated; -- only the status can ever change

-- Job seekers: see their own applications.
create policy "Job seekers read their own applications"
on public.applications for select to authenticated
using ((select auth.uid()) = user_id);

-- A new application must belong to the logged-in user, start as "Applied",
-- come from a job seeker account (recruiters cannot apply),
-- use one of the user's own résumés (Sprint 1 resumes table),
-- and be for a job that is still active.
create policy "Job seekers submit their own applications"
on public.applications for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'Applied'
  and exists (
    select 1 from public.profiles as p
    where p.id = (select auth.uid()) and p.account_type = 'job-seeker'
  )
  and exists (
    select 1 from public.resumes as r
    where r.id = resume_id and r.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.jobs as j
    where j.id = job_id and j.is_active
  )
);

-- Recruiters: see and move applications for the jobs they posted (used by feature 4).
create policy "Recruiters read applications to their jobs"
on public.applications for select to authenticated
using (exists (
  select 1 from public.jobs as j
  where j.id = job_id and j.recruiter_id = (select auth.uid())
));

create policy "Recruiters update status on their jobs"
on public.applications for update to authenticated
using (exists (
  select 1 from public.jobs as j
  where j.id = job_id and j.recruiter_id = (select auth.uid())
))
with check (exists (
  select 1 from public.jobs as j
  where j.id = job_id and j.recruiter_id = (select auth.uid())
));
