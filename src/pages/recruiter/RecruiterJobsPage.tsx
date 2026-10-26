
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { JobRow } from "../../types/database";
import "./RecruiterJobsPage.css";

type Filter = "All" | "Active" | "Closed";

type RecruiterContext = {
  user: User;
};

export default function RecruiterJobsPage() {
  const { user } = useOutletContext<RecruiterContext>();

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [applicantCounts, setApplicantCounts] = useState<
    Record<string, number>
  >({});

  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      setLoading(true);
      setError("");

      // Load only jobs owned by the current recruiter.
      const { data, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("recruiter_id", user.id)
        .order("posted_at", { ascending: false });

      if (!active) return;

      if (jobsError) {
        setError(
          `Unable to load your job postings. ${jobsError.message}`
        );
        setLoading(false);
        return;
      }

      const ownedJobs = data ?? [];
      setJobs(ownedJobs);

      if (ownedJobs.length === 0) {
        setApplicantCounts({});
        setLoading(false);
        return;
      }

      // Count applications associated with owned jobs.
      const jobIds = ownedJobs.map((job) => job.id);

      const { data: applications, error: appsError } =
        await supabase
          .from("applications")
          .select("job_id")
          .in("job_id", jobIds);

      if (!active) return;

      if (appsError) {
        setError(
          `Jobs loaded, but applicant counts could not be retrieved. ${appsError.message}`
        );
        setApplicantCounts({});
      } else {
        const counts: Record<string, number> = {};

        for (const job of ownedJobs) {
          counts[job.id] = 0;
        }

        for (const application of applications ?? []) {
          counts[application.job_id] =
            (counts[application.job_id] ?? 0) + 1;
        }

        setApplicantCounts(counts);
      }

      setLoading(false);
    }

    void loadJobs();

    return () => {
      active = false;
    };
  }, [user.id]);

  const filteredJobs = useMemo(() => {
    if (filter === "Active") {
      return jobs.filter((job) => job.is_active);
    }

    if (filter === "Closed") {
      return jobs.filter((job) => !job.is_active);
    }

    return jobs;
  }, [jobs, filter]);

  const activeCount = jobs.filter(
    (job) => job.is_active
  ).length;

  const closedCount = jobs.length - activeCount;

  function formatPostedDate(date: string) {
    return new Date(date).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <main className="recruiter-jobs">
      <header className="recruiter-jobs__heading">
        <div>
          <p className="recruiter-jobs__eyebrow">
            Manage your opportunities
          </p>
          <h1>My Job Postings</h1>
          <p className="recruiter-jobs__description">
            View your job postings and manage applications
            received from candidates.
          </p>
        </div>

        <Link
          className="button button--primary"
          to="/recruiter/jobs/new"
        >
          + Create Job
        </Link>
      </header>

      {error && (
        <p
          className="auth-message auth-message--error"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="recruiter-jobs__filters">
        {(
          [
            ["All", jobs.length],
            ["Active", activeCount],
            ["Closed", closedCount],
          ] as const
        ).map(([name, count]) => (
          <button
            key={name}
            type="button"
            className={
              filter === name
                ? "recruiter-jobs__filter recruiter-jobs__filter--active"
                : "recruiter-jobs__filter"
            }
            onClick={() => setFilter(name)}
          >
            {name}
            <span>{count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="recruiter-jobs__message">
          Loading your job postings...
        </p>
      ) : filteredJobs.length === 0 ? (
        <section className="recruiter-jobs__empty">
          <h2>
            {jobs.length === 0
              ? "No job postings yet"
              : `No ${filter.toLowerCase()} jobs`}
          </h2>

          <p>
            {jobs.length === 0
              ? "Create your first job posting to start receiving applications."
              : "There are no job postings in this category."}
          </p>

          {jobs.length === 0 && (
            <Link
              className="button button--primary"
              to="/recruiter/jobs/new"
            >
              Create Job
            </Link>
          )}
        </section>
      ) : (
        <div className="recruiter-jobs__grid">
          {filteredJobs.map((job) => (
            <article
              key={job.id}
              className="recruiter-jobs__card"
            >
              <div className="recruiter-jobs__card-top">
                <div>
                  <h2>{job.title}</h2>
                  <p>{job.company_name}</p>
                </div>

                <span
                  className={
                    job.is_active
                      ? "recruiter-jobs__status recruiter-jobs__status--active"
                      : "recruiter-jobs__status recruiter-jobs__status--closed"
                  }
                >
                  {job.is_active ? "Active" : "Closed"}
                </span>
              </div>

              <p className="recruiter-jobs__details">
                {job.location} · {job.work_mode} ·{" "}
                {job.employment_type}
              </p>

              <div className="recruiter-jobs__meta">
                <span>
                  Posted {formatPostedDate(job.posted_at)}
                </span>

                <strong>
                  {error
                    ? "Applicants unavailable"
                    : `${applicantCounts[job.id] ?? 0} applicants`}
                </strong>
              </div>

              <div className="recruiter-jobs__actions">
                <Link
                  className="button button--primary"
                  to={`/recruiter/jobs/${job.id}/applicants`}
                >
                  View Applicants
                </Link>

                <Link
                  className="recruiter-jobs__edit"
                  to={`/recruiter/jobs/${job.id}`}
                >
                  View / Edit
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
