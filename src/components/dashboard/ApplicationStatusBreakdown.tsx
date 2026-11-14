import { useState } from "react";
import type { ApplicationStatus } from "../../types/database";
import type { StatusCount } from "../../lib/dashboardAnalytics";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Applied: "#2d5f9d",
  "Under Review": "#387c53",
  Interview: "#ad5429",
  Offered: "#c49126",
  Rejected: "#7950b7",
};

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 0,
});

const MODES = ["Count", "Percentage"] as const;

export default function ApplicationStatusBreakdown({ counts }: { counts: StatusCount[] }) {
  const [mode, setMode] = useState<(typeof MODES)[number]>("Count");
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>();
  const selected = counts.find(({ status }) => status === selectedStatus)
    ?? counts.find(({ count }) => count > 0)
    ?? counts[0];

  const total = counts.reduce((sum, { count }) => sum + count, 0);
  let cumulativeCount = 0;
  const segments = counts.filter(({ count }) => count > 0).map(({ status, count }) => {
    const start = cumulativeCount / total * 100;
    cumulativeCount += count;
    const end = cumulativeCount / total * 100;
    return `${STATUS_COLORS[status]} ${start}% ${end}%`;
  });

  return (
    <section className="dashboard-panel dashboard-status-panel">
      <div className="dashboard-panel__heading dashboard-status-panel__heading">
        <div>
          <p>All applications</p>
          <h2>Current status breakdown</h2>
        </div>
        <div className="dashboard-status-controls" role="group" aria-label="Chart display">
          {MODES.map((option) => (
            <button
              key={option}
              className="dashboard-control"
              type="button"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div
        className="dashboard-status-pie"
        style={total > 0 ? { backgroundImage: `conic-gradient(${segments.join(", ")})` } : undefined}
        aria-hidden="true"
      />

      <p className="dashboard-status-reading" aria-live="polite">
        {selected && (
          <>
            {selected.status} ·{" "}
            {mode === "Count"
              ? `${selected.count} ${selected.count === 1 ? "application" : "applications"}`
              : percentFormatter.format(selected.percentage / 100)}
          </>
        )}
      </p>

      <div className="dashboard-status-controls dashboard-status-legend" role="group" aria-label="Select a status">
        {counts.map(({ status }) => (
          <button
            className="dashboard-control dashboard-status-legend__button"
            key={status}
            type="button"
            aria-pressed={selected?.status === status}
            onClick={() => setSelectedStatus(status)}
          >
            <span className="dashboard-status-legend__dot" style={{ backgroundColor: STATUS_COLORS[status] }} aria-hidden="true" />
            {status}
          </button>
        ))}
      </div>
    </section>
  );
}
