import { useState } from "react";
import {
  ACTIVITY_PERIODS,
  getApplicationActivity,
  type ActivityPeriodKey,
} from "../../lib/dashboardAnalytics";
import type { ApplicationRow } from "../../types/database";

const PERIOD_KEYS = Object.keys(ACTIVITY_PERIODS) as ActivityPeriodKey[];

export default function ApplicationActivityChart({
  applications,
}: {
  applications: ApplicationRow[];
}) {
  const [period, setPeriod] = useState<ActivityPeriodKey>("months");
  const [page, setPage] = useState(0);
  const { points, firstDate, lastDate, hasOlderActivity } =
    getApplicationActivity(applications, period, page);
  const maxCount = Math.max(1, ...points.map(({ count }) => count));
  const total = points.reduce((sum, { count }) => sum + count, 0);
  const range = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })
    .formatRange(firstDate, lastDate);

  return (
    <section className="dashboard-panel dashboard-activity-panel">
      <div className="dashboard-panel__heading">
        <div>
          <p>Submission activity</p>
          <h2>Applications submitted</h2>
        </div>
        <strong className="dashboard-panel__metric" aria-label={`${total} applications in this period`}>
          {total}
        </strong>
      </div>

      <div className="dashboard-period-options" role="group" aria-label="Activity time scale">
        {PERIOD_KEYS.map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={period === key}
            onClick={() => {
              setPeriod(key);
              setPage(0);
            }}
          >
            {ACTIVITY_PERIODS[key].label}
          </button>
        ))}
      </div>

      <div className="dashboard-period-navigation">
        <button type="button" disabled={!hasOlderActivity} onClick={() => setPage(page + 1)}>
          Previous
        </button>
        <p aria-live="polite">{range}</p>
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Next
        </button>
      </div>

      {total === 0 && <p className="dashboard-activity-empty">No applications in this period.</p>}

      <div
        className="dashboard-activity-chart"
        style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`Applications submitted, ${range}. ${points
          .map(({ key, count }) => `${new Date(key).toLocaleDateString()}: ${count}`)
          .join(", ")}`}
      >
        {points.map(({ key, label, count }) => (
          <div className="dashboard-activity-bar" key={key}>
            <span className="dashboard-activity-bar__value">{count}</span>
            <div className="dashboard-activity-bar__track">
              <span className="dashboard-activity-bar__fill" style={{ height: `${count / maxCount * 100}%` }} />
            </div>
            <span className="dashboard-activity-bar__label">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
