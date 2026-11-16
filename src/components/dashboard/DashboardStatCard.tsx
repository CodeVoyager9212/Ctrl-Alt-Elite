import type { ReactNode } from "react";

type DashboardStatCardProps = {
  label: string;
  value: number;
  helper: string;
  action?: ReactNode;
};

export default function DashboardStatCard({
  label,
  value,
  helper,
  action,
}: DashboardStatCardProps) {
  return (
    <article className="dashboard-stat-card">
      <div>
        <span className="dashboard-stat-card__label">{label}</span>
        <strong>{value}</strong>
        <p>{helper}</p>
      </div>
      {action}
    </article>
  );
}
