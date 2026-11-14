import { supabase } from "../lib/supabase";
import type { JobRow } from "../types/database";

export async function getActiveJobs(): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .or(`application_deadline.is.null,application_deadline.gte.${new Date().toISOString().slice(0, 10)}`)
    .order("posted_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }

  return data ?? [];
}