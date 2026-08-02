import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/schedule-reconciliation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { needsScheduleReconciliation, reconcileProjectSchedule } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function project() {
  const videos = [
    { id: "a", index: 1, title: "A", url: "https://youtube.com/watch?v=a", durationSeconds: 600, topic: "Priority", watched: false, note: "", practiced: false },
    { id: "b", index: 2, title: "B", url: "https://youtube.com/watch?v=b", durationSeconds: 600, topic: "Priority", watched: false, note: "", practiced: false },
    { id: "c", index: 3, title: "C", url: "https://youtube.com/watch?v=c", durationSeconds: 600, topic: "Later", watched: false, note: "", practiced: false },
  ];
  return {
    schemaVersion: 1, id: "test", title: "Test", playlistUrl: "https://youtube.com/playlist?list=test", goal: "", preferences: "", status: "active",
    totalVideoCount: 3, totalDurationSeconds: 1800,
    policy: { timezone: "UTC", startDate: "2026-08-01", startTime: "20:00", weekdayMinutes: 20, fridayMinutes: 60, excludedWeekdays: ["Thursday"], priorities: ["Priority"], doNotSplitVideos: true },
    videos,
    sessions: [
      { id: "old", date: "2026-08-01", videoIds: ["a"], plannedMinutes: 10, watchSeconds: 600, module: "Priority", status: "planned" },
      { id: "today", date: "2026-08-02", videoIds: ["b"], plannedMinutes: 10, watchSeconds: 600, module: "Priority", status: "planned" },
      { id: "later", date: "2026-08-03", videoIds: ["c"], plannedMinutes: 10, watchSeconds: 600, module: "Later", status: "planned" },
    ],
    calendar: { provider: "google", calendarId: "primary", syncState: "in-sync", pendingChangeCount: 0, lastSyncedAt: null },
    notifications: [], updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

test("moves yesterday's missed video to the front of today and repacks every remaining video", () => {
  const input = project();
  const now = new Date("2026-08-02T10:00:00.000Z");
  assert.equal(needsScheduleReconciliation(input, now), true);
  const result = reconcileProjectSchedule(input, now);
  assert.equal(result.overdueVideoCount, 1);
  assert.equal(result.changed, true);
  assert.equal(result.project.sessions[0].status, "missed");
  const future = result.project.sessions.filter((session) => session.date >= "2026-08-02");
  assert.deepEqual(future[0].videoIds, ["a", "b"]);
  assert.deepEqual(future[1].videoIds, ["c"]);
  assert.deepEqual(future.flatMap((session) => session.videoIds), ["a", "b", "c"]);
  assert.equal(result.project.calendar.pendingAction, "sync");
  assert.equal(needsScheduleReconciliation(result.project, now), false);
});

test("removes an extra-watched video from all future sessions", () => {
  const input = project();
  input.videos[1].watched = true;
  const result = reconcileProjectSchedule(input, new Date("2026-08-02T10:00:00.000Z"));
  const futureIds = result.project.sessions.filter((session) => session.date >= "2026-08-02").flatMap((session) => session.videoIds);
  assert.deepEqual(futureIds, ["a", "c"]);
});
