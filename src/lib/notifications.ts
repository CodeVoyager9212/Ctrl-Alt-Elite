import type { NotificationRow } from "../types/database";

export function describeNotification(notification: NotificationRow) {
  const job = notification.job_title;
  switch (notification.kind) {
    case "new_application":
      return { title: "New application", message: `A candidate applied for ${job}.`, path: `/recruiter/jobs/${notification.job_id}/applicants` };
    case "interview_invitation":
      return { title: "Interview invitation", message: `You were invited to interview for ${job}.`, path: "/applications" };
    case "application_update":
      return { title: "Application update", message: `${job} moved to ${notification.application_status}.`, path: "/applications" };
    case "deadline_reminder":
      return { title: "Application deadline", message: `${job} closes on ${notification.deadline} (UTC).`, path: null };
  }
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
