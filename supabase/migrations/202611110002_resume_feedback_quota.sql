create table if not exists public.resume_feedback_quota (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_day date not null,
  requests integer not null check (requests between 1 and 5)
);

alter table public.resume_feedback_quota enable row level security;
revoke all on public.resume_feedback_quota from anon, authenticated;

create or replace function public.claim_resume_feedback_request()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  recipient uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
begin
  if recipient is null then
    return false;
  end if;

  insert into public.resume_feedback_quota as quota (user_id, usage_day, requests)
  values (recipient, today, 1)
  on conflict (user_id) do update
  set usage_day = excluded.usage_day,
      requests = case when quota.usage_day = excluded.usage_day then quota.requests + 1 else 1 end
  where quota.usage_day < excluded.usage_day
     or (quota.usage_day = excluded.usage_day and quota.requests < 5);
  return found;
end;
$$;
revoke all on function public.claim_resume_feedback_request() from public, anon;
grant execute on function public.claim_resume_feedback_request() to authenticated;
