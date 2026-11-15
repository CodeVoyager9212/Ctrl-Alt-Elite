-- Sprint 3 - AI job matching cache and atomic generation lock.
-- The browser can read its own cache, but only the service role used by the
-- ai-job-matching Edge Function can acquire locks or write AI results.

create table public.ai_job_match_cache (
  user_id uuid primary key references auth.users (id) on delete cascade,
  primary_resume_id uuid references public.resumes (id) on delete set null,
  resume_fingerprint text,
  profile_fingerprint text,
  algorithm_version text not null default 'job-match-v1',
  recommendations jsonb not null default '[]'::jsonb
    constraint ai_job_match_recommendations_array
    check (jsonb_typeof(recommendations) = 'array'),
  generated_at timestamptz,
  expires_at timestamptz,
  generation_status text not null default 'idle'
    constraint ai_job_match_generation_status
    check (generation_status in ('idle', 'generating', 'ready')),
  generation_request_id uuid,
  generation_started_at timestamptz,
  updated_at timestamptz not null default now()
);

create index ai_job_match_cache_expiry_idx
  on public.ai_job_match_cache (expires_at);

alter table public.ai_job_match_cache enable row level security;
revoke all on table public.ai_job_match_cache from anon, authenticated;
grant select on table public.ai_job_match_cache to authenticated;

create policy "Users read their own AI job matches"
on public.ai_job_match_cache
for select
to authenticated
using ((select auth.uid()) = user_id);

-- A five-minute lease makes a crashed/failed Edge Function recoverable.
create or replace function public.begin_ai_job_match_generation(
  target_user_id uuid,
  request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  acquired uuid;
begin
  insert into public.ai_job_match_cache as cache (
    user_id,
    generation_status,
    generation_request_id,
    generation_started_at,
    updated_at
  ) values (
    target_user_id,
    'generating',
    request_id,
    now(),
    now()
  )
  on conflict (user_id) do update
    set generation_status = 'generating',
        generation_request_id = excluded.generation_request_id,
        generation_started_at = excluded.generation_started_at,
        updated_at = excluded.updated_at
    where cache.generation_status <> 'generating'
       or cache.generation_started_at is null
       or cache.generation_started_at < now() - interval '5 minutes'
  returning generation_request_id into acquired;

  return acquired = request_id;
end;
$$;

create or replace function public.complete_ai_job_match_generation(
  target_user_id uuid,
  request_id uuid,
  selected_resume_id uuid,
  selected_resume_fingerprint text,
  selected_profile_fingerprint text,
  selected_algorithm_version text,
  result_recommendations jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(result_recommendations) <> 'array' then
    raise exception 'Recommendations must be a JSON array';
  end if;

  update public.ai_job_match_cache
  set primary_resume_id = selected_resume_id,
      resume_fingerprint = selected_resume_fingerprint,
      profile_fingerprint = selected_profile_fingerprint,
      algorithm_version = selected_algorithm_version,
      recommendations = result_recommendations,
      generated_at = now(),
      expires_at = now() + interval '24 hours',
      generation_status = 'ready',
      generation_request_id = null,
      generation_started_at = null,
      updated_at = now()
  where user_id = target_user_id
    and generation_status = 'generating'
    and generation_request_id = request_id;

  return found;
end;
$$;

create or replace function public.fail_ai_job_match_generation(
  target_user_id uuid,
  request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_job_match_cache
  set generation_status = case when generated_at is null then 'idle' else 'ready' end,
      generation_request_id = null,
      generation_started_at = null,
      updated_at = now()
  where user_id = target_user_id
    and generation_request_id = request_id;

  return found;
end;
$$;

revoke all on function public.begin_ai_job_match_generation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.complete_ai_job_match_generation(uuid, uuid, uuid, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.fail_ai_job_match_generation(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.begin_ai_job_match_generation(uuid, uuid) to service_role;
grant execute on function public.complete_ai_job_match_generation(uuid, uuid, uuid, text, text, text, jsonb) to service_role;
grant execute on function public.fail_ai_job_match_generation(uuid, uuid) to service_role;
