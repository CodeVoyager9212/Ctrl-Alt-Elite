import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  MATCHING_ALGORITHM_VERSION,
  assessCacheFreshness,
  generateJobMatches,
  relevantProfileFields,
  selectCandidateJobs,
  sha256,
  validateRecommendations,
} from "../supabase/functions/ai-job-matching/matching.ts";

const profile = {
  headline: "Frontend developer",
  education: "BEng Software Engineering",
  experience: "Built React applications",
  skills: "React, TypeScript, SQL",
  preferred_job_type: "Full-time",
  preferred_location: "Montreal",
};

function job(id, overrides = {}) {
  return {
    id,
    title: "Software Developer",
    company_name: "Example Inc.",
    location: "Montreal",
    work_mode: "Hybrid",
    category: "Technology",
    employment_type: "Full-time",
    summary: "Build web products",
    description: "Develop React and TypeScript applications",
    requirements: "React, TypeScript",
    responsibilities: "Implement and test features",
    posted_at: "2026-11-14T12:00:00Z",
    ...overrides,
  };
}

function completed(recommendations) {
  return Response.json({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ recommendations }) }] } }],
  });
}

const recommendation = {
  jobId: "software",
  score: 91,
  explanation: "Demonstrated React and TypeScript align with the role.",
  strengths: ["React", "TypeScript"],
  gaps: ["No cloud experience verified"],
};

test("Gemini receives the current profile, current resume, and only supplied candidate jobs", async () => {
  const jobs = [job("software")];
  const result = await generateJobMatches(profile, { kind: "text", text: "CURRENT RESUME: React project" }, jobs, "key", "model", async (url, options) => {
    assert.match(url, /models\/model:generateContent$/);
    const body = JSON.parse(options.body);
    assert.match(body.contents[0].parts[0].text, /CURRENT RESUME: React project/);
    assert.match(body.contents[0].parts[1].text, /Frontend developer/);
    assert.match(body.contents[0].parts[1].text, /software/);
    return completed([recommendation]);
  });
  assert.deepEqual(result, [recommendation]);
});

test("PDF resumes are sent as inline document data", async () => {
  await generateJobMatches(profile, { kind: "pdf", base64: "cGRm" }, [job("software")], "key", "model", async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.deepEqual(body.contents[0].parts[0].inlineData, { mimeType: "application/pdf", data: "cGRm" });
    return completed([recommendation]);
  });
});

test("invalid job IDs are rejected and duplicate recommendations are removed", () => {
  const duplicate = { ...recommendation, score: 80 };
  const invalid = { ...recommendation, jobId: "invented" };
  assert.deepEqual(validateRecommendations({ recommendations: [recommendation, duplicate, invalid] }, new Set(["software"])), [recommendation]);
});

test("invalid scores and malformed Gemini responses fail safely", () => {
  assert.throws(() => validateRecommendations({ recommendations: [{ ...recommendation, score: 101 }] }, new Set(["software"])), /unexpected format/);
  assert.throws(() => validateRecommendations({ recommendations: "none" }, new Set(["software"])), /unexpected format/);
});

test("empty Gemini recommendations are supported without fabrication", () => {
  assert.deepEqual(validateRecommendations({ recommendations: [] }, new Set(["software"])), []);
});

test("candidate selection responds to materially different profiles and preferences", () => {
  const software = job("software");
  const marketing = job("marketing", {
    title: "Marketing Coordinator",
    description: "Plan social media content and campaigns",
    requirements: "Content creation, campaign planning",
    employment_type: "Contract",
    location: "Toronto",
  });
  const marketingProfile = {
    ...profile,
    headline: "Marketing coordinator",
    experience: "Planned social media campaigns",
    skills: "Content creation, campaign planning",
    preferred_job_type: "Contract",
    preferred_location: "Toronto",
  };
  assert.equal(selectCandidateJobs([marketing, software], profile, 1)[0].id, "software");
  assert.equal(selectCandidateJobs([software, marketing], marketingProfile, 1)[0].id, "marketing");
});

test("only relevant profile fields affect the profile fingerprint", async () => {
  const source = { ...profile, full_name: "First Name", updated_at: "one", theme: "dark" };
  const unrelatedEdit = { ...source, full_name: "Second Name", updated_at: "two", theme: "light" };
  const relevantEdit = { ...source, skills: "Content creation" };
  assert.equal(await sha256(relevantProfileFields(source)), await sha256(relevantProfileFields(unrelatedEdit)));
  assert.notEqual(await sha256(relevantProfileFields(source)), await sha256(relevantProfileFields(relevantEdit)));
});

test("combined profile and primary resume changes produce distinct input fingerprints", async () => {
  const before = await sha256({ profile: relevantProfileFields(profile), resume: { id: "resume-a", path: "a.pdf" } });
  const after = await sha256({ profile: relevantProfileFields({ ...profile, skills: "Campaign planning" }), resume: { id: "resume-b", path: "b.pdf" } });
  assert.notEqual(before, after);
});

test("cache freshness covers 24-hour expiry and profile/resume/algorithm invalidation", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  const cache = {
    generated_at: "2026-11-14T11:00:00Z",
    expires_at: "2026-11-15T11:00:00Z",
    primary_resume_id: "resume-a",
    resume_fingerprint: "resume-hash",
    profile_fingerprint: "profile-hash",
    algorithm_version: MATCHING_ALGORITHM_VERSION,
  };
  assert.deepEqual(assessCacheFreshness(cache, "profile-hash", "resume-hash", "resume-a", now), { fresh: true, reasons: [] });
  assert.deepEqual(assessCacheFreshness(cache, "new-profile", "new-resume", "resume-b", now).reasons, ["primary-resume-changed", "profile-changed"]);
  assert.ok(assessCacheFreshness({ ...cache, expires_at: "2026-11-14T11:59:59Z" }, "profile-hash", "resume-hash", "resume-a", now).reasons.includes("expired"));
  assert.ok(assessCacheFreshness({ ...cache, algorithm_version: "old" }, "profile-hash", "resume-hash", "resume-a", now).reasons.includes("algorithm-changed"));
});

test("unfinished or malformed provider output is rejected", async () => {
  await assert.rejects(
    generateJobMatches(profile, { kind: "text", text: "resume" }, [job("software")], "key", "model", async () => Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] })),
    /no completed recommendations/,
  );
  await assert.rejects(
    generateJobMatches(profile, { kind: "text", text: "resume" }, [job("software")], "key", "model", async () => completed([{ ...recommendation, strengths: [5] }])),
    /unexpected format/,
  );
});

test("migration enforces private cache writes, a recoverable lock, and request-conditional completion", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202611140001_ai_job_matching.sql", import.meta.url), "utf8");
  assert.match(sql, /revoke all on table public\.ai_job_match_cache from anon, authenticated/i);
  assert.match(sql, /grant select on table public\.ai_job_match_cache to authenticated/i);
  assert.match(sql, /generation_started_at < now\(\) - interval '5 minutes'/i);
  assert.match(sql, /generation_request_id = request_id/i);
  assert.match(sql, /expires_at = now\(\) \+ interval '24 hours'/i);
  assert.match(sql, /grant execute on function public\.begin_ai_job_match_generation[\s\S]*to service_role/i);
});
