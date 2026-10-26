import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDate, statusSlug } from "../lib/applications";
import type { ApplicationRow, JobRow } from "../types/database";
import SeekerSidebar from "../components/SeekerSidebar";
import "./ProfilePage.css";
import "./ApplicationsPage.css";

type ConfirmationPageProps = {
  user: User;
};

function ApplicationConfirmationPage({ user }: ConfirmationPageProps) {
  const { applicationId = "" } = useParams();
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [job, setJob] = useState<JobRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: app, error: appError } = await supabase
        .from("applications")
        .select("*")
        .eq("id", applicationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      // 22P02 = the id in the link is not a valid id
      if (appError || !app) {
        setError(
          appError && appError.code !== "22P02"
            ? appError.message
            : "We couldn't find this application.",
        );
        setLoading(false);
        return;
      }

      const { data: jobData } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", app.job_id)
        .maybeSingle();

      if (!active) return;
      setApplication(app);
      setJob(jobData ?? null);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [applicationId, user.id]);

  return (
    <div className="dashboard-layout">
      <SeekerSidebar user={user} active="applications" />

      <main className="profile-main">
        {loading ? (
          <p className="profile-status" role="status">Loading...</p>
        ) : !application ? (
          <section className="profile-card app-card">
            <h2>Application not found</h2>
            <p className="app-muted">{error}</p>
            <Link className="button button--primary" to="/applications">
              View my applications
            </Link>
          </section>
        ) : (
          <section className="profile-card confirm-card" aria-live="polite">
            <p className="app-eyebrow">Application submitted</p>
            <h1 className="confirm-title">
              You applied to {job?.title ?? "this job"}
            </h1>
            <p className="app-muted">
              {job ? `${job.company} will review it. ` : ""}
              You can follow its status any time on My Applications.
            </p>

            <dl className="confirm-details">
              <div>
                <dt>Reference</dt>
                <dd className="confirm-ref">{application.id.slice(0, 8).toUpperCase()}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatDate(application.applied_at)}</dd>
              </div>
              <div>
                <dt>Résumé sent</dt>
                <dd>{application.resume_file_name || "—"}</dd>
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

            <div className="confirm-actions">
              <Link className="button button--primary" to="/applications">
                View my applications
              </Link>
              <Link className="button button--secondary" to="/applications#more-jobs">
                Apply to another job
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default ApplicationConfirmationPage;
