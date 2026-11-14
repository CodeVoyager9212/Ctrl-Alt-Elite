
-- ============================================================
-- Sprint 2 - Feature 3: Job Application Submission and Tracking
-- CareerConnect - Group 2 (Alfred, Anas, Omar)
--
-- Uses existing tables:
--   public.profiles
--   public.resumes
--   public.jobs
--   public.applications
--
-- IMPORTANT:
-- public.applications already exists in Supabase.
-- This script configures security, permissions, and triggers.
-- It does NOT recreate or delete the applications table.
-- ============================================================


-- ============================================================
-- 1. APPLICATION STATUS AND TIMESTAMP PROTECTION
-- ============================================================

-- Valid statuses:
-- Applied, Under Review, Interview, Offered, Rejected
--
-- Every new application starts as Applied.
-- Only authorized recruiters can subsequently change status.

create or replace function public.validate_application_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  -- NEW APPLICATION
  if tg_op = 'INSERT' then

    -- Applicant must be the logged-in user.
    if new.applicant_id is distinct from auth.uid() then
      raise exception 'Cannot apply for another user';
    end if;

    -- Only job seekers can apply.
    if not exists (
      select 1
      from public.profiles p
      where p.id = new.applicant_id
        and p.account_type = 'job-seeker'
    ) then
      raise exception 'Only job seekers can apply';
    end if;

    -- Submitted resume must belong to the applicant.
    if not exists (
      select 1
      from public.resumes r
      where r.id = new.resume_id
        and r.user_id = new.applicant_id
    ) then
      raise exception 'Resume must belong to applicant';
    end if;

    -- Job must exist and be active.
    if not exists (
      select 1
      from public.jobs j
      where j.id = new.job_id
        and j.is_active = true
    ) then
      raise exception 'Job is not available';
    end if;

    -- Enforce initial application values.
    new.status := 'Applied';
    new.applied_at := now();
    new.updated_at := now();
    new.status_changed_at := now();

  -- EXISTING APPLICATION
  elsif tg_op = 'UPDATE' then

    -- Application ownership and relationships cannot change.
    if new.id is distinct from old.id
       or new.applicant_id is distinct from old.applicant_id
       or new.job_id is distinct from old.job_id
       or new.resume_id is distinct from old.resume_id
       or new.applied_at is distinct from old.applied_at
    then
      raise exception 'Application identity cannot change';
    end if;

    -- Track when recruiter changes application status.
    if new.status is distinct from old.status then
      new.status_changed_at := now();
    else
      new.status_changed_at := old.status_changed_at;
    end if;

    new.updated_at := now();

  end if;

  return new;
end;
$$;


-- Remove previous versions of application triggers.
drop trigger if exists validate_application_write_trigger
on public.applications;

drop trigger if exists set_applications_status_changed_at
on public.applications;


-- Attach validation to applications table.
create trigger validate_application_write_trigger
before insert or update
on public.applications
for each row
execute function public.validate_application_write();


-- Trigger function should not be called directly by users.
revoke execute on function public.validate_application_write()
from public, anon, authenticated;


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

alter table public.applications
enable row level security;


-- ============================================================
-- 3. CLEAN UP PREVIOUS APPLICATION POLICIES
-- ============================================================

drop policy if exists
  "Applicants view own applications"
on public.applications;

drop policy if exists
  "Recruiters view job applications"
on public.applications;

drop policy if exists
  "Applicants create own applications"
on public.applications;

drop policy if exists
  "Recruiters update application status"
on public.applications;

drop policy if exists
  "Job seekers read their own applications"
on public.applications;

drop policy if exists
  "Job seekers submit their own applications"
on public.applications;

drop policy if exists
  "Recruiters read applications to their jobs"
on public.applications;

drop policy if exists
  "Recruiters update status on their jobs"
on public.applications;


-- ============================================================
-- 4. JOB SEEKERS: READ THEIR OWN APPLICATIONS
-- ============================================================

create policy "Job seekers read their own applications"
on public.applications
for select
to authenticated
using (
  applicant_id = (select auth.uid())
);


-- ============================================================
-- 5. JOB SEEKERS: SUBMIT APPLICATIONS
-- ============================================================

create policy "Job seekers submit their own applications"
on public.applications
for insert
to authenticated
with check (

  -- Must apply using own account.
  applicant_id = (select auth.uid())

  -- Initial status must be Applied.
  and status = 'Applied'

  -- Must have a job-seeker profile.
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.account_type = 'job-seeker'
  )

  -- Resume must belong to the applicant.
  and exists (
    select 1
    from public.resumes r
    where r.id = resume_id
      and r.user_id = (select auth.uid())
  )

  -- Job must be active.
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.is_active = true
  )

);


-- ============================================================
-- 6. RECRUITERS: VIEW APPLICATIONS FOR OWN JOBS
-- ============================================================

create policy "Recruiters read applications to their jobs"
on public.applications
for select
to authenticated
using (

  exists (
    select 1
    from public.jobs j
    join public.profiles p
      on p.id = j.recruiter_id
    where j.id = applications.job_id
      and j.recruiter_id = (select auth.uid())
      and p.account_type = 'recruiter'
  )

);


-- ============================================================
-- 7. RECRUITERS: UPDATE APPLICATION STATUS
-- ============================================================

create policy "Recruiters update status on their jobs"
on public.applications
for update
to authenticated

using (

  exists (
    select 1
    from public.jobs j
    join public.profiles p
      on p.id = j.recruiter_id
    where j.id = applications.job_id
      and j.recruiter_id = (select auth.uid())
      and p.account_type = 'recruiter'
  )

)

with check (

  exists (
    select 1
    from public.jobs j
    join public.profiles p
      on p.id = j.recruiter_id
    where j.id = applications.job_id
      and j.recruiter_id = (select auth.uid())
      and p.account_type = 'recruiter'
  )

);


-- ============================================================
-- 8. TABLE PERMISSIONS
-- ============================================================

-- Prevent anonymous users from accessing applications.
revoke all on table public.applications
from anon;

-- Reset existing authenticated permissions.
revoke all on table public.applications
from authenticated;

-- Authenticated users can read and submit applications.
grant select, insert on table public.applications
to authenticated;

-- Only the status column can be directly updated.
-- RLS additionally restricts WHO may perform this update.
grant update (status) on table public.applications
to authenticated;


-- ============================================================
-- END OF FEATURE 3 DATABASE SECURITY SETUP
-- ============================================================
