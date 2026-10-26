
import type { JobRow } from "../../types/database";
import { defaultJobFilters } from "./jobFilters";
import type { JobFilters } from "./jobFilters";

type JobSearchFiltersProps = {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  jobs: JobRow[];
};

export default function JobSearchFilters({
  filters,
  onChange,
  jobs,
}: JobSearchFiltersProps) {
  const categories = Array.from(
    new Set(jobs.map((job) => job.category))
  ).sort();

  const updateFilter = (
    field: keyof JobFilters,
    value: string
  ) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  const clearFilters = () => {
    onChange({ ...defaultJobFilters });
  };

  const hasActiveFilters =
    filters.keyword.trim() !== "" ||
    filters.location.trim() !== "" ||
    filters.category !== "" ||
    filters.workMode !== "" ||
    filters.employmentType !== "" ||
    filters.sortBy !== "newest";

  return (
    <section
      className="job-filters"
      aria-label="Search and filter jobs"
    >
      <div className="job-filters__header">
        <div>
          <span className="job-filters__eyebrow">
            OPENINGS
          </span>
          <h1>Find Jobs</h1>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="job-filters__clear"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="job-filters__grid">
        <label className="job-filters__field">
          <span>Job title or keyword</span>
          <input
            type="search"
            value={filters.keyword}
            onChange={(event) =>
              updateFilter("keyword", event.target.value)
            }
            placeholder="e.g. Software Engineer, React"
          />
        </label>

        <label className="job-filters__field">
          <span>Location</span>
          <input
            type="search"
            value={filters.location}
            onChange={(event) =>
              updateFilter("location", event.target.value)
            }
            placeholder="e.g. Montreal, Canada"
          />
        </label>

        <label className="job-filters__field">
          <span>Category</span>
          <select
            value={filters.category}
            onChange={(event) =>
              updateFilter("category", event.target.value)
            }
          >
            <option value="">All categories</option>

            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="job-filters__field">
          <span>Work mode</span>
          <select
            value={filters.workMode}
            onChange={(event) =>
              updateFilter("workMode", event.target.value)
            }
          >
            <option value="">All work modes</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </label>

        <label className="job-filters__field">
          <span>Employment type</span>
          <select
            value={filters.employmentType}
            onChange={(event) =>
              updateFilter(
                "employmentType",
                event.target.value
              )
            }
          >
            <option value="">All employment types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Internship">Internship</option>
            <option value="Contract">Contract</option>
            <option value="Temporary">Temporary</option>
          </select>
        </label>

        <label className="job-filters__field">
          <span>Sort by</span>
          <select
            value={filters.sortBy}
            onChange={(event) =>
              updateFilter("sortBy", event.target.value)
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title-asc">Job title: A–Z</option>
            <option value="title-desc">Job title: Z–A</option>
          </select>
        </label>
      </div>
    </section>
  );
}
