import { LPIC_SESSIONS } from "./lpic-roadmap";
import { LPIC_VIDEO_DATA } from "./lpic-videos";

export type PlaylistStatus = "active" | "paused" | "complete" | "planning";

export type MindMapBranch = {
  label: string;
  children: string[];
};

export type AIStudyArtifacts = {
  provider: string;
  model: string;
  generatedAt: string;
  transcriptSource: "youtube-captions" | "pasted" | "external-service";
  summary: string;
  keyPoints: string[];
  commands: string[];
  mindMap: MindMapBranch[];
  practice: string[];
  quiz: Array<{ question: string; answer: string }>;
};

export type StudyVideo = {
  id: string;
  index: number;
  title: string;
  url: string;
  durationSeconds: number;
  topic: string;
  publisherTopic?: string;
  topicSource?: TopicMethod;
  watched: boolean;
  watchedAt?: string | null;
  note: string;
  practiced: boolean;
  transcript?: string;
  aiArtifacts?: AIStudyArtifacts;
};

export type TopicMethod = "publisher" | "ai" | "manual";

export type TopicOrganization = {
  preferredMethod: TopicMethod;
  lastGeneratedBy: TopicMethod | null;
  publisherSegmentsDetected: boolean;
  userEdited: boolean;
  aiProvider?: string;
  updatedAt: string | null;
};

export type StudyNotification = {
  id: string;
  kind: "session" | "replan" | "note" | "ai" | "milestone";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  videoId?: string;
  target?: "today" | "roadmap" | "reports";
};

export type NotificationPreferences = {
  inApp: boolean;
  email: boolean;
  emailAddress: string;
  leadMinutes: number;
  dailyDigest: boolean;
};

export type StudySession = {
  id: string;
  date: string;
  videoIds: string[];
  plannedMinutes: number;
  watchSeconds?: number;
  module?: string;
  status: "planned" | "complete" | "missed";
};

export type StudyPolicy = {
  timezone: string;
  startDate: string;
  startTime: string;
  weekdayMinutes: number;
  fridayMinutes: number;
  excludedWeekdays: string[];
  priorities: string[];
  doNotSplitVideos: boolean;
};

export type PlaylistStudyProject = {
  schemaVersion: 1;
  id: string;
  title: string;
  playlistUrl: string;
  goal: string;
  preferences: string;
  status: PlaylistStatus;
  totalVideoCount: number;
  totalDurationSeconds: number;
  policy: StudyPolicy;
  topicOrganization?: TopicOrganization;
  videos: StudyVideo[];
  sessions: StudySession[];
  calendar: {
    provider: "google";
    calendarId: string;
    syncState: "not-connected" | "in-sync" | "changes-pending";
    pendingChangeCount: number;
    lastSyncedAt: string | null;
    pendingAction?: "sync" | "remove";
    removalRequestedAt?: string | null;
  };
  notificationPreferences?: NotificationPreferences;
  notifications?: StudyNotification[];
  updatedAt: string;
};

export const LPIC_SAMPLE: PlaylistStudyProject = {
  schemaVersion: 1,
  id: "lpic-1-v5",
  title: "LPIC-1 version 5.0",
  playlistUrl:
    "https://www.youtube.com/playlist?list=PL-tKrPVkKKE0kM18Sg5fqaZW1V2nidAeU",
  goal: "Build practical LPIC-1 knowledge with short notes and one lab per topic.",
  preferences: "Networking first, then disk and filesystem topics.",
  status: "active",
  totalVideoCount: 81,
  totalDurationSeconds: 85520,
  policy: {
    timezone: "Asia/Tehran",
    startDate: "2026-07-31",
    startTime: "20:00",
    weekdayMinutes: 30,
    fridayMinutes: 60,
    excludedWeekdays: ["Thursday"],
    priorities: ["Networking fundamentals", "Linux installation and package management", "Devices, Linux filesystems, and FHS"],
    doNotSplitVideos: true,
  },
  topicOrganization: {
    preferredMethod: "publisher",
    lastGeneratedBy: "publisher",
    publisherSegmentsDetected: true,
    userEdited: false,
    updatedAt: "2026-07-31T11:20:00Z",
  },
  videos: LPIC_VIDEO_DATA.map((video) => ({
    ...video,
    publisherTopic: video.topic,
    topicSource: "publisher" as const,
    id: `ep-${String(video.index).padStart(3, "0")}`,
    watched: false,
    watchedAt: null,
    note: "",
    practiced: false,
  })),
  sessions: LPIC_SESSIONS,
  calendar: {
    provider: "google",
    calendarId: "primary",
    syncState: "in-sync",
    pendingChangeCount: 0,
    lastSyncedAt: "2026-07-31T11:20:00Z",
  },
  notificationPreferences: {
    inApp: true,
    email: false,
    emailAddress: "faraz.fatahnaie@gmail.com",
    leadMinutes: 30,
    dailyDigest: true,
  },
  notifications: [
    {
      id: "welcome-roadmap",
      kind: "session",
      title: "LPIC networking session scheduled",
      message: "Episodes 68–70 · 48 minutes · July 31 at 20:00",
      createdAt: "2026-07-31T15:30:00Z",
      read: false,
      target: "today",
    },
    {
      id: "network-first",
      kind: "milestone",
      title: "Priority route unlocked",
      message: "Networking comes first, followed by disks and filesystems.",
      createdAt: "2026-07-31T11:20:00Z",
      read: false,
      target: "roadmap",
    },
  ],
  updatedAt: "2026-07-31T11:20:00Z",
};

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export function completedCount(project: PlaylistStudyProject): number {
  return project.videos.filter((video) => video.watched).length;
}

export function dateInTimezone(timezone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
    return `${value("year")}-${value("month")}-${value("day")}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function todaySession(project: PlaylistStudyProject, now = new Date()): StudySession {
  const today = dateInTimezone(project.policy.timezone, now);
  const planned = project.sessions.filter((session) => session.status === "planned");
  return planned.find((session) => session.date === today)
    ?? planned.find((session) => session.date > today)
    ?? planned[0]
    ?? project.sessions[0]
    ?? { id: `unscheduled-${project.id}`, date: today, videoIds: [], plannedMinutes: 0, status: "planned" };
}

export function buildSkillRequest(project: PlaylistStudyProject): string {
  return [
    "Use the plan-youtube-playlist-study skill.",
    `Reconcile project \"${project.title}\" from its fixed playlist-study JSON.`,
    "Treat checked videos as complete and preserve past Calendar events.",
    `Timezone: ${project.policy.timezone}; time: ${project.policy.startTime}.`,
    `Skip: ${project.policy.excludedWeekdays.join(", ") || "none"}.`,
    `Friday: ${project.policy.fridayMinutes} minutes; other days: ${project.policy.weekdayMinutes} minutes.`,
    `Priorities: ${project.policy.priorities.join("; ") || "playlist order"}.`,
    `Topic method: ${project.topicOrganization?.preferredMethod || "publisher"}; preserve publisher labels and all user edits.`,
    "Preview future event changes before applying them.",
  ].join("\n");
}
