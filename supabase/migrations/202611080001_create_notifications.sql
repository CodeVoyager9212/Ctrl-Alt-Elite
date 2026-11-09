-- ============================================================
-- Sprint 3 - Job Notifications and Reminders
-- CareerConnect - Anas, Omar
--
-- In-app notifications only (no email or push).
--
-- Notification types (job seekers):
--   status_update           application status was changed
--   interview_reminder      interview scheduled / interview coming up
--   deadline_reminder       deadline is close for an application not submitted yet
--   incomplete_application  user saved an application without submitting it
--   job_recommendation      new job matches the user's skills or preferences
--   new_job                 new job was posted
--
-- Notification types (recruiters):
--   new_application         someone applied to one of their jobs
--
-- Uses existing tables:
--   public.profiles, public.resumes, public.jobs, public.applications
-- ============================================================


-- ============================================================
-- 1. INTERVIEW DATE ON APPLICATIONS
-- ============================================================

-- Recruiters set this when an application is moved to Interview.
alter table public.applications
add column if not exists interview_at timestamptz;

-- Recruiters can update status (already granted) and interview time.
-- RLS still limits this to recruiters who own the job.
grant update (interview_at) on table public.applications
to authenticated;


-- ============================================================
-- 2. APPLICATION DEADLINE ON JOBS
-- ============================================================

-- Optional. Set by the recruiter when creating or editing a job.
alter table public.jobs
add column if not exists application_deadline date;

grant select (application_deadline),
      insert (application_deadline),
      update (application_deadline)
on table public.jobs
to authenticated;


-- ============================================================
-- 3. SAVED INCOMPLETE APPLICATIONS (DRAFTS)
-- ============================================================

create table if not exists public.application_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  saved_at timestamptz not null default now(),
  unique (user_id, job_id)
);

alter table public.application_drafts
enable row level security;

drop policy if exists "Job seekers read their own drafts"
on public.application_drafts;

drop policy if exists "Job seekers save their own drafts"
on public.application_drafts;

create policy "Job seekers read their own drafts"
on public.application_drafts
for select
to authenticated
using (
  user_id = (select auth.uid())
);

create policy "Job seekers save their own drafts"
on public.application_drafts
for insert
to authenticated
with check (

  user_id = (select auth.uid())

  -- Must have a job-seeker profile.
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.account_type = 'job-seeker'
  )

  -- Resume must belong to the user.
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

  -- Cannot save a draft for a job already applied to.
  and not exists (
    select 1
    from public.applications a
    where a.job_id = application_drafts.job_id
      and a.applicant_id = (select auth.uid())
  )

);

revoke all on table public.application_drafts
from anon, authenticated;

grant select, insert on table public.application_drafts
to authenticated;


-- ============================================================
-- 4. NOTIFICATIONS TABLE
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in (
      'status_update',
      'interview_reminder',
      'deadline_reminder',
      'incomplete_application',
      'job_recommendation',
      'new_job',
      'new_application'
    )),
  title text not null,
  message text not null,

  -- Used to send the user to the right job or application.
  job_id uuid references public.jobs (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,

  is_read boolean not null default false,

  -- Stops the same reminder from being created twice.
  reminder_key text unique,

  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
on public.notifications (user_id, created_at desc);

alter table public.notifications
enable row level security;

drop policy if exists "Users read their own notifications"
on public.notifications;

drop policy if exists "Users mark their own notifications as read"
on public.notifications;

create policy "Users read their own notifications"
on public.notifications
for select
to authenticated
using (
  user_id = (select auth.uid())
);

create policy "Users mark their own notifications as read"
on public.notifications
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);

-- Notifications are only created by the database functions below.
-- Users can read them and change is_read only.
revoke all on table public.notifications
from anon, authenticated;

grant select on table public.notifications
to authenticated;

grant update (is_read) on table public.notifications
to authenticated;


-- ============================================================
-- 5. APPLICATION STATUS UPDATES + INTERVIEW SCHEDULED
-- ============================================================

create or replace function public.notify_application_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_title text;
  job_company text;
begin

  select j.title, j.company_name
  into job_title, job_company
  from public.jobs j
  where j.id = new.job_id;

  -- Status changed by the recruiter.
  if new.status is distinct from old.status then
    insert into public.notifications
      (user_id, type, title, message, job_id, application_id)
    values (
      new.applicant_id,
      'status_update',
      'Application status updated',
      format(
        'Your application for %s at %s is now %s.',
        job_title, job_company, new.status
      ),
      new.job_id,
      new.id
    );
  end if;

  -- Interview date set or changed to a future time.
  if new.interview_at is distinct from old.interview_at
     and new.interview_at is not null
     and new.interview_at > now()
  then
    insert into public.notifications
      (user_id, type, title, message, job_id, application_id)
    values (
      new.applicant_id,
      'interview_reminder',
      'Interview scheduled',
      format(
        'Your interview for %s at %s has been scheduled. Check My Applications for the date and time.',
        job_title, job_company
      ),
      new.job_id,
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_application_update_trigger
on public.applications;

create trigger notify_application_update_trigger
after update
on public.applications
for each row
execute function public.notify_application_update();


-- ============================================================
-- 6. REMINDERS: INTERVIEW COMING UP + DEADLINE COMING UP
-- ============================================================

-- Called by the app when the notification bell loads.
-- Creates each reminder only once for the logged-in user.
create or replace function public.create_due_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- Interview in the next 24 hours.
  insert into public.notifications
    (user_id, type, title, message, job_id, application_id, reminder_key)
  select
    a.applicant_id,
    'interview_reminder',
    'Interview coming up',
    format(
      'Your interview for %s at %s is in less than 24 hours.',
      j.title, j.company_name
    ),
    a.job_id,
    a.id,
    'interview:' || a.id || ':' || extract(epoch from a.interview_at)::bigint
  from public.applications a
  join public.jobs j
    on j.id = a.job_id
  where a.applicant_id = (select auth.uid())
    and a.status = 'Interview'
    and a.interview_at > now()
    and a.interview_at <= now() + interval '24 hours'
  on conflict (reminder_key) do nothing;

  -- Application deadline in the next 3 days for a saved
  -- application that was not submitted yet.
  insert into public.notifications
    (user_id, type, title, message, job_id, reminder_key)
  select
    d.user_id,
    'deadline_reminder',
    'Deadline coming up',
    format(
      'The deadline to apply for %s at %s is %s. Your application is not submitted yet.',
      j.title, j.company_name, to_char(j.application_deadline, 'FMMonth FMDD, YYYY')
    ),
    d.job_id,
    'deadline:' || d.id || ':' || j.application_deadline
  from public.application_drafts d
  join public.jobs j
    on j.id = d.job_id
  where d.user_id = (select auth.uid())
    and j.is_active = true
    and j.application_deadline >= current_date
    and j.application_deadline <= current_date + 3
  on conflict (reminder_key) do nothing;

end;
$$;

revoke execute on function public.create_due_reminders()
from public, anon;

grant execute on function public.create_due_reminders()
to authenticated;


-- ============================================================
-- 7. NEW JOB ALERTS + JOB RECOMMENDATIONS
-- ============================================================

-- Every job seeker gets one notification per new job:
--   job_recommendation if the job matches one of their skills,
--   their preferred job type, or their preferred location,
--   otherwise a new_job alert.

create or replace function public.notify_new_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_text text;
begin

  job_text := lower(concat_ws(' ',
    new.title,
    new.category,
    new.summary,
    new.description,
    new.requirements,
    new.responsibilities
  ));

  insert into public.notifications
    (user_id, type, title, message, job_id)
  select
    p.id,
    case when matched then 'job_recommendation' else 'new_job' end,
    case when matched then 'Recommended job for you' else 'New job posted' end,
    case
      when matched then format(
        '%s at %s matches your skills or preferences.',
        new.title, new.company_name
      )
      else format(
        '%s at %s was just posted.',
        new.title, new.company_name
      )
    end,
    new.id
  from (
    select
      p.id,
      (
        -- Preferred job type
        (p.preferred_job_type <> ''
          and p.preferred_job_type = new.employment_type)

        -- Preferred location (also matches "Remote", "Hybrid", ...)
        or (trim(p.preferred_location) <> ''
          and position(
            lower(trim(p.preferred_location))
            in lower(new.location || ' ' || new.work_mode)
          ) > 0)

        -- Any skill from the profile (comma separated)
        or exists (
          select 1
          from unnest(string_to_array(p.skills, ',')) as s (skill)
          where length(trim(s.skill)) >= 2
            and position(lower(trim(s.skill)) in job_text) > 0
        )
      ) as matched
    from public.profiles p
    where p.account_type = 'job-seeker'
  ) as p;

  return new;
end;
$$;

drop trigger if exists notify_new_job_trigger
on public.jobs;

create trigger notify_new_job_trigger
after insert
on public.jobs
for each row
when (new.is_active)
execute function public.notify_new_job();


-- ============================================================
-- 8. INCOMPLETE APPLICATION REMINDERS
-- ============================================================

-- Saving a draft creates a reminder to finish the application.
create or replace function public.notify_application_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  insert into public.notifications
    (user_id, type, title, message, job_id)
  select
    new.user_id,
    'incomplete_application',
    'Finish your application',
    format(
      'You started an application for %s at %s but have not submitted it yet.',
      j.title, j.company_name
    ),
    new.job_id
  from public.jobs j
  where j.id = new.job_id;

  return new;
end;
$$;

drop trigger if exists notify_application_draft_trigger
on public.application_drafts;

create trigger notify_application_draft_trigger
after insert
on public.application_drafts
for each row
execute function public.notify_application_draft();


-- ============================================================
-- 9. NEW APPLICATION SUBMITTED
-- ============================================================

-- Tells the recruiter about the new application, removes the
-- user's draft for that job and marks its reminders as read.
create or replace function public.handle_new_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  insert into public.notifications
    (user_id, type, title, message, job_id, application_id)
  select
    j.recruiter_id,
    'new_application',
    'New application',
    format(
      '%s applied to %s.',
      coalesce(nullif(trim(p.full_name), ''), 'A job seeker'),
      j.title
    ),
    new.job_id,
    new.id
  from public.jobs j
  left join public.profiles p
    on p.id = new.applicant_id
  where j.id = new.job_id
    and j.recruiter_id is not null;

  delete from public.application_drafts d
  where d.user_id = new.applicant_id
    and d.job_id = new.job_id;

  update public.notifications n
  set is_read = true
  where n.user_id = new.applicant_id
    and n.job_id = new.job_id
    and n.type in ('incomplete_application', 'deadline_reminder')
    and n.is_read = false;

  return new;
end;
$$;

drop trigger if exists handle_new_application_trigger
on public.applications;

create trigger handle_new_application_trigger
after insert
on public.applications
for each row
execute function public.handle_new_application();


-- Trigger functions should not be called directly by users.
revoke execute on function public.notify_application_update()
from public, anon, authenticated;

revoke execute on function public.notify_new_job()
from public, anon, authenticated;

revoke execute on function public.notify_application_draft()
from public, anon, authenticated;

revoke execute on function public.handle_new_application()
from public, anon, authenticated;


-- Refresh the Supabase API so the new tables are visible.
notify pgrst, 'reload schema';


-- ============================================================
-- END OF NOTIFICATIONS SETUP
-- ============================================================
