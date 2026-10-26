import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { ApplicationOutletContext } from "../layout/ApplicationLayout";
import { supabase } from "../../lib/supabase";
import { formatDate, statusSlug } from "../../lib/applications";
import type { ApplicationRow, JobRow, ResumeRow } from "../../types/database";
import "./EasyApply.css";

type EasyApplyProps = {
  job: JobRow;
};

// One-click apply (like "Easy Apply"): sends one of the résumés the user already
// uploaded on My Résumés (Sprint 1) and saves the application in Supabase.
export default function EasyApply({ job }: EasyApplyProps) {
  const { user } = useOutletContext<ApplicationOutletContext>();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [justApplied, setJustApplied] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Load the user's résumés (primary first), their application to this job (if any)
  // and their account type (only job seekers can apply).
  useEffect(() => {
    let active = true;

    async function load() {
      const [resumeResult, applicationResult, profileResult] = await Promise.all([
        supabase
          .from("resumes")
          .select("*")
          .eq("user_id", user.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true }),
        supabase
          .from("applications")
          .select("*")
          .eq("job_id", job.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle(),
      ]);

      if (!active) return;

      const loadError = resumeResult.error ?? applicationResult.error ?? profileResult.error;
      if (loadError) setError(`Unable to check your application. ${loadError.message}`);

      const userResumes = resumeResult.data ?? [];
      setResumes(userResumes);
      if (userResumes.length > 0) setResumeId(userResumes[0].id); // primary résumé pre-selected
      setApplication(applicationResult.data ?? null);
      setIsRecruiter(profileResult.data?.account_type === "recruiter");
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [job.id, user.id]);

  async function handleEasyApply() {
    const resume = resumes.find((r) => r.id === resumeId);
    if (!resume || sending) return;

    setError("");
    setSending(true);

    const { data, error: insertError } = await supabase
      .from("applications")
      .insert({
        job_id: job.id,
        user_id: user.id,
        resume_id: resume.id,
        resume_file_name: resume.file_name,
      })
      .select("*")
      .single();

    setSending(false);

    if (insertError) {
      // 23505 = already applied to this job
      // 42501 = blocked by the database rules (not a job seeker, not their résumé, or job closed)
      if (insertError.code === "23505") {
        setError("You have already applied to this job.");
      } else if (insertError.code === "42501") {
        setError("This application isn't allowed. Only job seekers can apply to open jobs.");
      } else {
        setError(`Your application was not sent. ${insertError.message}`);
      }
      return;
    }

    setApplication(data);
    setJustApplied(true);
  }

  if (loading) {
    return (
      <div className="job-details__apply easy-apply">
        <p className="easy-apply__muted">Checking your application...</p>
      </div>
    );
  }

  // Already applied (or just applied): show the confirmation / current status.
  if (application) {
    return (
      <div className="job-details__apply">
        <div className="easy-apply easy-apply--done" role="status">
          <p className="easy-apply__title">
            {justApplied ? "Application sent!" : "You applied to this job"}
          </p>
          <dl className="easy-apply__details">
            <div>
              <dt>Résumé sent</dt>
              <dd>{application.resume_file_name}</dd>
            </div>
            <div>
              <dt>Applied on</dt>
              <dd>{formatDate(application.applied_at)}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{application.id.slice(0, 8).toUpperCase()}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-badge status-badge--${statusSlug(application.status)}`}>
                  {application.status}
                </span>
              </dd>
            </div>
          </dl>
          <Link className="easy-apply__link" to="/applications">
            View in My Applications
          </Link>
        </div>
      </div>
    );
  }

  if (isRecruiter) {
    return (
      <div className="job-details__apply easy-apply">
        <p className="easy-apply__muted">Recruiter accounts can't apply to jobs.</p>
      </div>
    );
  }

  if (!job.is_active) {
    return (
      <div className="job-details__apply easy-apply">
        <p className="easy-apply__muted">This job is closed and no longer accepts applications.</p>
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="job-details__apply easy-apply">
        <p className="easy-apply__muted">Upload a résumé first to apply.</p>
        <Link className="button button--primary" to="/resumes">
          Go to My Résumés
        </Link>
      </div>
    );
  }

  return (
    <div className="job-details__apply easy-apply">
      <label className="easy-apply__label" htmlFor={`resume-${job.id}`}>
        Résumé to send
      </label>
      <div className="easy-apply__row">
        <select
          id={`resume-${job.id}`}
          className="easy-apply__select"
          value={resumeId}
          onChange={(e) => setResumeId(e.target.value)}
          disabled={sending}
        >
          {resumes.map((resume) => (
            <option key={resume.id} value={resume.id}>
              {resume.label || resume.file_name}
              {resume.is_primary ? " (Primary)" : ""} · {resume.file_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button button--primary"
          onClick={() => void handleEasyApply()}
          disabled={sending}
        >
          {sending ? "Sending..." : "Easy Apply"}
        </button>
      </div>
      {error && (
        <p className="auth-message auth-message--error" role="alert">{error}</p>
      )}
    </div>
  );
}
