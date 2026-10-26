
import type { JobRow } from "../../types/database";
import EasyApply from "./EasyApply";

type JobDetailsPanelProps = {
  job: JobRow | null;
  onClose: () => void;
};

function formatSalary(job: JobRow): string {
  if (job.salary_min === null && job.salary_max === null) {
    return "Salary not specified";
  }

  const formatter = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: job.salary_currency ?? "CAD",
    maximumFractionDigits: 0,
  });

  const min =
    job.salary_min !== null
      ? formatter.format(job.salary_min)
      : null;

  const max =
    job.salary_max !== null
      ? formatter.format(job.salary_max)
      : null;

  const range = min && max
    ? `${min} – ${max}`
    : min ?? max;

  const period =
    job.salary_period === "Hourly"
      ? "/hour"
      : job.salary_period === "Monthly"
        ? "/month"
        : job.salary_period === "Yearly"
          ? "/year"
          : "";

  return `${range}${period}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function DetailSection({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  if (!content?.trim()) return null;

  return (
    <section className="job-details__section">
      <h3>{title}</h3>
      <div className="job-details__text">
        {content}
      </div>
    </section>
  );
}

export default function JobDetailsPanel({
  job,
  onClose,
}: JobDetailsPanelProps) {
  if (!job) {
    return (
      <aside
        className="job-details job-details--empty"
        aria-label="Job details"
      >
        <div className="job-details__placeholder">
          <h2>Select a job</h2>
          <p>
            Choose a job from the list to view its
            complete description, requirements,
            and responsibilities.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="job-details"
      aria-label={`Details for ${job.title}`}
    >
      <div className="job-details__header">
        <div>
          <p className="job-details__company">
            {job.company_name}
          </p>

          <h2 className="job-details__title">
            {job.title}
          </h2>

          <p className="job-details__location">
            {job.location}
          </p>
        </div>

        <button
          type="button"
          className="job-details__close"
          onClick={onClose}
          aria-label="Close job details"
          title="Close job details"
        >
          ×
        </button>
      </div>

      <div className="job-details__badges">
        <span className="job-details__badge">
          {job.work_mode}
        </span>

        <span className="job-details__badge">
          {job.employment_type}
        </span>

        <span className="job-details__badge">
          {job.category}
        </span>
      </div>

      <EasyApply key={job.id} job={job} />

      <div className="job-details__information">
        <div>
          <span className="job-details__label">
            Salary
          </span>
          <strong>{formatSalary(job)}</strong>
        </div>

        <div>
          <span className="job-details__label">
            Date posted
          </span>
          <strong>{formatDate(job.posted_at)}</strong>
        </div>
      </div>

      <div className="job-details__body">
        <DetailSection
          title="About the job"
          content={job.description}
        />

        <DetailSection
          title="Responsibilities"
          content={job.responsibilities}
        />

        <DetailSection
          title="Requirements"
          content={job.requirements}
        />
      </div>
    </aside>
  );
}
