
import { useEffect, useMemo, useState } from "react";

import { getActiveJobs } from "../services/jobsService";
import type { JobRow } from "../types/database";

import JobList from "../components/jobs/JobList";
import JobDetailsPanel from "../components/jobs/JobDetailsPanel";
import JobSearchFilters from "../components/jobs/JobSearchFilters";
import AiJobMatches from "../components/jobs/AiJobMatches";
import {
  defaultJobFilters,
  type JobFilters,
} from "../components/jobs/jobFilters";

import "./FindJobsPage.css";

export default function FindJobsPage() {
  // Jobs retrieved from Supabase
  const [jobs, setJobs] = useState<JobRow[]>([]);

  // Currently selected job
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    null
  );

  // Search, filtering, and sorting settings
  const [filters, setFilters] = useState<JobFilters>({
    ...defaultJobFilters,
  });

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load jobs from Supabase
  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      try {
        setLoading(true);
        setError(null);

        const data = await getActiveJobs();

        if (!cancelled) {
          setJobs(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load jobs."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  // Apply searching, filtering, and sorting
  const filteredJobs = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const location = filters.location.trim().toLowerCase();

    const results = jobs.filter((job) => {
      // Keyword search
      const searchableText = [
        job.title,
        job.company_name,
        job.category,
        job.summary,
        job.description,
        job.requirements ?? "",
        job.responsibilities ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesKeyword =
        !keyword || searchableText.includes(keyword);

      // Location search
      const matchesLocation =
        !location ||
        job.location.toLowerCase().includes(location);

      // Category
      const matchesCategory =
        !filters.category ||
        job.category === filters.category;

      // Work mode
      const matchesWorkMode =
        !filters.workMode ||
        job.work_mode === filters.workMode;

      // Employment type
      const matchesEmploymentType =
        !filters.employmentType ||
        job.employment_type === filters.employmentType;

      return (
        matchesKeyword &&
        matchesLocation &&
        matchesCategory &&
        matchesWorkMode &&
        matchesEmploymentType
      );
    });

    // Sort the filtered results
    results.sort((a, b) => {
      switch (filters.sortBy) {
        case "oldest":
          return (
            new Date(a.posted_at).getTime() -
            new Date(b.posted_at).getTime()
          );

        case "title-asc":
          return a.title.localeCompare(b.title);

        case "title-desc":
          return b.title.localeCompare(a.title);

        case "newest":
        default:
          return (
            new Date(b.posted_at).getTime() -
            new Date(a.posted_at).getTime()
          );
      }
    });

    return results;
  }, [jobs, filters]);

  // Recommendations can open an eligible job even when search filters hide it.
  const selectedJob =
    jobs.find((job) => job.id === selectedJobId) ??
    null;

  function handleSelectJob(job: JobRow) {
    setSelectedJobId(job.id);
  }

  function handleCloseDetails() {
    setSelectedJobId(null);
  }

  return (
    <main className="find-jobs-page">
      <div className="find-jobs-page__container">
        <AiJobMatches onViewJob={handleSelectJob} />

        {/* Search and filtering controls */}
        <JobSearchFilters
          filters={filters}
          onChange={setFilters}
          jobs={jobs}
        />

        {/* Loading state */}
        {loading && (
          <div
            className="find-jobs-page__message"
            role="status"
          >
            <p>Loading available jobs...</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            className="find-jobs-page__message find-jobs-page__message--error"
            role="alert"
          >
            <h2>Unable to load jobs</h2>
            <p>{error}</p>
          </div>
        )}

        {/* Job results and detail panel */}
        {!loading && !error && (
          <div className="find-jobs-page__layout">
            <JobList
              jobs={filteredJobs}
              selectedJobId={selectedJob?.id ?? null}
              onSelectJob={handleSelectJob}
            />

            <JobDetailsPanel
              job={selectedJob}
              onClose={handleCloseDetails}
            />
          </div>
        )}
      </div>
    </main>
  );
}
