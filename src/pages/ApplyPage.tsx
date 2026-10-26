import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { JobRow, ResumeRow } from "../types/database";
import SeekerSidebar from "../components/SeekerSidebar";
import "./ProfilePage.css";
import "./ResumePage.css";
import "./ApplicationsPage.css";

type ApplyPageProps = {
  user: User;
};

const COVER_LETTER_MAX = 2000;

function ApplyPage({ user }: ApplyPageProps) {
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobRow | null>(null);
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [existingApplicationId, setExistingApplicationId] = useState<string | null>(null);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [resumeId, setResumeId] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  // Load the job, the user's résumés (primary first), any earlier application to this job,
  // and the account type (only job seekers can apply).
  useEffect(() => {
    let active = true;

    async function load() {
      const [jobResult, resumeResult, existingResult, profileResult] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", jobId).maybeSingle(),
        supabase
          .from("resumes")
          .select("*")
          .eq("user_id", user.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true }),
        supabase
          .from("applications")
          .select("id")
          .eq("job_id", jobId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle(),
      ]);

      if (!active) return;

      // 22P02 = the job id in the link is not a valid id -> just show "Job not found"
      const jobError = jobResult.error?.code === "22P02" ? null : jobResult.error;
      const firstError =
        jobError ?? resumeResult.error ?? existingResult.error ?? profileResult.error;
      if (firstError) setLoadError(`Unable to load this page. ${firstError.message}`);

      setJob(jobResult.data ?? null);
      const userResumes = resumeResult.data ?? [];
      setResumes(userResumes);
      if (userResumes.length > 0) setResumeId(userResumes[0].id); // primary résumé pre-selected
      setExistingApplicationId(existingResult.data?.id ?? null);
      setIsRecruiter(profileResult.data?.account_type === "recruiter");
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [jobId, user.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job || submitting) return;

    const resume = resumes.find((r) => r.id === resumeId);
    if (!resume) {
      setError("Choose a résumé to send with your application.");
      return;
    }

    setError("");
    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from("applications")
      .insert({
        job_id: job.id,
        user_id: user.id,
        resume_id: resume.id,
        resume_file_name: resume.file_name,
        cover_letter: coverLetter.trim(),
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (insertError) {
      // 23505 = this user already applied to this job
      // 42501 = blocked by the database rules (not a job seeker, or not their résumé)
      if (insertError.code === "23505") {
        setError("You have already applied to this job.");
      } else if (insertError.code === "42501") {
        setError("Only job seekers can apply, using one of their own résumés.");
      } else {
        setError(`Your application was not sent. ${insertError.message}`);
      }
      return;
    }

    navigate(`/applications/${data.id}/confirmation`, { replace: true });
  }

  return (
    <div className="dashboard-layout">
      <SeekerSidebar user={user} active="applications" />

      <main className="profile-main">
        <header className="profile-heading">
          <p>Job application</p>
          <h1>Apply</h1>
        </header>

        {loadError && (
          <p className="auth-message auth-message--error" role="alert">{loadError}</p>
        )}

        {loading ? (
          <p className="profile-status" role="status">Loading the job...</p>
        ) : loadError ? null : !job ? (
          <section className="profile-card app-card">
            <h2>Job not found</h2>
            <p className="app-muted">This posting may have been removed.</p>
            <Link className="button button--primary" to="/applications">
              Back to my applications
            </Link>
          </section>
        ) : (
          <div className="apply-layout">
            <section className="profile-card app-job" aria-label="Job details">
              <p className="app-eyebrow">{job.category || "Job"} · {job.job_type || "Open"}</p>
              <h2>{job.title}</h2>
              <p className="app-muted">{job.company} · {job.location || "Location not listed"}</p>
              <p className="app-job__description">{job.description}</p>
            </section>

            {isRecruiter ? (
              <section className="profile-card app-card">
                <h2>Recruiter account</h2>
                <p className="app-muted">Only job seeker accounts can apply to jobs.</p>
              </section>
            ) : existingApplicationId ? (
              <section className="profile-card app-card">
                <h2>You already applied</h2>
                <p className="app-muted">You can follow its status on My Applications.</p>
                <Link className="button button--primary" to="/applications">
                  View my applications
                </Link>
              </section>
            ) : resumes.length === 0 ? (
              <section className="profile-card app-card">
                <h2>Upload a résumé first</h2>
                <p className="app-muted">You need at least one résumé to apply.</p>
                <Link className="button button--primary" to="/resumes">
                  Go to My Résumés
                </Link>
              </section>
            ) : (
              <form className="profile-card app-card apply-form" onSubmit={handleSubmit}>
                <h2>Your application</h2>

                <fieldset className="apply-resumes">
                  <legend>Résumé to send</legend>
                  {resumes.map((resume) => (
                    <label className="apply-resume" key={resume.id}>
                      <input
                        type="radio"
                        name="resume"
                        value={resume.id}
                        checked={resumeId === resume.id}
                        onChange={() => setResumeId(resume.id)}
                        disabled={submitting}
                      />
                      <span>
                        <strong>
                          {resume.label || resume.file_name}
                          {resume.is_primary && <span className="resume-badge">Primary</span>}
                        </strong>
                        <small>{resume.file_name}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>

                <div className="form-group">
                  <label htmlFor="cover-letter">Cover letter (optional)</label>
                  <textarea
                    id="cover-letter"
                    value={coverLetter}
                    maxLength={COVER_LETTER_MAX}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Tell the recruiter why you're a good fit"
                    disabled={submitting}
                  />
                  <small className="app-muted">
                    {coverLetter.length}/{COVER_LETTER_MAX}
                  </small>
                </div>

                {error && (
                  <p className="auth-message auth-message--error" role="alert">{error}</p>
                )}

                <button className="button button--primary" type="submit" disabled={submitting}>
                  {submitting ? "Sending..." : "Submit application"}
                </button>
              </form>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

export default ApplyPage;
