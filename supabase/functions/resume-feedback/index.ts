import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { Buffer } from "node:buffer";
import { generateResumeFeedback } from "./feedback.ts";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return respond({ error: "Sign in to request feedback." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const aiKey = Deno.env.get("GEMINI_API_KEY");
  if (!url || !anonKey || !aiKey) return respond({ error: "Résumé feedback has not been configured." }, 503);

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return respond({ error: "Sign in again to request feedback." }, 401);

    const body = await request.json().catch(() => null);
    const resumeId = body?.resumeId;
    if (typeof resumeId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(resumeId)) {
      return respond({ error: "Select an uploaded résumé." }, 400);
    }

    const { data: resume, error: resumeError } = await supabase.from("resumes")
      .select("file_name,file_path,file_size").eq("id", resumeId).eq("user_id", user.id).maybeSingle();
    if (resumeError) return respond({ error: "Couldn't look up the selected résumé." }, 502);
    if (!resume || !resume.file_path.startsWith(`${user.id}/`)) {
      return respond({ error: "Résumé not found." }, 404);
    }
    if (!resume.file_name.toLowerCase().endsWith(".pdf") || resume.file_size > MAX_PDF_BYTES) {
      return respond({ error: "Upload a PDF résumé up to 5 MB." }, 400);
    }

    const { data: pdf, error: fileError } = await supabase.storage.from("resumes").download(resume.file_path);
    if (fileError || !pdf) return respond({ error: "Couldn't open the selected résumé." }, 502);
    if (pdf.size > MAX_PDF_BYTES || await pdf.slice(0, 5).text() !== "%PDF-") {
      return respond({ error: "Upload a valid PDF résumé up to 5 MB." }, 400);
    }

    const { data: allowed, error: quotaError } = await supabase.rpc("claim_resume_feedback_request");
    if (quotaError) return respond({ error: "Couldn't start feedback. Try again later." }, 503);
    if (allowed !== true) return respond({ error: "You've reached the daily limit of five feedback requests. Try again tomorrow (UTC)." }, 429);

    const encoded = Buffer.from(await pdf.arrayBuffer()).toString("base64");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
    const feedback = await generateResumeFeedback(encoded, aiKey, model);
    if (!feedback.readable) return respond({ error: "Couldn't read a résumé from this PDF. Try a clear PDF with selectable text." }, 422);
    return respond({ feedback });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Résumé feedback request failed.");
    return respond({ error: "Couldn't generate feedback. Try again later." }, 502);
  }
});
