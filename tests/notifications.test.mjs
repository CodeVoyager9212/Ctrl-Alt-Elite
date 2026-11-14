import assert from "node:assert/strict";
import { test } from "node:test";
import { describeNotification } from "../src/lib/notifications.ts";

const job = { job_id: "job-1", job_title: "Software Developer" };

test("new applications link recruiters to the correct posting's applicants", () => {
  const notification = describeNotification({ ...job, kind: "new_application" });
  assert.equal(notification.title, "New application");
  assert.equal(notification.path, "/recruiter/jobs/job-1/applicants");
});

test("an interview invitation and a status update link job seekers to applications", () => {
  const invitation = describeNotification({ ...job, kind: "interview_invitation" });
  const update = describeNotification({ ...job, kind: "application_update", application_status: "Offered" });
  assert.equal(invitation.title, "Interview invitation");
  assert.equal(invitation.path, "/applications");
  assert.equal(update.path, "/applications");
  assert.match(update.message, /Offered/);
});

test("a deadline reminder names the posting and includes the UTC deadline", () => {
  const notification = describeNotification({ ...job, kind: "deadline_reminder", deadline: "2026-11-15" });
  assert.match(notification.message, /Software Developer.*2026-11-15 \(UTC\)/);
});
