import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { requestJobMatches, type JobMatch, type JobMatchState } from "../../services/aiJobMatchingService";
import type { JobRow } from "../../types/database";

type Props = {
  onViewJob: (job: JobRow) => void;
};

function staleMessage(reasons: string[]) {
  if (reasons.includes("primary-resume-changed") && reasons.includes("profile-changed")) {
    return "Your primary resume and profile changed since these matches were generated.";
  }
  if (reasons.includes("primary-resume-changed")) {
    return "Your primary resume changed since these matches were generated.";
  }
  if (reasons.includes("profile-changed")) {
    return "Your matching profile information changed since these matches were generated.";
  }
  if (reasons.includes("algorithm-changed")) return "CareerConnect's matching method has been updated.";
  return "These matches are more than 24 hours old.";
}

function MatchCard({ match, onViewJob }: { match: JobMatch; onViewJob: Props["onViewJob"] }) {
  return (
    <article className="ai-match-card">
      <div className="ai-match-card__score" aria-label={`${match.score} percent qualification match`}>
        <strong>{match.score}%</strong>
        <span>match</span>
      </div>
      <div className="ai-match-card__content">
        <p className="ai-match-card__company">{match.job.company_name}</p>
        <h3>{match.job.title}</h3>
        <p className="ai-match-card__location">{match.job.location} · {match.job.work_mode}</p>
        <p>{match.explanation}</p>
        {match.strengths.length > 0 && (
          <div><strong>Matching strengths</strong><ul>{match.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
        )}
        {match.gaps.length > 0 && (
          <div><strong>Missing or unverified</strong><ul>{match.gaps.map((item) => <li key={item}>{item}</li>)}</ul></div>
        )}
        <button type="button" className="job-card__button" onClick={() => onViewJob(match.job)}>View job</button>
      </div>
    </article>
  );
}

export default function AiJobMatches({ onViewJob }: Props) {
  const [state, setState] = useState<JobMatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSaved() {
      try {
        const saved = await requestJobMatches("get");
        if (active) setState(saved);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Couldn't load AI job matches.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadSaved();
    return () => { active = false; };
  }, []);

  async function generate(operation: "generate" | "refresh") {
    if (generating) return;
    setGenerating(true);
    setError("");
    try {
      setState(await requestJobMatches(operation));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Couldn't generate AI job matches.");
    } finally {
      setGenerating(false);
    }
  }

  const hasSaved = Boolean(state?.generatedAt);
  const stale = hasSaved && state?.fresh === false;

  return (
    <section className="ai-matches" aria-labelledby="ai-matches-title">
      <div className="ai-matches__header">
        <div>
          <span className="job-filters__eyebrow">Personalized discovery</span>
          <h2 id="ai-matches-title">AI Matches</h2>
          <p>CareerConnect compares your current profile and primary resume with available jobs.</p>
        </div>
        {hasSaved && state?.hasPrimaryResume && (
          <button className="job-card__button" type="button" disabled={generating || state.generating} onClick={() => void generate("refresh")}>
            {generating ? "Analyzing…" : stale ? "Regenerate Matches" : "Refresh Matches"}
          </button>
        )}
      </div>

      {loading && <p className="ai-matches__status" role="status">Loading saved matches…</p>}
      {!loading && state && !state.hasPrimaryResume && (
        <div className="ai-matches__notice ai-matches__notice--warning">
          <p><strong>A primary resume is required.</strong> Select one before generating matches.</p>
          <Link to="/resumes">Manage resumes</Link>
        </div>
      )}
      {!loading && stale && state && (
        <div className="ai-matches__notice ai-matches__notice--warning" role="status">
          <strong>Matches are outdated.</strong> {staleMessage(state.staleReasons)} Your saved results remain visible until regeneration succeeds.
        </div>
      )}
      {error && <div className="ai-matches__notice ai-matches__notice--error" role="alert">{error} You can retry without losing saved matches.</div>}
      {generating && <p className="ai-matches__status" role="status">Analyzing your current profile, primary resume, and eligible jobs…</p>}
      {!generating && state?.generating && <p className="ai-matches__status" role="status">Matches are currently being generated in another tab. Refresh this page shortly to see them.</p>}

      {!loading && state?.hasPrimaryResume && !hasSaved && !generating && !state.generating && (
        <div className="ai-matches__empty">
          <p>Generate ranked suggestions with qualification strengths and gaps. Results are saved until you choose to refresh them.</p>
          <button className="job-card__button" type="button" onClick={() => void generate("generate")}>Generate My Matches</button>
        </div>
      )}

      {hasSaved && state && (
        <>
          <p className="ai-matches__timestamp">Generated {new Date(state.generatedAt!).toLocaleString()} · Scores estimate qualification alignment, not offer probability.</p>
          {state.recommendations.length === 0 ? (
            <div className="ai-matches__empty"><p>No suitable currently available jobs were found. CareerConnect did not fabricate alternatives.</p></div>
          ) : (
            <div className="ai-matches__grid">
              {state.recommendations.map((match) => <MatchCard key={match.jobId} match={match} onViewJob={onViewJob} />)}
            </div>
          )}
        </>
      )}
    </section>
  );
}
