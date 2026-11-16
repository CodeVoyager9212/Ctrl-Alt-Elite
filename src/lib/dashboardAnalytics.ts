import type { ApplicationRow, ApplicationStatus, ProfileRow } from "../types/database";
import { ALL_STATUSES } from "./applications.ts";

export type StatusCount = {
  status: ApplicationStatus;
  count: number;
  percentage: number;
};

type ActivityPeriod = {
  label: string;
  buckets: number;
  dateFormat: Intl.DateTimeFormatOptions;
};

export const ACTIVITY_PERIODS = {
  days: { label: "Days", buckets: 7, dateFormat: { day: "numeric" } },
  weeks: { label: "Weeks", buckets: 6, dateFormat: { month: "short", day: "numeric" } },
  months: { label: "Months", buckets: 6, dateFormat: { month: "short" } },
  years: { label: "Years", buckets: 5, dateFormat: { year: "numeric" } },
} satisfies Record<string, ActivityPeriod>;

export type ActivityPeriodKey = keyof typeof ACTIVITY_PERIODS;

export function getStatusCounts(applications: Pick<ApplicationRow, "status">[]): StatusCount[] {
  return ALL_STATUSES.map((status) => {
    const count = applications.filter((application) => application.status === status).length;

    return {
      status,
      count,
      percentage: applications.length === 0 ? 0 : (count / applications.length) * 100,
    };
  });
}

function startOfPeriod(date: Date, period: ActivityPeriodKey) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (period) {
    case "days":
      return new Date(year, month, day);
    case "weeks":
      return new Date(year, month, day - ((date.getDay() + 6) % 7));
    case "months":
      return new Date(year, month, 1);
    case "years":
      return new Date(year, 0, 1);
  }
}

function shiftPeriod(start: Date, period: ActivityPeriodKey, offset: number) {
  const year = start.getFullYear();
  const month = start.getMonth();
  const day = start.getDate();

  switch (period) {
    case "days":
      return new Date(year, month, day + offset);
    case "weeks":
      return new Date(year, month, day + offset * 7);
    case "months":
      return new Date(year, month + offset, 1);
    case "years":
      return new Date(year + offset, 0, 1);
  }
}

export function getApplicationActivity(
  applications: Pick<ApplicationRow, "applied_at">[],
  period: ActivityPeriodKey,
  page = 0,
  now = new Date(),
) {
  const { buckets, dateFormat } = ACTIVITY_PERIODS[period];
  const currentStart = startOfPeriod(now, period);
  const firstOffset = 1 - buckets - page * buckets;
  const formatter = new Intl.DateTimeFormat(undefined, dateFormat);
  const pointsByStart = new Map<number, { label: string; count: number }>();

  for (let index = 0; index < buckets; index += 1) {
    const start = shiftPeriod(currentStart, period, firstOffset + index);
    pointsByStart.set(start.getTime(), { label: formatter.format(start), count: 0 });
  }

  const firstDate = shiftPeriod(currentStart, period, firstOffset);
  // Local calendar dates keep daylight saving changes from moving a submission to another day.
  const endExclusive = shiftPeriod(currentStart, period, firstOffset + buckets);
  const lastDate = page === 0
    ? now
    : new Date(endExclusive.getFullYear(), endExclusive.getMonth(), endExclusive.getDate() - 1);
  let hasOlderActivity = false;

  for (const application of applications) {
    const date = new Date(application.applied_at);
    if (!Number.isFinite(date.getTime()) || date > now) continue;

    if (date < firstDate) {
      hasOlderActivity = true;
    }

    const point = pointsByStart.get(startOfPeriod(date, period).getTime());
    if (point) point.count += 1;
  }

  return {
    firstDate,
    lastDate,
    hasOlderActivity,
    points: Array.from(pointsByStart, ([key, point]) => ({ key, ...point })),
  };
}

export function getProfileCompletion(profile: ProfileRow | null) {
  if (!profile) return 0;

  const fields = [
    profile.full_name,
    profile.headline,
    profile.education,
    profile.experience,
    profile.skills,
    profile.preferred_job_type,
    profile.preferred_location,
  ];

  const completed = fields.filter((value) => value?.trim()).length;
  return Math.round((completed / fields.length) * 100);
}
