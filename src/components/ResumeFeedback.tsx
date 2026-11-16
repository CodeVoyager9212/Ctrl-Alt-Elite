import { useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { ResumeFeedback as Feedback } from "../../supabase/functions/resume-feedback/feedback.ts";

export default function ResumeFeedback({ resumeId }: { resumeId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState("");

  async function requestFeedback() {
    setConfirming(false);
    setLoading(true);
    setFeedback(null);
    setError("");
    try {
      const { data, error: requestError } = await supabase.functions.invoke<{ feedback: Feedback }>("resume-feedback", {
        body: { resumeId },
      });
      if (requestError instanceof FunctionsHttpError) {
        const body = await requestError.context.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Couldn't generate feedback.");
      }
      if (requestError || !data?.feedback) throw new Error("Couldn't reach the résumé feedback service.");
      setFeedback(data.feedback);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Couldn't generate feedback.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="resume-feedback" aria-label="AI résumé feedback">
      {!confirming && !loading && (
        <button className="button button--secondary" type="button" onClick={() => setConfirming(true)}>
          {feedback ? "Get new AI feedback" : "Get AI feedback"}
        </button>
      )}
      {confirming && (
        <div>
          <p>CareerConnect will send this full PDF to Google Gemini. Google may use free-tier submissions to improve its products.</p>
          <button className="button button--primary" type="button" onClick={() => void requestFeedback()}>Send PDF for feedback</button>{" "}
          <button className="button button--secondary" type="button" onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      )}
      {loading && <p role="status">Analyzing your résumé…</p>}
      {error && <p role="alert">{error}</p>}
      {feedback && (
        <div aria-live="polite">
          {([
            ["Strengths", feedback.strengths],
            ["Areas to improve", feedback.improvements],
            ["Suggested bullet rewrites", feedback.rewrites],
          ] as const).map(([label, items]) => (
            <section key={label}>
              <h3>{label}</h3>
              {items.length > 0
                ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
                : <p>No suggestions for this section.</p>}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
