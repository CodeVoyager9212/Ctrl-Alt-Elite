import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
import { Buffer } from "node:buffer";
import * as mammoth from "npm:mammoth@1.11.0";
import {
  MATCHING_ALGORITHM_VERSION,
  assessCacheFreshness,
  generateJobMatches,
  relevantProfileFields,
  selectCandidateJobs,
  sha256,
  type AiJobRecommendation,
  type MatchingJob,
  type MatchingProfile,
  type ResumeContent,
} from "./matching.ts";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

type CacheRow = {
  primary_resume_id: string | null;
  resume_fingerprint: string | null;
  profile_fingerprint: string | null;
  algorithm_version: string;
  recommendations: AiJobRecommendation[];
  generated_at: string | null;
  expires_at: string | null;
  generation_status: "idle" | "generating" | "ready";
  generation_started_at: string | null;
};

type ResumeRow = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
};

type ProfileDbRow = MatchingProfile & { id: string; account_type: string };
type JobDbRow = MatchingJob & {
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  recruiter_id: string | null;
  is_active: boolean;
  application_deadline: string | null;
  created_at: string;
};

type EdgeDatabase = {
  public: {
    Tables: {
      profiles: { Row: ProfileDbRow; Insert: never; Update: never; Relationships: [] };
      resumes: { Row: ResumeRow & { user_id: string; is_primary: boolean }; Insert: never; Update: never; Relationships: [] };
      jobs: { Row: JobDbRow; Insert: never; Update: never; Relationships: [] };
      ai_job_match_cache: { Row: CacheRow & { user_id: string }; Insert: never; Update: never; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      begin_ai_job_match_generation: {
        Args: { target_user_id: string; request_id: string };
        Returns: boolean;
      };
      complete_ai_job_match_generation: {
        Args: {
          target_user_id: string;
          request_id: string;
          selected_resume_id: string;
          selected_resume_fingerprint: string;
          selected_profile_fingerprint: string;
          selected_algorithm_version: string;
          result_recommendations: AiJobRecommendation[];
        };
        Returns: boolean;
      };
      fail_ai_job_match_generation: {
        Args: { target_user_id: string; request_id: string };
        Returns: boolean;
      };
    };
  };
};

type AdminClient = SupabaseClient<EdgeDatabase>;

function resumeFingerprintInput(resume: ResumeRow | null) {
  return resume ? {
    id: resume.id,
    file_name: resume.file_name,
    file_path: resume.file_path,
    file_size: resume.file_size,
    created_at: resume.created_at,
  } : null;
}

async function getContext(admin: AdminClient, userId: string) {
  const [profileResult, resumeResult] = await Promise.all([
    admin.from("profiles")
      .select("headline,education,experience,skills,preferred_job_type,preferred_location,account_type")
      .eq("id", userId).maybeSingle(),
    admin.from("resumes")
      .select("id,file_name,file_path,file_size,created_at")
      .eq("user_id", userId).eq("is_primary", true).maybeSingle(),
  ]);
  if (profileResult.error) {
    console.error("PROFILE_LOOKUP_FAILED", {
      code: profileResult.error.code,
      message: profileResult.error.message,
      details: profileResult.error.details,
      hint: profileResult.error.hint,
    });
    throw new Error("PROFILE_LOOKUP_FAILED");
  }
  if (!profileResult.data || profileResult.data.account_type !== "job-seeker") {
    throw new Error("JOB_SEEKER_REQUIRED");
  }
  if (resumeResult.error) {
    console.error("RESUME_LOOKUP_FAILED", {
      code: resumeResult.error.code,
      message: resumeResult.error.message,
      details: resumeResult.error.details,
      hint: resumeResult.error.hint,
    });
    throw new Error("RESUME_LOOKUP_FAILED");
  }
  const profile = relevantProfileFields(profileResult.data as unknown as Record<string, unknown>);
  const resume = (resumeResult.data ?? null) as ResumeRow | null;
  return {
    profile,
    resume,
    profileFingerprint: await sha256(profile),
    resumeFingerprint: resume ? await sha256(resumeFingerprintInput(resume)) : null,
  };
}

async function getEligibleJobs(admin: AdminClient): Promise<JobDbRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin.from("jobs")
    .select("*")
    .eq("is_active", true)
    .or(`application_deadline.is.null,application_deadline.gte.${today}`)
    .order("posted_at", { ascending: false });
  if (error) {
    console.error("JOB_LOOKUP_FAILED", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("JOB_LOOKUP_FAILED");
  }
  return data ?? [];
}
async function readCache(admin: AdminClient, userId: string): Promise<CacheRow | null> {
  const { data, error } = await admin.from("ai_job_match_cache")
    .select("primary_resume_id,resume_fingerprint,profile_fingerprint,algorithm_version,recommendations,generated_at,expires_at,generation_status,generation_started_at")
    .eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("CACHE_LOOKUP_FAILED", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("CACHE_LOOKUP_FAILED");
  }
  return data as CacheRow | null;
}

function presentRecommendations(recommendations: AiJobRecommendation[], jobs: MatchingJob[]) {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  return recommendations.flatMap((recommendation) => {
    const job = byId.get(recommendation.jobId);
    return job ? [{ ...recommendation, job }] : [];
  });
}

async function buildState(admin: AdminClient, userId: string) {
  const [context, cache, jobs] = await Promise.all([
    getContext(admin, userId),
    readCache(admin, userId),
    getEligibleJobs(admin),
  ]);
  const freshness = assessCacheFreshness(
    cache,
    context.profileFingerprint,
    context.resumeFingerprint,
    context.resume?.id ?? null,
  );
  return {
    context,
    cache,
    jobs,
    response: {
      recommendations: presentRecommendations(cache?.recommendations ?? [], jobs),
      generatedAt: cache?.generated_at ?? null,
      expiresAt: cache?.expires_at ?? null,
      fresh: freshness.fresh,
      staleReasons: freshness.reasons,
      hasPrimaryResume: Boolean(context.resume),
      generating: cache?.generation_status === "generating" &&
        Boolean(cache.generation_started_at) &&
        Date.parse(cache!.generation_started_at!) > Date.now() - 5 * 60_000,
    },
  };
}

async function downloadResume(
  admin: AdminClient,
  userId: string,
  resume: ResumeRow,
): Promise<ResumeContent> {
  if (!resume.file_path.startsWith(`${userId}/`) || resume.file_size > MAX_RESUME_BYTES) {
    throw new Error("INVALID_RESUME");
  }
  const { data, error } = await admin.storage.from("resumes").download(resume.file_path);
  if (error || !data || data.size > MAX_RESUME_BYTES) throw new Error("RESUME_DOWNLOAD_FAILED");
  const lowerName = resume.file_name.toLowerCase();
  const bytes = await data.arrayBuffer();
  if (lowerName.endsWith(".pdf")) {
    if (await data.slice(0, 5).text() !== "%PDF-") throw new Error("INVALID_RESUME");
    return { kind: "pdf", base64: Buffer.from(bytes).toString("base64") };
  }
  if (lowerName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    const text = result.value.trim();
    if (!text) throw new Error("UNREADABLE_RESUME");
    return { kind: "text", text: text.slice(0, 80_000) };
  }
  throw new Error("UNSUPPORTED_RESUME_FORMAT");
}
function publicError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "JOB_SEEKER_REQUIRED": return ["AI matching is available to job seekers.", 403] as const;
    case "UNSUPPORTED_RESUME_FORMAT": return ["AI matching supports PDF and DOCX primary resumes. Convert legacy DOC files to PDF or DOCX.", 422] as const;
    case "INVALID_RESUME":
    case "UNREADABLE_RESUME": return ["The primary resume could not be read. Try a clear PDF or DOCX file up to 5 MB.", 422] as const;
    default: return ["Couldn't generate job matches. Try again later.", 502] as const;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return respond({ error: "Sign in to view job matches." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const aiKey = Deno.env.get("GEMINI_API_KEY");
  if (!url || !anonKey || !serviceKey) return respond({ error: "AI job matching has not been configured." }, 503);

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient<EdgeDatabase>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return respond({ error: "Sign in again to view job matches." }, 401);

  const body = await request.json().catch(() => null);
  const operation = body?.operation;
  if (!(["get", "generate", "refresh"] as const).includes(operation)) {
    return respond({ error: "Choose get, generate, or refresh." }, 400);
  }

  try {
    const initial = await buildState(admin, user.id);
    if (operation === "get") return respond(initial.response);
    if (!initial.context.resume) {
      return respond({ ...initial.response, error: "Select a primary resume before generating matches." }, 422);
    }
    if (operation === "generate" && initial.response.fresh) return respond(initial.response);
    if (!aiKey) return respond({ ...initial.response, error: "AI job matching has not been configured." }, 503);

    const requestId = crypto.randomUUID();
    const { data: acquired, error: lockError } = await admin.rpc("begin_ai_job_match_generation", {
      target_user_id: user.id,
      request_id: requestId,
    });
    if (lockError) throw new Error("LOCK_FAILED");
    if (acquired !== true) {
      return respond({ ...initial.response, generating: true, error: "Job matches are already being generated in another tab." }, 409);
    }

    try {
      const candidates = selectCandidateJobs(initial.jobs, initial.context.profile);
      let recommendations: AiJobRecommendation[] = [];
      if (candidates.length > 0) {
        const resumeContent = await downloadResume(admin, user.id, initial.context.resume);
        const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
        recommendations = await generateJobMatches(
          initial.context.profile,
          resumeContent,
          candidates,
          aiKey,
          model,
        );
      }

      // Do not save an answer produced from inputs that changed during the call.
      const latest = await getContext(admin, user.id);
      if (
        latest.profileFingerprint !== initial.context.profileFingerprint ||
        latest.resumeFingerprint !== initial.context.resumeFingerprint ||
        latest.resume?.id !== initial.context.resume.id
      ) {
        await admin.rpc("fail_ai_job_match_generation", { target_user_id: user.id, request_id: requestId });
        return respond({ error: "Your profile or primary resume changed during generation. Generate again to use the latest information." }, 409);
      }
const { data: completed, error: completionError } = await admin.rpc("complete_ai_job_match_generation", {
        target_user_id: user.id,
        request_id: requestId,
        selected_resume_id: initial.context.resume.id,
        selected_resume_fingerprint: initial.context.resumeFingerprint!,
        selected_profile_fingerprint: initial.context.profileFingerprint,
        selected_algorithm_version: MATCHING_ALGORITHM_VERSION,
        result_recommendations: recommendations,
      });
      if (completionError || completed !== true) {
        throw new Error("STALE_REQUEST");
      }
      return respond((await buildState(admin, user.id)).response);
    } catch (error) {
      await admin.rpc("fail_ai_job_match_generation", { target_user_id: user.id, request_id: requestId });
      throw error;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "AI job matching failed.");
    const [message, status] = publicError(error);
    return respond({ error: message }, status);
  }
});