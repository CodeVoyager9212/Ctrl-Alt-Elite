import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { JobRow } from "../types/database";

export type MatchOperation = "get" | "generate" | "refresh";

export type JobMatch = {
  jobId: string;
  score: number;
  explanation: string;
  strengths: string[];
  gaps: string[];
  job: JobRow;
};

export type JobMatchState = {
  recommendations: JobMatch[];
  generatedAt: string | null;
  expiresAt: string | null;
  fresh: boolean;
  staleReasons: string[];
  hasPrimaryResume: boolean;
  generating: boolean;
};

type FunctionResponse = Partial<JobMatchState> & { error?: string };

export async function requestJobMatches(operation: MatchOperation): Promise<JobMatchState> {
  const { data, error } = await supabase.functions.invoke<FunctionResponse>("ai-job-matching", {
    body: { operation },
  });
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null) as FunctionResponse | null;
    throw new Error(body?.error || "Couldn't load AI job matches.");
  }
  if (error) throw new Error("Couldn't reach the AI job matching service.");
  if (!data || !Array.isArray(data.recommendations)) {
    throw new Error(data?.error || "The AI job matching service returned an unexpected response.");
  }
  return {
    recommendations: data.recommendations,
    generatedAt: data.generatedAt ?? null,
    expiresAt: data.expiresAt ?? null,
    fresh: data.fresh === true,
    staleReasons: Array.isArray(data.staleReasons) ? data.staleReasons : [],
    hasPrimaryResume: data.hasPrimaryResume === true,
    generating: data.generating === true,
  };
}
