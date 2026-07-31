"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  buildSkillRequest,
  completedCount,
  formatDuration,
  LPIC_SAMPLE,
  PlaylistStudyProject,
  StudyVideo,
  todaySession,
} from "../lib/playlist-study";

type SaveState = "saved" | "saving" | "preview";

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

export default function StudyApp() {
  const [projects, setProjects] = useState<PlaylistStudyProject[]>([cloneSample()]);
  const [selectedId, setSelectedId] = useState(LPIC_SAMPLE.id);
  const [saveState, setSaveState] = useState<SaveState>("preview");
  const [noteVideo, setNoteVideo] = useState<StudyVideo | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showReplan, setShowReplan] = useState(false);
  const [notice, setNotice] = useState("");

  const project =
    projects.find((candidate) => candidate.id === selectedId) ?? projects[0];
  const session = todaySession(project);
  const sessionVideos = session.videoIds
    .map((id) => project.videos.find((video) => video.id === id))
    .filter((video): video is StudyVideo => Boolean(video));
  const finished = completedCount(project);
  const progress = project.totalVideoCount
    ? Math.round((finished / project.totalVideoCount) * 100)
    : 0;

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

  function toggleWatched(videoId: string) {
    const next: PlaylistStudyProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      calendar: {
        ...project.calendar,
        syncState: "changes-pending",
        pendingChangeCount: Math.max(1, project.calendar.pendingChangeCount + 1),
      },
      videos: project.videos.map((video) =>
        video.id === videoId ? { ...video, watched: !video.watched } : video,
      ),
    };
    replaceProject(next);
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
        timezone: String(data.get("timezone") || "Asia/Tehran"),
        startDate: String(data.get("startDate") || "2026-08-01"),
        startTime: String(data.get("startTime") || "20:00"),
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
          <a className="nav-item active" href="#today"><span>◉</span>Today</a>
          <a className="nav-item" href="#library"><span>▦</span>Playlists</a>
          <a className="nav-item" href="#schedule"><span>□</span>Schedule</a>
          <a className="nav-item" href="#notes"><span>≡</span>Notes</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note"><span>●</span><div><strong>Private workspace</strong><small>Your study data stays in your account.</small></div></div>
          <button className="profile" type="button"><span className="avatar">F</span><span><strong>Faraz</strong><small>Asia/Tehran</small></span><span>⌄</span></button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Friday, July 31</p>
            <h1>Good afternoon, Faraz.</h1>
          </div>
          <div className="top-actions">
            <span className={`save-state ${saveState}`}>{saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Preview data"}</span>
            <button className="icon-button" aria-label="Notifications" type="button">○</button>
            <button className="primary-button" type="button" onClick={() => setShowAdd(true)}>＋ Add playlist</button>
          </div>
        </header>

        {notice && <button className="notice" type="button" onClick={() => setNotice("")}>{notice}<span>×</span></button>}

        <div className="content-grid">
          <section className="main-column" id="today">
            <article className="hero-card">
              <div className="hero-copy">
                <div className="project-select-row">
                  <span className="status-pill">{project.status}</span>
                  <select aria-label="Choose playlist" value={project.id} onChange={(event) => setSelectedId(event.target.value)}>
                    {projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </div>
                <h2>{project.title}</h2>
                <p>{project.goal || "Ready for the planning skill to build this study project."}</p>
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
              <article className="session-card">
                <div className="section-heading">
                  <div><p className="eyebrow">Today’s session</p><h2>{sessionVideos.length} videos · {session.plannedMinutes} minutes</h2></div>
                  <span className="time-chip">◷ {project.policy.startTime}</span>
                </div>
                <div className="video-list">
                  {sessionVideos.map((video) => (
                    <div className={`video-row ${video.watched ? "done" : ""}`} key={video.id}>
                      <button className="check-button" aria-label={`Mark episode ${video.index} ${video.watched ? "not watched" : "watched"}`} type="button" onClick={() => toggleWatched(video.id)}>{video.watched ? "✓" : ""}</button>
                      <a className="episode-number" href={video.url} target="_blank" rel="noreferrer">{String(video.index).padStart(3, "0")}</a>
                      <div className="video-copy"><strong>{video.title}</strong><span>{video.topic} · {formatDuration(video.durationSeconds)}</span></div>
                      {video.note && <span className="note-dot" title="Notes added">●</span>}
                      <button className="text-button" type="button" onClick={() => openNote(video)}>{video.note ? "Edit note" : "Add note"}</button>
                      <a className="play-button" href={video.url} target="_blank" rel="noreferrer" aria-label={`Watch episode ${video.index}`}>▶</a>
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
              <div className="section-heading"><div><p className="eyebrow">Study map</p><h2>Priority topics</h2></div><button className="text-button" type="button" onClick={exportProject}>Export JSON ↗</button></div>
              <div className="topic-grid">
                {(topics.length ? topics : project.policy.priorities.map((name) => ({ name, done: 0, total: 0 }))).map((topic, index) => (
                  <article className="topic-card" key={topic.name}>
                    <span className={`topic-icon color-${index % 3}`}>{index + 1}</span>
                    <div><strong>{topic.name}</strong><span>{topic.total ? `${topic.done} of ${topic.total} visible videos complete` : "Waiting for inventory"}</span></div>
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
        </div>
      </section>

      {showAdd && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal wide-modal" onSubmit={addProject}>
            <div className="modal-heading"><div><p className="eyebrow">New study project</p><h2>Add a YouTube playlist</h2><p>The skill will verify videos and build the detailed plan after this intake.</p></div><button type="button" className="icon-button" onClick={() => setShowAdd(false)} aria-label="Close">×</button></div>
            <div className="form-grid">
              <label className="span-two">Playlist URL<input name="url" type="url" required placeholder="https://www.youtube.com/playlist?list=…" /></label>
              <label>Project name<input name="title" required placeholder="Linux networking course" /></label>
              <label>Start date<input name="startDate" type="date" defaultValue="2026-08-01" /></label>
              <label className="span-two">Learning goal<textarea name="goal" rows={2} placeholder="What should you be able to do when finished?" /></label>
              <label>Minutes on normal days<input name="weekdayMinutes" type="number" min="5" defaultValue="30" /></label>
              <label>Minutes on Friday<input name="fridayMinutes" type="number" min="5" defaultValue="60" /></label>
              <label>Study time<input name="startTime" type="time" defaultValue="20:00" /></label>
              <label>Timezone<input name="timezone" defaultValue="Asia/Tehran" /></label>
              <label>Excluded weekdays<input name="excluded" defaultValue="Thursday" /></label>
              <label>Priority topics<input name="priorities" placeholder="Network, disks" /></label>
              <label className="span-two">Other preferences<textarea name="preferences" rows={2} placeholder="Do not split videos; use Fridays for labs…" /></label>
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
            <textarea className="note-editor" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder={"## What I learned\n\n- Important idea\n\n## Practice\n\n- Command or example I reproduced\n\n## Remaining question\n\n- …"} />
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
