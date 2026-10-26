
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
import type {
  ApplicationRow,
  ApplicationStatus,
  JobRow,
  ResumeRow,
} from "../types/database";
import "./ProfilePage.css";
import "./ApplicationsPage.css";

type Filter = "All" | ApplicationStatus;

// Progress bar:
// Applied -> Under Review -> Interview -> Offered
// Rejected is displayed separately in red.
function StatusTracker({ status }: { status: ApplicationStatus }) {
  const rejected = status === "Rejected";
  const currentStep = STATUS_STEPS.indexOf(status);

  return (
    <ol
      className={rejected ? "tracker tracker--rejected" : "tracker"}
      aria-label={`Status: ${status}`}
    >
      {STATUS_STEPS.map((step, i) => {
        let className = "tracker__step";

        if (!rejected && i < currentStep) {
          className += " tracker__step--done";
        }

        if (!rejected && i === currentStep) {
          className += " tracker__step--current";
        }

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
  const [resumes, setResumes] = useState<ResumeRow[]>([]);

  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the current user's applications, associated jobs,
  // and the resumes used when applying.
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      // 1. Load applications for the current job seeker.
      const { data: apps, error: appError } = await supabase
        .from("applications")
        .select("*")
        .eq("applicant_id", user.id)
        .order("applied_at", { ascending: false });

      if (!active) return;

      if (appError) {
        setError(`Unable to load your applications. ${appError.message}`);
        setLoading(false);
        return;
      }

      const userApplications = apps ?? [];

      // 2. Collect the unique job IDs and resume IDs.
      const jobIds = [
        ...new Set(userApplications.map((app) => app.job_id)),
      ];

      const resumeIds = [
        ...new Set(userApplications.map((app) => app.resume_id)),
      ];

      let jobRows: JobRow[] = [];
      let resumeRows: ResumeRow[] = [];

      // 3. Load associated jobs and resumes.
      const [jobResult, resumeResult] = await Promise.all([
        jobIds.length > 0
          ? supabase
              .from("jobs")
              .select("*")
              .in("id", jobIds)
          : Promise.resolve({
              data: [] as JobRow[],
              error: null,
            }),

        resumeIds.length > 0
          ? supabase
              .from("resumes")
              .select("*")
              .eq("user_id", user.id)
              .in("id", resumeIds)
          : Promise.resolve({
              data: [] as ResumeRow[],
              error: null,
            }),
      ]);

      if (!active) return;

      if (jobResult.error) {
        setError(
          `Unable to load job details. ${jobResult.error.message}`
        );
      }

      if (resumeResult.error) {
        setError((previous) =>
          previous
            ? `${previous} Unable to load résumé details. ${resumeResult.error.message}`
            : `Unable to load résumé details. ${resumeResult.error.message}`
        );
      }

      jobRows = jobResult.data ?? [];
      resumeRows = resumeResult.data ?? [];

      setApplications(userApplications);
      setJobs(jobRows);
      setResumes(resumeRows);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [user.id]);

  // Find job details associated with the application.
  function findJob(jobId: string) {
    return jobs.find((job) => job.id === jobId);
  }

  // Find the filename of the resume submitted with an application.
  function findResumeFileName(resumeId: string) {
    const resume = resumes.find((item) => item.id === resumeId);
    return resume?.file_name ?? "Résumé unavailable";
  }

  // Count applications for each status filter.
  function countFor(f: Filter) {
    if (f === "All") {
      return applications.length;
    }

    return applications.filter((app) => app.status === f).length;
  }

  // Display only applications matching the selected filter.
  const shownApplications =
    filter === "All"
      ? applications
      : applications.filter((app) => app.status === filter);

  return (
    <main className="profile-main">
      <header className="profile-heading">
        <p>Track your job search</p>
        <h1>My Applications</h1>
      </header>

      {error && (
        <p
          className="auth-message auth-message--error"
          role="alert"
        >
          {error}
        </p>
      )}

      <div
        className="app-filters"
        role="tablist"
        aria-label="Filter by status"
      >
        {(["All", ...ALL_STATUSES] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={
              filter === f
                ? "app-filter app-filter--active"
                : "app-filter"
            }
            onClick={() => setFilter(f)}
          >
            {f}
            <span className="app-filter__count">
              {countFor(f)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="profile-status" role="status">
          Loading your applications...
        </p>
      ) : shownApplications.length === 0 ? (
        <section className="profile-card app-card">
          {applications.length === 0 ? (
            <>
              <p className="app-muted">
                You haven't applied to any jobs yet.
              </p>

              <Link
                className="button button--primary"
                to="/find-jobs"
              >
                Find jobs
              </Link>
            </>
          ) : (
            <p className="app-muted">
              No applications with status "{filter}".
            </p>
          )}
        </section>
      ) : (
        <ul className="app-list">
          {shownApplications.map((application) => {
            const job = findJob(application.job_id);

            const resumeFileName = findResumeFileName(
              application.resume_id
            );

            return (
              <li
                className="profile-card app-item"
                key={application.id}
              >
                <div className="app-item__head">
                  <div>
                    <h2>
                      {job
                        ? job.title
                        : "Job no longer available"}
                    </h2>

                    <p className="app-muted">
                      {job
                        ? `${job.company_name} · ${job.location}`
                        : "This posting was removed"}
                    </p>
                  </div>

                  <span
                    className={`status-badge status-badge--${statusSlug(
                      application.status
                    )}`}
                  >
                    {application.status}
                  </span>
                </div>

                <StatusTracker status={application.status} />

                <div className="app-item__meta">
                  <span>
                    Applied {formatDate(application.applied_at)}
                  </span>

                  <span>
                    {application.status}{" "}
                    {daysInStatusLabel(
                      application.status_changed_at
                    )}
                  </span>

                  <span>
                    Résumé: {resumeFileName}
                  </span>
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
