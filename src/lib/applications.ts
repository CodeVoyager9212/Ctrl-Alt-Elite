import type { ApplicationStatus } from "../types/database";

// The order an application normally moves through. "Rejected" can happen at any step.
export const STATUS_STEPS: ApplicationStatus[] = [
  "Applied",
  "Under Review",
  "Interview",
  "Offered",
];

export const ALL_STATUSES: ApplicationStatus[] = [...STATUS_STEPS, "Rejected"];

// CSS modifier for a status badge, e.g. "Under Review" -> "under-review"
export function statusSlug(status: ApplicationStatus) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

// Whole days between a date and now (never negative).
export function daysSince(isoDate: string, now: Date = new Date()) {
  const ms = now.getTime() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function daysInStatusLabel(isoDate: string, now: Date = new Date()) {
  const days = daysSince(isoDate, now);
  if (days === 0) return "since today";
  return days === 1 ? "for 1 day" : `for ${days} days`;
}

export function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
