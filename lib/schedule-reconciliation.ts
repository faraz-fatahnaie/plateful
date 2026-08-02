import type { PlaylistStudyProject, StudySession, StudyVideo } from "./playlist-study";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type ScheduleReconciliation = {
  project: PlaylistStudyProject;
  changed: boolean;
  overdueVideoCount: number;
  pendingVideoCount: number;
  futureSessionCount: number;
  calendarChangeCount: number;
  boundary: string;
};

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function addDays(value: string, days: number) {
  const date = dateAtNoon(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekday(value: string) {
  return WEEKDAYS[dateAtNoon(value).getUTCDay()];
}

function dateInTimezone(timezone: string, now: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function capacitySeconds(project: PlaylistStudyProject, date: string) {
  const day = weekday(date);
  if (project.policy.excludedWeekdays.some((item) => item.toLowerCase() === day.toLowerCase())) return 0;
  return (day === "Friday" ? project.policy.fridayMinutes : project.policy.weekdayMinutes) * 60;
}

function pendingVideosInPlanOrder(project: PlaylistStudyProject) {
  const videos = new Map(project.videos.map((video) => [video.id, video]));
  const pending: StudyVideo[] = [];
  const seen = new Set<string>();
  const add = (video: StudyVideo | undefined) => {
    if (!video || video.watched || seen.has(video.id)) return;
    seen.add(video.id);
    pending.push(video);
  };

  [...project.sessions]
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((session) => session.videoIds.forEach((id) => add(videos.get(id))));

  const priorityRank = (topic: string) => {
    const rank = project.policy.priorities.indexOf(topic);
    return rank < 0 ? project.policy.priorities.length : rank;
  };
  [...project.videos]
    .sort((left, right) => priorityRank(left.topic) - priorityRank(right.topic) || left.index - right.index)
    .forEach(add);
  return pending;
}

function buildFutureSessions(project: PlaylistStudyProject, pending: StudyVideo[], boundary: string) {
  const sessions: StudySession[] = [];
  let cursor = boundary;
  let index = 0;
  while (index < pending.length) {
    const capacity = capacitySeconds(project, cursor);
    if (capacity <= 0) {
      cursor = addDays(cursor, 1);
      continue;
    }
    const videos: StudyVideo[] = [];
    let seconds = 0;
    while (index < pending.length) {
      const video = pending[index];
      const fits = seconds + video.durationSeconds <= capacity;
      if (videos.length && !fits) break;
      videos.push(video);
      seconds += video.durationSeconds;
      index += 1;
      if (seconds >= capacity) break;
    }
    const topics = Array.from(new Set(videos.map((video) => video.topic)));
    sessions.push({
      id: `session-${cursor}`,
      date: cursor,
      videoIds: videos.map((video) => video.id),
      plannedMinutes: Math.ceil(seconds / 60),
      watchSeconds: seconds,
      module: topics.length === 1 ? topics[0] : "Mixed priority review",
      status: "planned",
    });
    cursor = addDays(cursor, 1);
  }
  return sessions;
}

function sessionSignature(session: StudySession | undefined) {
  return session ? JSON.stringify([session.date, session.videoIds, session.plannedMinutes, session.watchSeconds, session.module]) : "";
}

function changedCalendarSessions(before: StudySession[], after: StudySession[]) {
  const oldByDate = new Map(before.map((session) => [session.date, session]));
  const newByDate = new Map(after.map((session) => [session.date, session]));
  return new Set([...oldByDate.keys(), ...newByDate.keys()]).size
    ? [...new Set([...oldByDate.keys(), ...newByDate.keys()])].filter((date) => sessionSignature(oldByDate.get(date)) !== sessionSignature(newByDate.get(date))).length
    : 0;
}

export function needsScheduleReconciliation(project: PlaylistStudyProject, now = new Date()) {
  const boundary = dateInTimezone(project.policy.timezone, now);
  const futureIds = new Set(project.sessions.filter((session) => session.date >= boundary && session.status === "planned").flatMap((session) => session.videoIds));
  const overdueMissing = project.sessions
    .filter((session) => session.date < boundary)
    .flatMap((session) => session.videoIds)
    .some((id) => !project.videos.find((video) => video.id === id)?.watched && !futureIds.has(id));
  const scheduledCompleted = project.sessions
    .filter((session) => session.date >= boundary)
    .flatMap((session) => session.videoIds)
    .some((id) => project.videos.find((video) => video.id === id)?.watched);
  const pendingIds = project.videos.filter((video) => !video.watched).map((video) => video.id);
  return overdueMissing || scheduledCompleted || pendingIds.some((id) => !futureIds.has(id));
}

export function reconcileProjectSchedule(project: PlaylistStudyProject, now = new Date()): ScheduleReconciliation {
  const boundary = dateInTimezone(project.policy.timezone, now);
  const pending = pendingVideosInPlanOrder(project);
  const overdueIds = new Set(project.sessions.filter((session) => session.date < boundary).flatMap((session) => session.videoIds));
  const overdueVideoCount = pending.filter((video) => overdueIds.has(video.id)).length;
  const history = project.sessions.filter((session) => session.date < boundary).map((session) => ({
    ...session,
    status: session.videoIds.every((id) => project.videos.find((video) => video.id === id)?.watched) ? "complete" as const : "missed" as const,
  }));
  const previousFuture = project.sessions.filter((session) => session.date >= boundary);
  const future = buildFutureSessions(project, pending, boundary);
  const calendarChangeCount = changedCalendarSessions(previousFuture, future);
  const changed = calendarChangeCount > 0 || previousFuture.some((session) => session.status !== "planned");
  if (!changed) return { project, changed, overdueVideoCount, pendingVideoCount: pending.length, futureSessionCount: future.length, calendarChangeCount, boundary };

  const updatedAt = now.toISOString();
  const next: PlaylistStudyProject = {
    ...project,
    sessions: [...history, ...future],
    calendar: {
      ...project.calendar,
      syncState: "changes-pending",
      pendingChangeCount: calendarChangeCount,
      pendingAction: "sync",
      lastReplannedAt: updatedAt,
    },
    notifications: [{
      id: `replan-${updatedAt}`,
      kind: "replan",
      title: overdueVideoCount ? "Missed videos moved forward" : "Study plan recalculated",
      message: overdueVideoCount
        ? `${overdueVideoCount} overdue video${overdueVideoCount === 1 ? " is" : "s are"} now first in the plan from ${boundary}. Sync ${calendarChangeCount} Calendar change${calendarChangeCount === 1 ? "" : "s"}.`
        : `The remaining ${pending.length} videos were repacked from ${boundary}.`,
      createdAt: updatedAt,
      read: false,
      target: "roadmap",
    }, ...(project.notifications || [])],
    updatedAt,
  };
  return { project: next, changed, overdueVideoCount, pendingVideoCount: pending.length, futureSessionCount: future.length, calendarChangeCount, boundary };
}
