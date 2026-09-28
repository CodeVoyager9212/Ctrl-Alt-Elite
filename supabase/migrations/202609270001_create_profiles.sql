create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  account_type text not null default 'job-seeker'
    constraint profiles_account_type_check
    check (account_type in ('job-seeker', 'recruiter')),
  headline text not null default '',
  education text not null default '',
  experience text not null default '',
  skills text not null default '',
  preferred_job_type text not null default ''
    constraint profiles_preferred_job_type_check
    check (
      preferred_job_type in ('', 'Full-time', 'Internship', 'Contract', 'Part-time')
    ),
  preferred_location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'account_type' = 'recruiter'
        then 'recruiter'
      else 'job-seeker'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger create_profile_after_user_signup
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();

insert into public.profiles (id, full_name, account_type)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  case
    when users.raw_user_meta_data ->> 'account_type' = 'recruiter'
      then 'recruiter'
    else 'job-seeker'
  end
from auth.users as users
on conflict (id) do nothing;

revoke execute on function public.set_profile_updated_at()
from public, anon, authenticated;

revoke execute on function public.create_profile_for_new_user()
from public, anon, authenticated;
