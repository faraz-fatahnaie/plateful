"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileDown,
  Home,
  Library,
  NotebookPen,
  Play,
  Plus,
  Route,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import GuideView from "./components/GuideView";
import GlobalSearch from "./components/GlobalSearch";
import NotificationCenter from "./components/NotificationCenter";
import ReportsView from "./components/ReportsView";
import RoadmapView from "./components/RoadmapView";
import SettingsView from "./components/SettingsView";
import VideoWorkspace from "./components/VideoWorkspace";
import { cloneDefaultSettings, type AppSettings } from "../lib/app-settings";
import { languageProps, matchesSearch, videoMatchesSearch } from "../lib/discovery";
import {
  buildSkillRequest,
  completedCount,
  formatDuration,
  LPIC_SAMPLE,
  PlaylistStudyProject,
  StudySession,
  StudyVideo,
  todaySession,
} from "../lib/playlist-study";

type SaveState = "saved" | "saving" | "preview";
type AppTab = "today" | "roadmap" | "playlists" | "notes" | "reports" | "guide" | "settings" | "video";

const tabCopy: Record<AppTab, { eyebrow: string; title: string }> = {
  today: { eyebrow: "Your next focused session", title: "Good afternoon, Faraz." },
  roadmap: { eyebrow: "Day · week · month", title: "See the whole road ahead." },
  playlists: { eyebrow: "Your learning library", title: "Every playlist, one system." },
  notes: { eyebrow: "Your knowledge archive", title: "Turn watching into recall." },
  reports: { eyebrow: "Progress you can act on", title: "See how your learning compounds." },
  guide: { eyebrow: "A five-step workflow", title: "Learn how to use Plateful." },
  settings: { eyebrow: "Preferences · AI · Calendar", title: "Your workspace, your rules." },
  video: { eyebrow: "Video learning cockpit", title: "Watch, understand, and remember." },
};

function cloneSample(): PlaylistStudyProject {
  return JSON.parse(JSON.stringify(LPIC_SAMPLE)) as PlaylistStudyProject;
}

function readableDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export default function StudyApp() {
  const [projects, setProjects] = useState<PlaylistStudyProject[]>([cloneSample()]);
  const [selectedId, setSelectedId] = useState(LPIC_SAMPLE.id);
  const [saveState, setSaveState] = useState<SaveState>("preview");
  const [noteVideo, setNoteVideo] = useState<StudyVideo | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showReplan, setShowReplan] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [previousTab, setPreviousTab] = useState<AppTab>("today");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [playlistQuery, setPlaylistQuery] = useState("");
  const [playlistStatus, setPlaylistStatus] = useState<"all" | PlaylistStudyProject["status"]>("all");
  const [playlistSort, setPlaylistSort] = useState<"recent" | "progress" | "title">("recent");
  const [noteQuery, setNoteQuery] = useState("");
  const [noteFilter, setNoteFilter] = useState<"all" | "has-note" | "missing-note" | "watched">("all");
  const [noteSort, setNoteSort] = useState<"episode" | "title" | "topic" | "recent">("episode");
  const [roadmapSeedQuery, setRoadmapSeedQuery] = useState("");
  const [appSettings, setAppSettings] = useState<AppSettings>(cloneDefaultSettings());
  const [aiSessionKeys, setAiSessionKeys] = useState<Record<string, string>>({});

  const project =
    projects.find((candidate) => candidate.id === selectedId) ?? projects[0];
  const defaultSession = todaySession(project);
  const session = project.sessions.find((item) => item.id === focusedSessionId) ?? defaultSession;
  const isFocusedSession = Boolean(focusedSessionId && session.id !== defaultSession.id);
  const sessionVideos = session.videoIds
    .map((id) => project.videos.find((video) => video.id === id))
    .filter((video): video is StudyVideo => Boolean(video));
  const finished = completedCount(project);
  const progress = project.totalVideoCount
    ? Math.round((finished / project.totalVideoCount) * 100)
    : 0;
  const selectedVideo = selectedVideoId
    ? project.videos.find((video) => video.id === selectedVideoId) ?? null
    : null;
  const unreadNotifications = (project.notifications || []).filter((item) => !item.read).length;

  const filteredProjects = useMemo(() => projects.filter((item) => (playlistStatus === "all" || item.status === playlistStatus) && matchesSearch(playlistQuery, item.title, item.goal, item.preferences)).sort((left, right) => {
    if (playlistSort === "title") return left.title.localeCompare(right.title);
    if (playlistSort === "progress") {
      const leftProgress = left.totalVideoCount ? completedCount(left) / left.totalVideoCount : 0;
      const rightProgress = right.totalVideoCount ? completedCount(right) / right.totalVideoCount : 0;
      return rightProgress - leftProgress;
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  }), [playlistQuery, playlistSort, playlistStatus, projects]);

  const filteredNotes = useMemo(() => project.videos.filter((video) => videoMatchesSearch(video, noteQuery) && (
    noteFilter === "all" ||
    (noteFilter === "has-note" && Boolean(video.note.trim())) ||
    (noteFilter === "missing-note" && !video.note.trim()) ||
    (noteFilter === "watched" && video.watched)
  )).sort((left, right) => {
    if (noteSort === "title") return left.title.localeCompare(right.title);
    if (noteSort === "topic") return left.topic.localeCompare(right.topic) || left.index - right.index;
    if (noteSort === "recent") return (right.watchedAt || "").localeCompare(left.watchedAt || "") || left.index - right.index;
    return left.index - right.index;
  }), [noteFilter, noteQuery, noteSort, project.videos]);

  const topics = useMemo(() => {
    const names = Array.from(new Set(project.videos.map((video) => video.topic)));
    return names.map((name) => {
      const videos = project.videos.filter((video) => video.topic === name);
      const done = videos.filter((video) => video.watched).length;
      return { name, done, total: videos.length };
    });
  }, [project]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then(async (response) => {
        if (!response.ok) throw new Error("Persistence unavailable");
        return (await response.json()) as { projects?: PlaylistStudyProject[] };
      })
      .then((payload) => {
        if (cancelled || !payload.projects?.length) return;
        setProjects(payload.projects);
        setSelectedId(payload.projects[0].id);
        setSaveState("saved");
      })
      .catch(() => setSaveState("preview"));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.isContentEditable;
      if ((event.key === "/" && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        setShowGlobalSearch(true);
      }
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) throw new Error("Settings persistence unavailable");
        return (await response.json()) as { settings?: AppSettings | null };
      })
      .then((payload) => {
        if (!cancelled && payload.settings) setAppSettings(payload.settings);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  async function persist(next: PlaylistStudyProject) {
    setSaveState("saving");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Save failed");
      setSaveState("saved");
    } catch {
      setSaveState("preview");
    }
  }

  function replaceProject(next: PlaylistStudyProject, shouldPersist = true) {
    setProjects((current) =>
      current.some((item) => item.id === next.id)
        ? current.map((item) => (item.id === next.id ? next : item))
        : [next, ...current],
    );
    if (shouldPersist) void persist(next);
  }

  async function saveAppSettings(next: AppSettings) {
    setAppSettings(next);
    setSaveState("saving");
    try {
      const response = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
      if (!response.ok) throw new Error("Settings save failed");
      const payload = (await response.json()) as { settings?: AppSettings };
      if (payload.settings) setAppSettings(payload.settings);
      setSaveState("saved");
      setNotice("Settings saved. Secret keys were not persisted.");
    } catch {
      setSaveState("preview");
      setNotice("Settings are active in this preview, but server persistence is unavailable.");
    }
  }

  async function prepareCalendarRemoval(target: PlaylistStudyProject) {
    const today = todayInTimezone(target.policy.timezone);
    const futureSessions = target.sessions.filter((item) => item.date >= today && item.status !== "complete");
    const requestedAt = new Date().toISOString();
    const requestText = [
      "Use the google-calendar and plan-youtube-playlist-study skills.",
      `Preview removal of future Google Calendar study events for playlist \"${target.title}\" only.`,
      `Project ID: ${target.id}`,
      `Playlist URL: ${target.playlistUrl}`,
      `Calendar: ${target.calendar.calendarId}`,
      `Timezone: ${target.policy.timezone}`,
      `Date boundary: ${today} and later`,
      `Expected future study sessions: ${futureSessions.length}`,
      "Match events by project ID metadata when available; otherwise use the exact playlist title and Plateful study-event title prefix.",
      "Preserve past events, completed events, and all unrelated events.",
      "Show the exact matching event list before deleting anything. Apply deletion only after explicit approval.",
    ].join("\n");
    await navigator.clipboard.writeText(requestText);
    replaceProject({
      ...target,
      updatedAt: requestedAt,
      calendar: { ...target.calendar, syncState: "changes-pending", pendingChangeCount: futureSessions.length, pendingAction: "remove", removalRequestedAt: requestedAt },
      notifications: [{ id: `calendar-remove-${requestedAt}`, kind: "replan", title: "Calendar removal preview ready", message: `Review ${futureSessions.length} future ${target.title} session${futureSessions.length === 1 ? "" : "s"} in Codex before approving deletion.`, createdAt: requestedAt, read: false, target: "roadmap" }, ...(target.notifications || [])],
    });
    setNotice("Exact Calendar removal request copied. Paste it into Codex to preview matching events and approve deletion.");
  }

  function toggleWatched(videoId: string) {
    const currentVideo = project.videos.find((video) => video.id === videoId);
    const completing = !currentVideo?.watched;
    const completedAt = new Date().toISOString();
    const next: PlaylistStudyProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      calendar: {
        ...project.calendar,
        syncState: "changes-pending",
        pendingChangeCount: Math.max(1, project.calendar.pendingChangeCount + 1),
      },
      videos: project.videos.map((video) =>
        video.id === videoId ? { ...video, watched: !video.watched, watchedAt: completing ? completedAt : null } : video,
      ),
      notifications: completing && currentVideo
        ? [
            {
              id: `note-${videoId}-${completedAt}`,
              kind: "note",
              title: `Episode ${currentVideo.index} completed`,
              message: currentVideo.note.trim() ? "Great work—your note is already attached." : "Add a short personal note while the ideas are fresh.",
              createdAt: completedAt,
              read: false,
              videoId,
            },
            ...(project.notifications || []),
          ]
        : project.notifications,
    };
    replaceProject(next);
  }

  function saveVideo(nextVideo: StudyVideo) {
    const savedAt = new Date().toISOString();
    replaceProject({
      ...project,
      videos: project.videos.map((video) => video.id === nextVideo.id ? nextVideo : video),
      updatedAt: savedAt,
      notifications: nextVideo.aiArtifacts && !project.videos.find((video) => video.id === nextVideo.id)?.aiArtifacts
        ? [{ id: `ai-${nextVideo.id}-${savedAt}`, kind: "ai", title: "AI study pack ready", message: `Summary, notes, and mind map created for episode ${nextVideo.index}.`, createdAt: savedAt, read: false, videoId: nextVideo.id }, ...(project.notifications || [])]
        : project.notifications,
    });
  }

  function openVideo(video: StudyVideo) {
    if (activeTab !== "video") setPreviousTab(activeTab);
    setSelectedVideoId(video.id);
    setActiveTab("video");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function leaveVideo() {
    setActiveTab(previousTab === "video" ? "today" : previousTab);
    setSelectedVideoId(null);
  }

  function openSession(nextSession: StudySession) {
    setFocusedSessionId(nextSession.id);
    setActiveTab("today");
    requestAnimationFrame(() => document.getElementById("today-session")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openGlobalProject(nextProject: PlaylistStudyProject) {
    setSelectedId(nextProject.id);
    setFocusedSessionId(null);
    setActiveTab("today");
  }

  function openGlobalVideo(nextProject: PlaylistStudyProject, video: StudyVideo) {
    setSelectedId(nextProject.id);
    setPreviousTab(activeTab === "video" ? "today" : activeTab);
    setSelectedVideoId(video.id);
    setActiveTab("video");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openGlobalSession(nextProject: PlaylistStudyProject, nextSession: StudySession) {
    setSelectedId(nextProject.id);
    setFocusedSessionId(nextSession.id);
    setActiveTab("today");
    requestAnimationFrame(() => document.getElementById("today-session")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openGlobalTopic(nextProject: PlaylistStudyProject, topic: string) {
    setSelectedId(nextProject.id);
    setRoadmapSeedQuery(topic);
    setActiveTab("roadmap");
  }

  function goToToday() {
    setFocusedSessionId(null);
    setActiveTab("today");
  }

  function navigateFromNotification(target?: string, videoId?: string) {
    setShowNotifications(false);
    if (videoId) {
      const video = project.videos.find((item) => item.id === videoId);
      if (video) openVideo(video);
      return;
    }
    if (target === "today") goToToday();
    else if (target && ["roadmap", "reports"].includes(target)) setActiveTab(target as AppTab);
  }

  function openNote(video: StudyVideo) {
    setNoteVideo(video);
    setNoteDraft(video.note);
  }

  function saveNote() {
    if (!noteVideo) return;
    const next = {
      ...project,
      updatedAt: new Date().toISOString(),
      videos: project.videos.map((video) =>
        video.id === noteVideo.id ? { ...video, note: noteDraft } : video,
      ),
    };
    replaceProject(next);
    setNoteVideo(null);
    setNotice(`Notes saved for episode ${noteVideo.index}.`);
  }

  async function copySyncRequest() {
    await navigator.clipboard.writeText(buildSkillRequest(project));
    setNotice("Calendar reconciliation request copied. Paste it into Codex.");
    setShowReplan(false);
  }

  function exportProject() {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.id}.playlist-study.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Portable playlist-study JSON exported.");
  }

  function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "New playlist").trim();
    const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "playlist"}-${Date.now()}`;
    const next: PlaylistStudyProject = {
      schemaVersion: 1,
      id,
      title,
      playlistUrl: String(data.get("url") || "").trim(),
      goal: String(data.get("goal") || "").trim(),
      preferences: String(data.get("preferences") || "").trim(),
      status: "planning",
      totalVideoCount: 0,
      totalDurationSeconds: 0,
      policy: {
        timezone: String(data.get("timezone") || appSettings.timezone),
        startDate: String(data.get("startDate") || "2026-08-01"),
        startTime: String(data.get("startTime") || appSettings.defaultStudyTime),
        weekdayMinutes: Number(data.get("weekdayMinutes") || 30),
        fridayMinutes: Number(data.get("fridayMinutes") || 60),
        excludedWeekdays: String(data.get("excluded") || "Thursday")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        priorities: String(data.get("priorities") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        doNotSplitVideos: true,
      },
      videos: [],
      sessions: [],
      calendar: {
        provider: "google",
        calendarId: "primary",
        syncState: "not-connected",
        pendingChangeCount: 0,
        lastSyncedAt: null,
      },
      notificationPreferences: {
        inApp: true,
        email: false,
        emailAddress: "",
        leadMinutes: 30,
        dailyDigest: true,
      },
      notifications: [],
      updatedAt: new Date().toISOString(),
    };
    replaceProject(next);
    setSelectedId(next.id);
    setShowAdd(false);
    setNotice("Playlist intake saved. Export it or ask the skill to complete its inventory and plan.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <span>Plateful</span>
        </div>
        <nav aria-label="Primary navigation">
          <button className={`nav-item ${activeTab === "today" ? "active" : ""}`} type="button" onClick={goToToday}><Home size={17} />Today</button>
          <button className={`nav-item ${activeTab === "roadmap" ? "active" : ""}`} type="button" onClick={() => { setRoadmapSeedQuery(""); setActiveTab("roadmap"); }}><Route size={17} />Roadmap</button>
          <button className={`nav-item ${activeTab === "playlists" ? "active" : ""}`} type="button" onClick={() => setActiveTab("playlists")}><Library size={17} />Playlists</button>
          <button className={`nav-item ${activeTab === "notes" ? "active" : ""}`} type="button" onClick={() => setActiveTab("notes")}><NotebookPen size={17} />Notes</button>
          <button className={`nav-item ${activeTab === "reports" ? "active" : ""}`} type="button" onClick={() => setActiveTab("reports")}><BarChart3 size={17} />Reports</button>
          <button className={`nav-item ${activeTab === "guide" ? "active" : ""}`} type="button" onClick={() => setActiveTab("guide")}><CircleHelp size={17} />How to use</button>
          <button className={`nav-item ${activeTab === "settings" ? "active" : ""}`} type="button" onClick={() => setActiveTab("settings")}><Settings2 size={17} />Settings</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note"><ShieldCheck size={15} /><div><strong>Private workspace</strong><small>Your study data stays in your account.</small></div></div>
          <button className="profile" type="button" onClick={() => setActiveTab("settings")}><span className="avatar">{(appSettings.displayName || "U").slice(0, 1).toUpperCase()}</span><span><strong>{appSettings.displayName || "User"}</strong><small>{appSettings.timezone}</small></span><ChevronDown size={15} /></button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{tabCopy[activeTab].eyebrow}</p>
            <h1>{tabCopy[activeTab].title}</h1>
          </div>
          <div className="top-actions">
            <button className="global-search-trigger" type="button" onClick={() => setShowGlobalSearch(true)} aria-label="Search all learning content"><Search size={15} /><span>Search</span><kbd>Ctrl K</kbd></button>
            <span className={`save-state ${saveState}`}>{saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Preview data"}</span>
            <button className="icon-button notification-trigger" aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ""}`} type="button" onClick={() => setShowNotifications(true)}><Bell size={17} />{unreadNotifications > 0 && <span>{unreadNotifications}</span>}</button>
            <button className="primary-button button-with-icon" type="button" onClick={() => setShowAdd(true)}><Plus size={16} />Add playlist</button>
          </div>
        </header>

        {notice && <button className="notice" type="button" onClick={() => setNotice("")}>{notice}<span>×</span></button>}

        {activeTab === "today" && <div className="content-grid tab-panel">
          <section className="main-column" id="today">
            <article className="hero-card">
              <div className="hero-copy">
                <div className="project-select-row">
                  <span className="status-pill">{project.status}</span>
                  <select aria-label="Choose playlist" value={project.id} onChange={(event) => setSelectedId(event.target.value)}>
                    {projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </div>
                <h2 {...languageProps(project.title)}>{project.title}</h2>
                <p {...languageProps(project.goal)}>{project.goal || "Ready for the planning skill to build this study project."}</p>
                <div className="progress-row"><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div>
                <div className="metrics">
                  <span><strong>{finished}</strong> completed</span>
                  <span><strong>{Math.max(0, project.totalVideoCount - finished)}</strong> remaining</span>
                  <span><strong>{Math.round(project.totalDurationSeconds / 3600)}h</strong> total</span>
                </div>
              </div>
              <div className="hero-orbit" aria-hidden="true"><span className="orbit-one" /><span className="orbit-two" /><strong>{progress}%</strong><small>complete</small></div>
            </article>

            {project.videos.length ? (
              <article className="session-card" id="today-session">
                <div className="section-heading">
                  <div><p className="eyebrow">{isFocusedSession ? `Selected session · ${readableDate(session.date)}` : "Today’s session"}</p><h2>{sessionVideos.length} videos · {session.plannedMinutes} minutes</h2></div>
                  <span className="time-chip"><Clock3 size={13} />{project.policy.startTime}</span>
                </div>
                {isFocusedSession && <button className="return-today" type="button" onClick={() => setFocusedSessionId(null)}>← Return to today’s session</button>}
                <div className="video-list">
                  {sessionVideos.map((video) => (
                    <div className={`video-row ${video.watched ? "done" : ""}`} key={video.id}>
                      <button className="check-button" aria-label={`Mark episode ${video.index} ${video.watched ? "not watched" : "watched"}`} type="button" onClick={() => toggleWatched(video.id)}>{video.watched ? "✓" : ""}</button>
                      <button className="episode-number" type="button" onClick={() => openVideo(video)}>{String(video.index).padStart(3, "0")}</button>
                      <button className="video-copy video-open-copy" type="button" onClick={() => openVideo(video)}><strong {...languageProps(video.title)}>{video.title}</strong><span {...languageProps(video.topic)}>{video.topic} · {formatDuration(video.durationSeconds)}</span></button>
                      {video.note && <span className="note-dot" title="Notes added">●</span>}
                      <button className="text-button" type="button" onClick={() => openNote(video)}>{video.note ? "Edit note" : "Add note"}</button>
                      <button className="play-button" type="button" onClick={() => openVideo(video)} aria-label={`Open episode ${video.index}`}><Play size={12} fill="currentColor" /></button>
                    </div>
                  ))}
                </div>
                <div className="session-footer">
                  <span>{sessionVideos.filter((video) => video.watched).length} of {sessionVideos.length} complete</span>
                  <button className="secondary-button" type="button" onClick={() => setShowReplan(true)}>I changed today’s plan</button>
                </div>
              </article>
            ) : (
              <article className="empty-card">
                <span className="empty-mark">◎</span>
                <h2>Ready for playlist analysis</h2>
                <p>The intake is saved in the fixed template. Export it, then give it to the planning skill to add verified videos, topics, durations, and sessions.</p>
                <button className="primary-button" type="button" onClick={exportProject}>Export planning request</button>
              </article>
            )}

            <section id="library" className="topic-section">
              <div className="section-heading"><div><p className="eyebrow">Study map</p><h2>Priority topics</h2></div><button className="text-button button-with-icon" type="button" onClick={exportProject}>Export JSON <ExternalLink size={12} /></button></div>
              <div className="topic-grid">
                {(topics.length ? topics : project.policy.priorities.map((name) => ({ name, done: 0, total: 0 }))).map((topic, index) => (
                  <article className="topic-card" key={topic.name}>
                    <span className={`topic-icon color-${index % 3}`}>{index + 1}</span>
                    <div><strong {...languageProps(topic.name)}>{topic.name}</strong><span>{topic.total ? `${topic.done} of ${topic.total} visible videos complete` : "Waiting for inventory"}</span></div>
                    <span>›</span>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <aside className="right-column" id="schedule">
            <article className="side-card sync-card">
              <div className="section-heading compact"><div><p className="eyebrow">Planner health</p><h3>Calendar</h3></div><span className={`sync-dot ${project.calendar.syncState}`} /></div>
              <div className="calendar-state"><strong>{project.calendar.syncState === "in-sync" ? "Everything is in sync" : project.calendar.syncState === "changes-pending" ? `${project.calendar.pendingChangeCount} change${project.calendar.pendingChangeCount === 1 ? "" : "s"} waiting` : "Calendar not connected"}</strong><span>Google Calendar · {project.calendar.calendarId}</span></div>
              <button className="primary-button full" type="button" onClick={() => setShowReplan(true)}>{project.calendar.syncState === "changes-pending" ? "Preview reschedule" : "Review sync flow"}</button>
            </article>

            <article className="side-card">
              <div className="section-heading compact"><div><p className="eyebrow">Coming up</p><h3>Next sessions</h3></div></div>
              <div className="timeline">
                {project.sessions.slice(1, 4).map((item, index) => (
                  <div className="timeline-item" key={item.id}><span className={index === 0 ? "current" : ""} /><div><strong>{readableDate(item.date)}</strong><small>{item.videoIds.length} video{item.videoIds.length === 1 ? "" : "s"} · {item.plannedMinutes} min</small></div></div>
                ))}
                {!project.sessions.length && <p className="muted">Sessions appear after the skill completes planning.</p>}
              </div>
            </article>

            <article className="side-card policy-card">
              <p className="eyebrow">Your study rules</p>
              <div className="policy-row"><span>Weekdays</span><strong>{project.policy.weekdayMinutes} min</strong></div>
              <div className="policy-row"><span>Friday</span><strong>{project.policy.fridayMinutes} min</strong></div>
              <div className="policy-row"><span>Days off</span><strong>{project.policy.excludedWeekdays.join(", ") || "None"}</strong></div>
              <div className="policy-row"><span>Timezone</span><strong>{project.policy.timezone}</strong></div>
            </article>
          </aside>
        </div>}

        {activeTab === "roadmap" && <RoadmapView key={`${project.id}-${roadmapSeedQuery}`} project={project} onOpenVideo={openVideo} onOpenSession={openSession} initialQuery={roadmapSeedQuery} />}

        {activeTab === "playlists" && (
          <section className="tab-panel library-view">
            <div className="panel-intro"><div><p className="eyebrow">Playlist library</p><h2>Keep every learning journey in one place</h2><p>Each project carries its own verified inventory, study policy, notes, roadmap, and Calendar state.</p></div><button className="primary-button button-with-icon" type="button" onClick={() => setShowAdd(true)}><Plus size={16} />New playlist</button></div>
            <div className="collection-toolbar">
              <label className="collection-search"><Search size={15} /><input value={playlistQuery} onChange={(event) => setPlaylistQuery(event.target.value)} placeholder="Search playlists, goals, or preferences…" aria-label="Search playlists" dir="auto" />{playlistQuery && <button type="button" onClick={() => setPlaylistQuery("")} aria-label="Clear playlist search">×</button>}</label>
              <label><span>Status</span><select value={playlistStatus} onChange={(event) => setPlaylistStatus(event.target.value as typeof playlistStatus)}><option value="all">All statuses</option><option value="active">Active</option><option value="planning">Planning</option><option value="paused">Paused</option><option value="complete">Complete</option></select></label>
              <label><span>Sort</span><select value={playlistSort} onChange={(event) => setPlaylistSort(event.target.value as typeof playlistSort)}><option value="recent">Recently updated</option><option value="progress">Highest progress</option><option value="title">Title A–Z</option></select></label>
              <span className="result-count">{filteredProjects.length} of {projects.length}</span>
            </div>
            <div className="project-grid">
              {filteredProjects.map((item, index) => {
                const itemFinished = completedCount(item);
                const itemProgress = item.totalVideoCount ? Math.round((itemFinished / item.totalVideoCount) * 100) : 0;
                return <button className={`project-card color-project-${index % 3}`} key={item.id} type="button" onClick={() => openGlobalProject(item)}><span className="project-card-icon"><Library size={20} /></span><span className="status-pill">{item.status}</span><h3 {...languageProps(item.title)}>{item.title}</h3><p {...languageProps(item.goal)}>{item.goal || "Waiting for the planning skill to complete this playlist."}</p><span className="project-card-progress"><i><b style={{ width: `${itemProgress}%` }} /></i><strong>{itemProgress}%</strong></span><span className="project-card-meta"><small>{item.totalVideoCount} videos</small><small>{item.sessions.length} study days</small><ExternalLink size={14} /></span></button>;
              })}
              {!playlistQuery && playlistStatus === "all" && <button className="project-card add-project-card" type="button" onClick={() => setShowAdd(true)}><span><Plus size={23} /></span><strong>Add another playlist</strong><small>Paste a link and set your study rules.</small></button>}
            </div>
            {!filteredProjects.length && <div className="collection-empty"><Search size={22} /><strong>No playlists match</strong><p>Try another phrase or reset the status filter.</p><button className="secondary-button" type="button" onClick={() => { setPlaylistQuery(""); setPlaylistStatus("all"); }}>Reset filters</button></div>}
          </section>
        )}

        {activeTab === "notes" && (
          <section className="tab-panel notes-view">
            <div className="panel-intro"><div><p className="eyebrow">Episode notes</p><h2>Your searchable learning trail</h2><p>Review what each episode taught you, then fill the gaps while the idea is still fresh.</p></div><button className="secondary-button button-with-icon" type="button" onClick={exportProject}><FileDown size={15} />Export project</button></div>
            <div className="notes-summary"><div><strong>{project.videos.filter((video) => video.note.trim()).length}</strong><span>notes written</span></div><div><strong>{project.videos.filter((video) => video.watched).length}</strong><span>videos watched</span></div><div><strong>{project.videos.filter((video) => video.watched && !video.note.trim()).length}</strong><span>notes to complete</span></div></div>
            <div className="collection-toolbar notes-toolbar">
              <label className="collection-search"><Search size={15} /><input value={noteQuery} onChange={(event) => setNoteQuery(event.target.value)} placeholder="Search titles, topics, or note text…" aria-label="Search episode notes" dir="auto" />{noteQuery && <button type="button" onClick={() => setNoteQuery("")} aria-label="Clear note search">×</button>}</label>
              <label><span>Filter</span><select value={noteFilter} onChange={(event) => setNoteFilter(event.target.value as typeof noteFilter)}><option value="all">All episodes</option><option value="has-note">Has a note</option><option value="missing-note">Missing note</option><option value="watched">Watched</option></select></label>
              <label><span>Sort</span><select value={noteSort} onChange={(event) => setNoteSort(event.target.value as typeof noteSort)}><option value="episode">Episode order</option><option value="recent">Recently watched</option><option value="title">Title A–Z</option><option value="topic">Topic</option></select></label>
              <span className="result-count">{filteredNotes.length} of {project.videos.length}</span>
            </div>
            <div className="notes-list">
              {filteredNotes.map((video) => <button className="note-list-row" type="button" key={video.id} onClick={() => openVideo(video)}><span className={`note-status ${video.note.trim() ? "has-note" : ""}`}><NotebookPen size={16} /></span><span className="note-list-copy"><small {...languageProps(video.topic)}>Episode {String(video.index).padStart(3, "0")} · {video.topic}</small><strong {...languageProps(video.title)}>{video.title}</strong><p {...languageProps(video.note)}>{video.note.trim() ? video.note.replace(/^#+\s*/gm, "").slice(0, 130) : "No note yet. Add 3–5 ideas, one command you tried, and one remaining question."}</p></span><span className="note-list-action">Open workspace<ExternalLink size={13} /></span></button>)}
              {!project.videos.length && <article className="empty-card"><span className="empty-mark"><NotebookPen size={24} /></span><h2>Notes begin after planning</h2><p>Once the playlist inventory is verified, every episode gets a dedicated note entry here.</p></article>}
            </div>
            {project.videos.length > 0 && !filteredNotes.length && <div className="collection-empty"><NotebookPen size={22} /><strong>No notes match</strong><p>Try another phrase or clear the note-state filter.</p><button className="secondary-button" type="button" onClick={() => { setNoteQuery(""); setNoteFilter("all"); }}>Reset filters</button></div>}
          </section>
        )}

        {activeTab === "guide" && <GuideView project={project} />}
        {activeTab === "reports" && <ReportsView project={project} />}
        {activeTab === "settings" && <SettingsView settings={appSettings} projects={projects} activeProject={project} sessionKeys={aiSessionKeys} onSessionKey={(id, value) => setAiSessionKeys((current) => ({ ...current, [id]: value }))} onSave={saveAppSettings} onPrepareCalendarRemoval={prepareCalendarRemoval} />}
        {activeTab === "video" && selectedVideo && <VideoWorkspace key={selectedVideo.id} project={project} video={selectedVideo} aiConnection={appSettings.aiConnections.find((item) => item.id === appSettings.activeAIConnectionId)} aiApiKey={appSettings.activeAIConnectionId ? aiSessionKeys[appSettings.activeAIConnectionId] || "" : ""} persistTranscript={appSettings.privacy.allowTranscriptStorage} onBack={leaveVideo} onToggleWatched={toggleWatched} onSaveVideo={saveVideo} onOpenVideo={openVideo} />}
      </section>

      {showNotifications && <NotificationCenter project={project} onClose={() => setShowNotifications(false)} onUpdate={replaceProject} onNavigate={navigateFromNotification} />}
      {showGlobalSearch && <GlobalSearch projects={projects} onClose={() => setShowGlobalSearch(false)} onOpenProject={openGlobalProject} onOpenVideo={openGlobalVideo} onOpenSession={openGlobalSession} onOpenTopic={openGlobalTopic} />}

      {showAdd && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal wide-modal" onSubmit={addProject}>
            <div className="modal-heading"><div><p className="eyebrow">New study project</p><h2>Add a YouTube playlist</h2><p>The skill will verify videos and build the detailed plan after this intake.</p></div><button type="button" className="icon-button" onClick={() => setShowAdd(false)} aria-label="Close">×</button></div>
            <div className="form-grid">
              <label className="span-two">Playlist URL<input name="url" type="url" required placeholder="https://www.youtube.com/playlist?list=…" /></label>
              <label>Project name<input name="title" required placeholder="Linux networking course" dir="auto" /></label>
              <label>Start date<input name="startDate" type="date" defaultValue="2026-08-01" /></label>
              <label className="span-two">Learning goal<textarea name="goal" rows={2} placeholder="What should you be able to do when finished?" dir="auto" /></label>
              <label>Minutes on normal days<input name="weekdayMinutes" type="number" min="5" defaultValue="30" /></label>
              <label>Minutes on Friday<input name="fridayMinutes" type="number" min="5" defaultValue="60" /></label>
              <label>Study time<input name="startTime" type="time" defaultValue={appSettings.defaultStudyTime} /></label>
              <label>Timezone<input name="timezone" defaultValue={appSettings.timezone} /></label>
              <label>Excluded weekdays<input name="excluded" defaultValue="Thursday" /></label>
              <label>Priority topics<input name="priorities" placeholder="Network, disks" dir="auto" /></label>
              <label className="span-two">Other preferences<textarea name="preferences" rows={2} placeholder="Do not split videos; use Fridays for labs…" dir="auto" /></label>
            </div>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setShowAdd(false)}>Cancel</button><button className="primary-button" type="submit">Save playlist intake</button></div>
          </form>
        </div>
      )}

      {noteVideo && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal note-modal" role="dialog" aria-modal="true" aria-label={`Notes for episode ${noteVideo.index}`}>
            <div className="modal-heading"><div><p className="eyebrow">Episode {String(noteVideo.index).padStart(3, "0")}</p><h2>{noteVideo.title}</h2></div><button type="button" className="icon-button" onClick={() => setNoteVideo(null)} aria-label="Close">×</button></div>
            <p className="note-prompt">Capture 3–5 ideas, commands you ran, one mistake, and one remaining question.</p>
            <textarea className="note-editor" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder={"## What I learned\n\n- Important idea\n\n## Practice\n\n- Command or example I reproduced\n\n## Remaining question\n\n- …"} dir="auto" />
            <div className="modal-actions"><a className="text-button" href={noteVideo.url} target="_blank" rel="noreferrer">Open video ↗</a><button className="primary-button" type="button" onClick={saveNote}>Save note</button></div>
          </section>
        </div>
      )}

      {showReplan && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal replan-modal" role="dialog" aria-modal="true" aria-label="Calendar reconciliation preview">
            <div className="modal-heading"><div><p className="eyebrow">Safe reconciliation</p><h2>Preview Calendar changes</h2><p>Past events stay untouched. Only future study blocks are recalculated from actual checkboxes.</p></div><button type="button" className="icon-button" onClick={() => setShowReplan(false)} aria-label="Close">×</button></div>
            <div className="replan-flow"><div><span>1</span><strong>Read progress</strong><small>{finished} checked videos are complete</small></div><div><span>2</span><strong>Repack sessions</strong><small>Thursday remains free; Friday allows 60 min</small></div><div><span>3</span><strong>Apply safely</strong><small>Codex previews exact Google Calendar edits</small></div></div>
            <div className="privacy-banner"><strong>Why Codex handles the final sync</strong><p>The public app never stores Google OAuth secrets. Your installed skill and connected Calendar perform the private mutation after you approve the preview.</p></div>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={exportProject}>Export project JSON</button><button className="primary-button" type="button" onClick={copySyncRequest}>Copy Codex sync request</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
