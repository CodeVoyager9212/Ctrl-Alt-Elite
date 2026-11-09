import type { NotificationRow } from "../types/database";

// Where clicking a notification takes the user.
// Recruiters go to the applicants of that job.
// Job seekers go to My Applications (on that application)
// or to Find Jobs with that job selected.
export function notificationLink(
  notification: NotificationRow,
): string | null {
  if (notification.type === "new_application" && notification.job_id) {
    return `/recruiter/jobs/${notification.job_id}/applicants`;
  }

  if (notification.application_id) {
    return `/applications?id=${notification.application_id}`;
  }

  if (notification.job_id) {
    return `/find-jobs?job=${notification.job_id}`;
  }

  return null;
}

// Short label like "just now", "5 min ago", "3 h ago", "2 days ago".
export function timeAgo(isoDate: string, now: Date = new Date()) {
  const minutes = Math.floor(
    (now.getTime() - new Date(isoDate).getTime()) / 60000,
  );

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
