import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { ApplicationOutletContext } from "../components/layout/ApplicationLayout";
import { supabase } from "../lib/supabase";
import {
  ALL_STATUSES,
  STATUS_STEPS,
  daysInStatusLabel,
  formatDate,
  statusSlug,
} from "../lib/applications";
import type { ApplicationRow, ApplicationStatus, JobRow } from "../types/database";
import "./ProfilePage.css";
import "./ApplicationsPage.css";

type Filter = "All" | ApplicationStatus;

// Progress bar: Applied -> Under Review -> Interview -> Offered (Rejected is shown in red).
function StatusTracker({ status }: { status: ApplicationStatus }) {
  const rejected = status === "Rejected";
  const currentStep = STATUS_STEPS.indexOf(status);

  return (
    <ol className={rejected ? "tracker tracker--rejected" : "tracker"} aria-label={`Status: ${status}`}>
      {STATUS_STEPS.map((step, i) => {
        let className = "tracker__step";
        if (!rejected && i < currentStep) className += " tracker__step--done";
        if (!rejected && i === currentStep) className += " tracker__step--current";

        return (
          <li key={step} className={className}>
            <span className="tracker__dot" aria-hidden="true" />
            <span className="tracker__label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ApplicationsPage() {
  const { user } = useOutletContext<ApplicationOutletContext>();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the user's applications (newest first), then the jobs they applied to.
  useEffect(() => {
    let active = true;

    async function load() {
      const { data: apps, error: appError } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false });

      if (!active) return;
      if (appError) {
        setError(`Unable to load your applications. ${appError.message}`);
        setLoading(false);
        return;
      }

      const jobIds = (apps ?? []).map((a) => a.job_id);
      let jobRows: JobRow[] = [];
      if (jobIds.length > 0) {
        const { data, error: jobError } = await supabase
          .from("jobs")
          .select("*")
          .in("id", jobIds);
        if (!active) return;
        if (jobError) setError(`Unable to load the job details. ${jobError.message}`);
        jobRows = data ?? [];
      }

      setApplications(apps ?? []);
      setJobs(jobRows);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [user.id]);

  function findJob(jobId: string) {
    return jobs.find((job) => job.id === jobId);
  }

  function countFor(f: Filter) {
    if (f === "All") return applications.length;
    return applications.filter((a) => a.status === f).length;
  }

  const shownApplications =
    filter === "All" ? applications : applications.filter((a) => a.status === filter);

  return (
    <main className="profile-main">
      <header className="profile-heading">
        <p>Track your job search</p>
        <h1>My Applications</h1>
      </header>

      {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}

      <div className="app-filters" role="tablist" aria-label="Filter by status">
        {(["All", ...ALL_STATUSES] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={filter === f ? "app-filter app-filter--active" : "app-filter"}
            onClick={() => setFilter(f)}
          >
            {f}
            <span className="app-filter__count">{countFor(f)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="profile-status" role="status">Loading your applications...</p>
      ) : shownApplications.length === 0 ? (
        <section className="profile-card app-card">
          {applications.length === 0 ? (
            <>
              <p className="app-muted">You haven't applied to any jobs yet.</p>
              <Link className="button button--primary" to="/find-jobs">
                Find jobs
              </Link>
            </>
          ) : (
            <p className="app-muted">No applications with status "{filter}".</p>
          )}
        </section>
      ) : (
        <ul className="app-list">
          {shownApplications.map((application) => {
            const job = findJob(application.job_id);
            return (
              <li className="profile-card app-item" key={application.id}>
                <div className="app-item__head">
                  <div>
                    <h2>{job ? job.title : "Job no longer available"}</h2>
                    <p className="app-muted">
                      {job ? `${job.company_name} · ${job.location}` : "This posting was removed"}
                    </p>
                  </div>
                  <span className={`status-badge status-badge--${statusSlug(application.status)}`}>
                    {application.status}
                  </span>
                </div>

                <StatusTracker status={application.status} />

                <div className="app-item__meta">
                  <span>Applied {formatDate(application.applied_at)}</span>
                  <span>
                    {application.status} {daysInStatusLabel(application.status_changed_at)}
                  </span>
                  <span>Résumé: {application.resume_file_name || "—"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default ApplicationsPage;
