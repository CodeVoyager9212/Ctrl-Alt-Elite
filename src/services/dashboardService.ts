import { supabase } from "../lib/supabase";
import type { ApplicationRow, JobRow, ProfileRow } from "../types/database";

export type DashboardData = {
  profile: ProfileRow | null;
  applications: ApplicationRow[];
  jobs: JobRow[];
  jobDetailsUnavailable: boolean;
};

async function getApplications(userId: string, signal: AbortSignal) {
  const applications: ApplicationRow[] = [];
  let cursor: ApplicationRow | undefined;

  while (true) {
    signal.throwIfAborted();
    let query = supabase
      .from("applications")
      .select("*")
      .eq("applicant_id", userId)
      .order("applied_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(250)
      .abortSignal(signal);

    // Continue past the API row cap. The ID breaks ties when timestamps match.
    if (cursor) {
      const timestamp = `"${cursor.applied_at}"`;
      query = query.or(
        `applied_at.lt.${timestamp},and(applied_at.eq.${timestamp},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query;
    if (error) throw new Error("Unable to load your applications.");
    if (!data?.length) return applications;

    applications.push(...data);
    cursor = data.at(-1);
  }
}

export async function getJobSeekerDashboardData(
  userId: string,
  signal: AbortSignal,
): Promise<DashboardData> {
  const [profileResult, applications] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .abortSignal(signal)
      .maybeSingle(),
    getApplications(userId, signal),
  ]);

  const jobs: JobRow[] = [];
  let jobDetailsUnavailable = false;
  const jobIds = [...new Set(applications.map((application) => application.job_id))];

  // Keep query URLs short for users with a long application history.
  for (let index = 0; index < jobIds.length; index += 50) {
    signal.throwIfAborted();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .in("id", jobIds.slice(index, index + 50))
      .abortSignal(signal);

    if (error) {
      jobDetailsUnavailable = true;
    } else {
      jobs.push(...(data ?? []));
    }
  }

  return {
    profile: profileResult.data ?? null,
    applications,
    jobs,
    jobDetailsUnavailable,
  };
}
