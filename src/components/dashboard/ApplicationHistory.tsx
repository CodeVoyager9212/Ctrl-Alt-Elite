import { Link } from "react-router-dom";
import { formatDate, statusSlug } from "../../lib/applications";
import type { ApplicationRow, JobRow } from "../../types/database";

type ApplicationHistoryProps = {
  applications: ApplicationRow[];
  jobsById: Map<string, JobRow>;
  detailsUnavailable: boolean;
};

export default function ApplicationHistory({
  applications,
  jobsById,
  detailsUnavailable,
}: ApplicationHistoryProps) {
  return (
    <section className="dashboard-panel dashboard-history-panel">
      <div className="dashboard-panel__heading dashboard-history-panel__heading">
        <div>
          <p>Your timeline</p>
          <h2>Application history</h2>
        </div>

        {applications.length > 0 && (
          <Link className="dashboard-text-link" to="/applications">
            Detailed tracking
          </Link>
        )}
      </div>

      {detailsUnavailable && (
        <p role="status">Some job details could not be loaded. Your application history is still available.</p>
      )}

      {applications.length === 0 ? (
        <div className="dashboard-history-empty">
          <h3>No applications yet</h3>
          <p>
            Your application history will appear here once you start applying to jobs.
          </p>
          <Link className="button button--primary" to="/find-jobs">
            Find jobs
          </Link>
        </div>
      ) : (
        <div className="dashboard-history-list">
          {applications.map((application) => {
            const job = jobsById.get(application.job_id);

            return (
              <article className="dashboard-history-item" key={application.id}>
                <div className="dashboard-history-item__marker" aria-hidden="true" />

                <div className="dashboard-history-item__content">
                  <div className="dashboard-history-item__heading">
                    <div>
                      <h3>{job?.title ?? "Job no longer available"}</h3>
                      <p>
                        {job
                          ? `${job.company_name} · ${job.location}`
                          : "Posting details unavailable"}
                      </p>
                    </div>

                    <span
                      className={`status-badge status-badge--${statusSlug(
                        application.status,
                      )}`}
                    >
                      {application.status}
                    </span>
                  </div>

                  <div className="dashboard-history-item__meta">
                    <span>Applied {formatDate(application.applied_at)}</span>
                    <span>
                      {application.status_changed_at && Number.isFinite(Date.parse(application.status_changed_at))
                        ? `Status changed ${formatDate(application.status_changed_at)}`
                        : "Status change date unavailable"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
