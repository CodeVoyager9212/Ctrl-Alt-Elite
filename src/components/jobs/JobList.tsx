
import type { JobRow } from "../../types/database";
import JobCard from "./JobCard";

type JobListProps = {
  jobs: JobRow[];
  selectedJobId: string | null;
  onSelectJob: (job: JobRow) => void;
};

export default function JobList({
  jobs,
  selectedJobId,
  onSelectJob,
}: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="job-list__empty" role="status">
        <h2>No matching jobs</h2>
        <p>
          We couldn't find any jobs matching your search.
          Try changing your search or filters.
        </p>
      </div>
    );
  }

  return (
    <section
      className="job-list"
      aria-label="Available job opportunities"
    >
      <div className="job-list__header">
        <p>
          <strong>{jobs.length}</strong>{" "}
          {jobs.length === 1 ? "job" : "jobs"} available
        </p>
      </div>

      <div className="job-list__items">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isSelected={selectedJobId === job.id}
            onSelect={onSelectJob}
          />
        ))}
      </div>
    </section>
  );
}
