import type { JobRow } from "../../types/database";

type JobCardProps = {
  job: JobRow;
  isSelected: boolean;
  onSelect: (job: JobRow) => void;
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

  const range =
    min && max ? `${min} – ${max}` : min ?? max;

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

export default function JobCard({
  job,
  isSelected,
  onSelect,
}: JobCardProps) {
  return (
    <article
      className={`job-card ${isSelected ? "job-card--selected" : ""}`}
    >
      <div className="job-card__header">
        <span className="job-card__company">
          {job.company_name}
        </span>

        <span className="job-card__date">
          {new Date(job.posted_at).toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      <h2 className="job-card__title">{job.title}</h2>

      <div className="job-card__metadata">
        <span>{job.location}</span>
        <span>{job.work_mode}</span>
        <span>{job.employment_type}</span>
      </div>

      <p className="job-card__summary">{job.summary}</p>

      <div className="job-card__footer">
        <strong>{formatSalary(job)}</strong>

        <button
          type="button"
          className="job-card__button"
          onClick={() => onSelect(job)}
          aria-pressed={isSelected}
        >
          {isSelected ? "Viewing details" : "View details"}
        </button>
      </div>
    </article>
  );
}
