-- Grant the AI Job Matching Edge Function permission
-- to read the existing CareerConnect tables.

GRANT SELECT ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.resumes TO service_role;
GRANT SELECT ON TABLE public.jobs TO service_role;
GRANT SELECT ON TABLE public.ai_job_match_cache TO service_role;
