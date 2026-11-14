alter table public.jobs add column if not exists application_deadline date;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('application_update', 'interview_invitation', 'deadline_reminder', 'new_application')),
  job_id uuid not null,
  job_title text not null,
  application_status text,
  deadline date,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc, id desc);
create unique index if not exists notifications_deadline_once_idx
  on public.notifications (recipient_id, job_id, deadline)
  where kind = 'deadline_reminder';

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Read own notifications" on public.notifications;
create policy "Read own notifications" on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
drop policy if exists "Update own notification read state" on public.notifications;
create policy "Update own notification read state" on public.notifications
  for update to authenticated using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.notify_application_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  posting record;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select j.title, j.recruiter_id into posting from public.jobs j where j.id = new.job_id;
  if tg_op = 'INSERT' then
    if posting.recruiter_id is not null then
      insert into public.notifications (recipient_id, kind, job_id, job_title)
      values (posting.recruiter_id, 'new_application', new.job_id, posting.title);
    end if;
  else
    insert into public.notifications (recipient_id, kind, job_id, job_title, application_status)
    values (
      new.applicant_id,
      case when new.status = 'Interview' then 'interview_invitation' else 'application_update' end,
      new.job_id, posting.title, new.status
    );
  end if;
  return new;
end;
$$;
revoke all on function public.notify_application_change() from public, anon, authenticated;
drop trigger if exists application_notification_trigger on public.applications;
create trigger application_notification_trigger
  after insert or update of status on public.applications
  for each row execute function public.notify_application_change();

create or replace function public.refresh_deadline_reminders()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  recipient uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
begin
  if recipient is null then
    return;
  end if;

  -- Replace reminders for deadlines that were rescheduled or postings that closed early.
  delete from public.notifications n
  where n.recipient_id = recipient and n.kind = 'deadline_reminder'
    and not exists (
      select 1 from public.jobs j where j.id = n.job_id
        and j.application_deadline = n.deadline and j.is_active
    );

  insert into public.notifications (recipient_id, kind, job_id, job_title, deadline)
  select recipient, 'deadline_reminder', j.id, j.title, j.application_deadline
  from public.jobs j
  where j.is_active and j.application_deadline between today and today + 3
    and (
      j.recruiter_id = recipient or exists (
        select 1 from public.applications a where a.job_id = j.id and a.applicant_id = recipient
          and a.status in ('Applied', 'Under Review', 'Interview')
      )
    )
  on conflict (recipient_id, job_id, deadline) where kind = 'deadline_reminder' do nothing;
end;
$$;
revoke all on function public.refresh_deadline_reminders() from public, anon;
grant execute on function public.refresh_deadline_reminders() to authenticated;

create or replace function public.check_application_deadline()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if exists (
    select 1 from public.jobs j where j.id = new.job_id
      and j.application_deadline < (now() at time zone 'UTC')::date
  ) then
    raise exception 'The application deadline has passed';
  end if;
  return new;
end;
$$;
drop trigger if exists check_application_deadline_trigger on public.applications;
create trigger check_application_deadline_trigger before insert on public.applications
  for each row execute function public.check_application_deadline();
