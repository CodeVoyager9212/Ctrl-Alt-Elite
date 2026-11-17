import assert from "node:assert/strict";
import { test } from "node:test";
import { getApplicationActivity, getStatusCounts } from "../src/lib/dashboardAnalytics.ts";

function submission(year, month, day, hour = 12) {
  return { applied_at: new Date(year, month - 1, day, hour).toISOString() };
}

test("each current status has its own count and share, including zero counts", () => {
  const counts = getStatusCounts([
    { status: "Applied" },
    { status: "Applied" },
    { status: "Under Review" },
    { status: "Interview" },
    { status: "Rejected" },
  ]);
  assert.deepEqual(counts.map(({ status, count, percentage }) => [status, count, percentage]), [
    ["Applied", 2, 40],
    ["Under Review", 1, 20],
    ["Interview", 1, 20],
    ["Offered", 0, 0],
    ["Rejected", 1, 20],
  ]);
});

test("chart shares keep their precision for equal thirds", () => {
  const counts = getStatusCounts(["Applied", "Interview", "Offered"].map((status) => ({ status })));
  const total = counts.reduce((sum, { percentage }) => sum + percentage, 0);
  assert.ok(Math.abs(total - 100) < 1e-10);
});

test("empty data produces zero statuses and a complete empty period", () => {
  assert.ok(getStatusCounts([]).every(({ count, percentage }) => count === 0 && percentage === 0));
  const activity = getApplicationActivity([], "months", 0, new Date(2026, 0, 5));
  assert.deepEqual(activity.points.map(({ count }) => count), [0, 0, 0, 0, 0, 0]);
  assert.equal(activity.hasOlderActivity, false);
});

test("daily buckets follow local dates and skip invalid or future submissions", () => {
  const activity = getApplicationActivity([
    submission(2026, 3, 7, 23),
    submission(2026, 3, 8, 0),
    submission(2026, 3, 8, 17),
    { applied_at: "invalid" },
  ], "days", 0, new Date(2026, 2, 8, 16));

  assert.deepEqual(activity.points.map(({ count }) => count), [0, 0, 0, 0, 0, 1, 1]);
});

test("weekly buckets split Sunday and Monday across a year boundary", () => {
  const activity = getApplicationActivity([
    submission(2025, 12, 28),
    submission(2025, 12, 29),
    submission(2026, 1, 4),
    submission(2026, 1, 5),
  ], "weeks", 0, new Date(2026, 0, 6));
  assert.deepEqual(activity.points.map(({ count }) => count), [0, 0, 0, 1, 2, 1]);
});

test("monthly windows cover distinct periods and can reach older applications", () => {
  const now = new Date(2026, 0, 15);
  const applications = [submission(2025, 7, 31), submission(2025, 8, 1), submission(2026, 1, 1)];
  const recent = getApplicationActivity(applications, "months", 0, now);
  const older = getApplicationActivity(applications, "months", 1, now);
  assert.deepEqual(recent.points.map(({ count }) => count), [1, 0, 0, 0, 0, 1]);
  assert.deepEqual(older.points.map(({ count }) => count), [0, 0, 0, 0, 0, 1]);
  assert.equal(older.lastDate.getDate(), 31);
  assert.equal(older.lastDate.getMonth(), 6);
  assert.equal(recent.hasOlderActivity, true);
  assert.equal(older.hasOlderActivity, false);
});

test("yearly buckets count leap-day submissions and reach prior windows", () => {
  const now = new Date(2026, 10, 9);
  const applications = [submission(2021, 12, 31), submission(2024, 2, 29), submission(2026, 11, 1)];
  const recent = getApplicationActivity(applications, "years", 0, now);
  const older = getApplicationActivity(applications, "years", 1, now);
  assert.deepEqual(recent.points.map(({ count }) => count), [0, 0, 1, 0, 1]);
  assert.deepEqual(older.points.map(({ count }) => count), [0, 0, 0, 0, 1]);
  assert.equal(older.hasOlderActivity, false);
});
