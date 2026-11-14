import { useEffect, useId, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { ApplicationOutletContext } from "../components/layout/ApplicationLayout";
import ApplicationActivityChart from "../components/dashboard/ApplicationActivityChart";
import ApplicationHistory from "../components/dashboard/ApplicationHistory";
import ApplicationStatusBreakdown from "../components/dashboard/ApplicationStatusBreakdown";
import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import { getProfileCompletion, getStatusCounts, type StatusCount } from "../lib/dashboardAnalytics";

import {
  getJobSeekerDashboardData,
  type DashboardData,
} from "../services/dashboardService";
import "./DashboardPage.css";

const ACTIVE_STATUSES = new Set(["Applied", "Under Review", "Interview"]);
const DECIDED_STATUSES = new Set(["Offered", "Rejected"]);
function ApplicationStatusGroup({
  label,
  helper,
  counts,
}: {
  label: string;
  helper: string;
  counts: StatusCount[];
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !groupRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="dashboard-status-group" ref={groupRef}>
      <DashboardStatCard
        label={label}
        value={counts.reduce((total, { count }) => total + count, 0)}
        helper={helper}
        action={
          <button
            ref={buttonRef}
            className="dashboard-control"
            type="button"
            aria-label={`${open ? "Hide" : "Show"} status details for ${label.toLowerCase()}`}
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((wasOpen) => !wasOpen)}
          >
            {open ? "Hide status details" : "Show status details"}
          </button>
        }
      />
      <div id={detailsId} className="dashboard-status-details" role="region" aria-label={`${label} status details`} hidden={!open}>
        {counts.map(({ status, count }) => (
          <DashboardStatCard key={status} label={status} value={count} helper="current status" />
        ))}
      </div>
    </div>
  );
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const { user } = useOutletContext<ApplicationOutletContext>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const nextData = await getJobSeekerDashboardData(user.id, controller.signal);

        if (!controller.signal.aborted) {
          setData(nextData);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your dashboard. Please try again.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      controller.abort();
    };
  }, [user.id, attempt]);

  const applications = data?.applications ?? [];
  const statusCounts = getStatusCounts(applications);
  const activeCounts = statusCounts.filter(({ status }) => ACTIVE_STATUSES.has(status));
  const decidedCounts = statusCounts.filter(({ status }) => DECIDED_STATUSES.has(status));
  const jobsById = new Map((data?.jobs ?? []).map((job) => [job.id, job] as const));
  const profileCompletion = getProfileCompletion(data?.profile ?? null);

  const fullName =
    data?.profile?.full_name?.trim() ||
    (typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "");
  const firstName = fullName.split(" ")[0] || "there";

  return (
    <main className="dashboard-page">
      <div className="dashboard-page__container">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-header__date">{formatToday()}</p>
            <h1>Good day, {firstName}</h1>
            <p className="dashboard-header__description">
              Here&apos;s how your job search is progressing.
            </p>
          </div>

          <Link className="button button--primary" to="/profile">
            {profileCompletion < 100 ? "Complete your profile" : "View your profile"}
          </Link>
        </header>

        {error && (
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <section className="dashboard-loading" aria-live="polite">
            <span className="dashboard-loading__pulse" aria-hidden="true" />
            <p>Loading your dashboard...</p>
          </section>
        ) : error ? (
          <section className="dashboard-error-state">
            <h2>Dashboard unavailable</h2>
            <p>We could not load your application analytics right now.</p>
            <button type="button" className="button button--primary" onClick={() => setAttempt(attempt + 1)}>
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="dashboard-stats" aria-label="Application summary">
              <DashboardStatCard
                label="Total Applications"
                value={applications.length}
                helper={
                  applications.length === 0
                    ? "no applications yet"
                    : "submitted in total"
                }
              />
              <ApplicationStatusGroup
                label="Active Applications"
                helper="still in progress"
                counts={activeCounts}
              />
              <ApplicationStatusGroup
                label="Decided Applications"
                helper="offered or rejected"
                counts={decidedCounts}
              />
            </section>

            <section className="dashboard-analytics-grid" aria-label="Application analytics">
              <ApplicationActivityChart applications={applications} />
              <ApplicationStatusBreakdown counts={statusCounts} />
            </section>

            <ApplicationHistory
              applications={applications}
              jobsById={jobsById}
              detailsUnavailable={data?.jobDetailsUnavailable ?? false}
            />
          </>
        )}
      </div>
    </main>
  );
}
