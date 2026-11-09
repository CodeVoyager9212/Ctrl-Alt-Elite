
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { ApplicationOutletContext } from "../layout/ApplicationLayout";
import { supabase } from "../../lib/supabase";
import { formatDate, statusSlug } from "../../lib/applications";
import type {
  ApplicationDraftRow,
  ApplicationRow,
  JobRow,
  ResumeRow,
} from "../../types/database";
import "./EasyApply.css";

type EasyApplyProps = {
  job: JobRow;
};

// Easy Apply allows job seekers to submit one of their uploaded
// resumes and track the application in Supabase.
export default function EasyApply({ job }: EasyApplyProps) {
  const { user } = useOutletContext<ApplicationOutletContext>();

  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [draft, setDraft] = useState<ApplicationDraftRow | null>(null);
  const [submittedResumeName, setSubmittedResumeName] = useState("");
  const [justApplied, setJustApplied] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setApplication(null);
      setDraft(null);
      setSubmittedResumeName("");
      setResumeId("");
      setJustApplied(false);

      const [resumeResult, applicationResult, profileResult, draftResult] =
        await Promise.all([
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
            .eq("applicant_id", user.id)
            .maybeSingle(),

          supabase
            .from("profiles")
            .select("account_type")
            .eq("id", user.id)
            .maybeSingle(),

          // Application saved earlier but not submitted.
          supabase
            .from("application_drafts")
            .select("*")
            .eq("job_id", job.id)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

      if (!active) return;

      const loadError =
        resumeResult.error ??
        applicationResult.error ??
        profileResult.error ??
        draftResult.error;

      if (loadError) {
        setError(
          `Unable to check your application. ${loadError.message}`
        );
      }

      const userResumes = resumeResult.data ?? [];

      setResumes(userResumes);

      const savedDraft = draftResult.data ?? null;
      setDraft(savedDraft);

      // Select the resume from the saved draft,
      // otherwise the primary resume.
      const draftResume = userResumes.find(
        (resume) => resume.id === savedDraft?.resume_id
      );

      if (draftResume) {
        setResumeId(draftResume.id);
      } else if (userResumes.length > 0) {
        setResumeId(userResumes[0].id);
      }

      const existingApplication = applicationResult.data ?? null;
      setApplication(existingApplication);

      // Look up the submitted resume's filename.
      if (existingApplication) {
        const submittedResume = userResumes.find(
          (resume) => resume.id === existingApplication.resume_id
        );

        setSubmittedResumeName(
          submittedResume?.file_name ?? "Résumé unavailable"
        );
      }

      setIsRecruiter(
        profileResult.data?.account_type === "recruiter"
      );

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [job.id, user.id]);

  async function handleEasyApply() {
    const resume = resumes.find((r) => r.id === resumeId);

    if (!resume || sending || isRecruiter || !job.is_active || error) {
      return;
    }

    setError("");
    setSending(true);

    const { data, error: insertError } = await supabase
      .from("applications")
      .insert({
        job_id: job.id,
        applicant_id: user.id,
        resume_id: resume.id,
      })
      .select("*")
      .single();

    setSending(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You have already applied to this job.");
      } else if (insertError.code === "42501") {
        setError(
          "This application isn't allowed. Only job seekers can apply to open jobs using their own résumé."
        );
      } else {
        setError(
          `Your application was not sent. ${insertError.message}`
        );
      }

      return;
    }

    // The database removes the saved draft once the application is sent.
    setDraft(null);
    setApplication(data);
    setSubmittedResumeName(resume.file_name);
    setJustApplied(true);
  }

  // Save the application without submitting it.
  // The database creates an "incomplete application" reminder.
  async function handleSaveDraft() {
    const resume = resumes.find((r) => r.id === resumeId);

    if (!resume || savingDraft || sending || draft || error) {
      return;
    }

    setError("");
    setSavingDraft(true);

    const { data, error: insertError } = await supabase
      .from("application_drafts")
      .insert({
        user_id: user.id,
        job_id: job.id,
        resume_id: resume.id,
      })
      .select("*")
      .single();

    setSavingDraft(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You already saved this application.");
      } else if (insertError.code === "42501") {
        setError(
          "This application can't be saved. Only job seekers can save applications to open jobs using their own résumé."
        );
      } else {
        setError(
          `Your application was not saved. ${insertError.message}`
        );
      }

      return;
    }

    setDraft(data);
  }

  if (loading) {
    return (
      <div className="job-details__apply easy-apply">
        <p className="easy-apply__muted">
          Checking your application...
        </p>
      </div>
    );
  }

  // Existing or successfully submitted application.
  if (application) {
    return (
      <div className="job-details__apply">
        <div
          className="easy-apply easy-apply--done"
          role="status"
        >
          <p className="easy-apply__title">
            {justApplied
              ? "Application sent!"
              : "You applied to this job"}
          </p>

          <dl className="easy-apply__details">
            <div>
              <dt>Résumé sent</dt>
              <dd>{submittedResumeName}</dd>
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
                <span
                  className={`status-badge status-badge--${statusSlug(
                    application.status
                  )}`}
                >
                  {application.status}
                </span>
              </dd>
            </div>
          </dl>

          <Link
            className="easy-apply__link"
            to="/applications"
          >
            View in My Applications
          </Link>
        </div>
      </div>
    );
  }

  if (isRecruiter) {
    return (
      <div className="job-details__apply easy-apply">
        <p className="easy-apply__muted">
          Recruiter accounts can't apply to jobs.
        </p>
      </div>
    );
  }

  if (!job.is_active) {
    return (
      <div className="job-details__apply easy-apply">
        <p className="easy-apply__muted">
          This job is closed and no longer accepts applications.
        </p>
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="job-details__apply easy-apply">
        <p className="easy-apply__muted">
          Upload a résumé first to apply.
        </p>

        <Link
          className="button button--primary"
          to="/resumes"
        >
          Go to My Résumés
        </Link>
      </div>
    );
  }

  return (
    <div className="job-details__apply easy-apply">
      <label
        className="easy-apply__label"
        htmlFor={`resume-${job.id}`}
      >
        Résumé to send
      </label>

      <div className="easy-apply__row">
        <select
          id={`resume-${job.id}`}
          className="easy-apply__select"
          value={resumeId}
          onChange={(e) => setResumeId(e.target.value)}
          disabled={sending || savingDraft || Boolean(error)}
        >
          {resumes.map((resume) => (
            <option key={resume.id} value={resume.id}>
              {resume.label || resume.file_name}
              {resume.is_primary ? " (Primary)" : ""}
              {" · "}
              {resume.file_name}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="button button--primary"
          onClick={() => void handleEasyApply()}
          disabled={sending || savingDraft || Boolean(error)}
        >
          {sending ? "Sending..." : "Easy Apply"}
        </button>
      </div>

      {draft ? (
        <p className="easy-apply__muted">
          Application saved on {formatDate(draft.saved_at)} but not
          submitted yet. Click Easy Apply to finish.
        </p>
      ) : (
        <button
          type="button"
          className="easy-apply__save"
          onClick={() => void handleSaveDraft()}
          disabled={sending || savingDraft || Boolean(error)}
        >
          {savingDraft ? "Saving..." : "Save and finish later"}
        </button>
      )}

      {error && (
        <p
          className="auth-message auth-message--error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
