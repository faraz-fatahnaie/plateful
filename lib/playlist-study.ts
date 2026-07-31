export type PlaylistStatus = "active" | "paused" | "complete" | "planning";

export type StudyVideo = {
  id: string;
  index: number;
  title: string;
  url: string;
  durationSeconds: number;
  topic: string;
  watched: boolean;
  note: string;
  practiced: boolean;
};

export type StudySession = {
  id: string;
  date: string;
  videoIds: string[];
  plannedMinutes: number;
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
  videos: StudyVideo[];
  sessions: StudySession[];
  calendar: {
    provider: "google";
    calendarId: string;
    syncState: "not-connected" | "in-sync" | "changes-pending";
    pendingChangeCount: number;
    lastSyncedAt: string | null;
  };
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
    priorities: ["Networking fundamentals", "Disks and filesystems"],
    doNotSplitVideos: true,
  },
  videos: [
    {
      id: "ep-068",
      index: 68,
      title: "Networking fundamentals: IP addresses",
      url: "https://www.youtube.com/watch?v=8ptEav8iedA",
      durationSeconds: 998,
      topic: "Networking fundamentals",
      watched: false,
      note: "",
      practiced: false,
    },
    {
      id: "ep-069",
      index: 69,
      title: "Networking fundamentals: subnetting",
      url: "https://www.youtube.com/playlist?list=PL-tKrPVkKKE0kM18Sg5fqaZW1V2nidAeU",
      durationSeconds: 843,
      topic: "Networking fundamentals",
      watched: false,
      note: "",
      practiced: false,
    },
    {
      id: "ep-070",
      index: 70,
      title: "Networking fundamentals: routes",
      url: "https://www.youtube.com/playlist?list=PL-tKrPVkKKE0kM18Sg5fqaZW1V2nidAeU",
      durationSeconds: 1028,
      topic: "Networking fundamentals",
      watched: false,
      note: "",
      practiced: false,
    },
    {
      id: "ep-071",
      index: 71,
      title: "Network interfaces and configuration",
      url: "https://www.youtube.com/playlist?list=PL-tKrPVkKKE0kM18Sg5fqaZW1V2nidAeU",
      durationSeconds: 1210,
      topic: "Networking fundamentals",
      watched: false,
      note: "",
      practiced: false,
    },
    {
      id: "ep-011",
      index: 11,
      title: "Design hard disk layout",
      url: "https://www.youtube.com/playlist?list=PL-tKrPVkKKE0kM18Sg5fqaZW1V2nidAeU",
      durationSeconds: 1120,
      topic: "Disks and filesystems",
      watched: false,
      note: "",
      practiced: false,
    },
  ],
  sessions: [
    {
      id: "session-2026-07-31",
      date: "2026-07-31",
      videoIds: ["ep-068", "ep-069", "ep-070"],
      plannedMinutes: 48,
      status: "planned",
    },
    {
      id: "session-2026-08-01",
      date: "2026-08-01",
      videoIds: ["ep-071"],
      plannedMinutes: 21,
      status: "planned",
    },
    {
      id: "session-2026-08-02",
      date: "2026-08-02",
      videoIds: ["ep-011"],
      plannedMinutes: 19,
      status: "planned",
    },
  ],
  calendar: {
    provider: "google",
    calendarId: "primary",
    syncState: "in-sync",
    pendingChangeCount: 0,
    lastSyncedAt: "2026-07-31T11:20:00Z",
  },
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

export function todaySession(project: PlaylistStudyProject): StudySession {
  return project.sessions.find((session) => session.status === "planned") ?? project.sessions[0];
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
    "Preview future event changes before applying them.",
  ].join("\n");
}
