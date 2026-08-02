import type { PlaylistStudyProject, StudySession, StudyVideo } from "./playlist-study";

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validVideo(value: unknown): value is StudyVideo {
  if (!record(value)) return false;
  return typeof value.id === "string" && Boolean(value.id.trim()) && value.id.length <= 200
    && Number.isInteger(value.index) && Number(value.index) > 0
    && typeof value.title === "string" && value.title.length <= 2000
    && typeof value.url === "string" && value.url.length <= 4096
    && finiteNonNegative(value.durationSeconds)
    && typeof value.topic === "string" && value.topic.length <= 500
    && typeof value.watched === "boolean"
    && typeof value.note === "string"
    && typeof value.practiced === "boolean";
}

function validSession(value: unknown, videoIds: Set<string>): value is StudySession {
  if (!record(value) || !Array.isArray(value.videoIds)) return false;
  return typeof value.id === "string" && Boolean(value.id.trim()) && value.id.length <= 200
    && typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && value.videoIds.every((id) => typeof id === "string" && videoIds.has(id))
    && new Set(value.videoIds).size === value.videoIds.length
    && finiteNonNegative(value.plannedMinutes)
    && ["planned", "complete", "missed"].includes(String(value.status));
}

export function isPlaylistStudyProject(value: unknown): value is PlaylistStudyProject {
  if (!record(value) || value.schemaVersion !== 1 || !record(value.policy) || !record(value.calendar)) return false;
  if (!Array.isArray(value.videos) || value.videos.length > 10000 || !value.videos.every(validVideo)) return false;
  const videoIds = new Set(value.videos.map((video) => (video as StudyVideo).id));
  if (videoIds.size !== value.videos.length || !Array.isArray(value.sessions) || value.sessions.length > 10000 || !value.sessions.every((session) => validSession(session, videoIds))) return false;
  const policy = value.policy;
  const calendar = value.calendar;
  return typeof value.id === "string" && Boolean(value.id.trim()) && value.id.length <= 200
    && typeof value.title === "string" && Boolean(value.title.trim()) && value.title.length <= 500
    && typeof value.playlistUrl === "string" && value.playlistUrl.length <= 4096
    && typeof value.goal === "string" && typeof value.preferences === "string"
    && ["active", "paused", "complete", "planning"].includes(String(value.status))
    && finiteNonNegative(value.totalVideoCount) && finiteNonNegative(value.totalDurationSeconds)
    && typeof policy.timezone === "string" && Boolean(policy.timezone.trim())
    && typeof policy.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(policy.startDate)
    && typeof policy.startTime === "string" && /^\d{2}:\d{2}$/.test(policy.startTime)
    && finiteNonNegative(policy.weekdayMinutes) && finiteNonNegative(policy.fridayMinutes)
    && Array.isArray(policy.excludedWeekdays) && policy.excludedWeekdays.every((day) => typeof day === "string")
    && Array.isArray(policy.priorities) && policy.priorities.every((topic) => typeof topic === "string")
    && typeof policy.doNotSplitVideos === "boolean"
    && calendar.provider === "google" && typeof calendar.calendarId === "string"
    && ["not-connected", "in-sync", "changes-pending"].includes(String(calendar.syncState))
    && finiteNonNegative(calendar.pendingChangeCount)
    && typeof value.updatedAt === "string";
}
