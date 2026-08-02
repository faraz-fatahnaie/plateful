"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Flag,
  List,
  PlayCircle,
  Route,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { PlaylistStudyProject, StudySession, StudyVideo } from "../../lib/playlist-study";
import { formatDuration } from "../../lib/playlist-study";
import { languageProps, matchesSearch, videoMatchesSearch } from "../../lib/discovery";

type Frame = "journey" | "day" | "week" | "month";

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00`);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(dateAtNoon(value));
}

function longDate(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(dateAtNoon(value));
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(dateAtNoon(value));
}

type WeekStart = "saturday" | "sunday" | "monday";

const weekStartDay: Record<WeekStart, number> = { saturday: 6, sunday: 0, monday: 1 };
const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekKey(value: string, weekStartsOn: WeekStart) {
  const date = dateAtNoon(value);
  const daysFromStart = (date.getDay() - weekStartDay[weekStartsOn] + 7) % 7;
  date.setDate(date.getDate() - daysFromStart);
  return date.toISOString().slice(0, 10);
}

function episodeNumber(videoId: string) {
  return videoId.replace(/^ep-/, "");
}

function watchSeconds(session: StudySession) {
  return session.watchSeconds ?? session.plannedMinutes * 60;
}

function durationLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function RoadmapView({ project, weekStartsOn, onOpenVideo, onOpenSession, initialQuery = "" }: { project: PlaylistStudyProject; weekStartsOn: WeekStart; onOpenVideo: (video: StudyVideo) => void; onOpenSession: (session: StudySession) => void; initialQuery?: string }) {
  const [frame, setFrame] = useState<Frame>("journey");
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<"all" | "remaining" | "watched" | "needs-note" | "has-note">("all");
  const [sort, setSort] = useState<"sequence" | "title" | "duration-asc" | "duration-desc">("sequence");
  const sessions = project.sessions;
  const totalWatchSeconds = sessions.reduce((sum, session) => sum + watchSeconds(session), 0);

  const filteredVideos = useMemo(() => project.videos.filter((video) => videoMatchesSearch(video, query) && (
    status === "all" ||
    (status === "remaining" && !video.watched) ||
    (status === "watched" && video.watched) ||
    (status === "needs-note" && video.watched && !video.note.trim()) ||
    (status === "has-note" && Boolean(video.note.trim()))
  )).sort((left, right) => sort === "title" ? left.title.localeCompare(right.title) : sort === "duration-asc" ? left.durationSeconds - right.durationSeconds : sort === "duration-desc" ? right.durationSeconds - left.durationSeconds : left.index - right.index), [project.videos, query, sort, status]);

  const filteredVideoIds = useMemo(() => new Set(filteredVideos.map((video) => video.id)), [filteredVideos]);
  const filteredSessions = useMemo(() => sessions.filter((session) => {
    const queryMatch = matchesSearch(query, session.date, session.module, ...session.videoIds.map((id) => project.videos.find((video) => video.id === id)?.title));
    const stateMatch = status === "all" || session.videoIds.some((id) => filteredVideoIds.has(id));
    return queryMatch && stateMatch;
  }), [filteredVideoIds, project.videos, query, sessions, status]);

  const weeks = useMemo(() => {
    const grouped = new Map<string, StudySession[]>();
    filteredSessions.forEach((session) => {
      const key = weekKey(session.date, weekStartsOn);
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    });
    return Array.from(grouped.entries()).map(([start, items], index) => ({ start, items, index }));
  }, [filteredSessions, weekStartsOn]);

  const months = useMemo(() => {
    const grouped = new Map<string, StudySession[]>();
    filteredSessions.forEach((session) => {
      const key = session.date.slice(0, 7);
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    });
    return Array.from(grouped.entries()).map(([key, items]) => ({ key, items }));
  }, [filteredSessions]);

  const topicLevels = useMemo(() => {
    const priorityRank = (topic: string) => {
      const rank = project.policy.priorities.findIndex((priority) => priority === topic);
      return rank < 0 ? 100 : rank;
    };
    return Array.from(new Set(filteredVideos.map((video) => video.topic)))
      .sort((left, right) => priorityRank(left) - priorityRank(right))
      .map((topic, index) => ({
        topic,
        index,
        videos: filteredVideos.filter((video) => video.topic === topic),
      }));
  }, [filteredVideos, project.policy.priorities]);

  return (
    <section className="tab-panel roadmap-view">
      <article className="roadmap-hero">
        <div>
          <span className="feature-kicker"><Route size={14} /> Complete learning route</span>
          <h2 {...languageProps(project.title)}>{project.title} roadmap</h2>
          <p>See the same verified plan at the level you need: the next study day, each capacity-balanced week, or the complete calendar.</p>
        </div>
        <div className="roadmap-summary">
          <div><strong>{sessions.length}</strong><span>study days</span></div>
          <div><strong>{durationLabel(totalWatchSeconds)}</strong><span>watch time</span></div>
          <div><strong>{sessions.at(-1) ? shortDate(sessions.at(-1)!.date) : "—"}</strong><span>target finish</span></div>
        </div>
      </article>

      <div className="roadmap-toolbar">
        <div>
          <p className="eyebrow">Timeline lens</p>
          <h3>Full plan, three useful frames</h3>
        </div>
        <div className="frame-switcher" role="tablist" aria-label="Roadmap timeframe">
          <button className={frame === "journey" ? "active" : ""} onClick={() => setFrame("journey")} role="tab" aria-selected={frame === "journey"}><Trophy size={15} />Path</button>
          <button className={frame === "day" ? "active" : ""} onClick={() => setFrame("day")} role="tab" aria-selected={frame === "day"}><List size={15} />Day</button>
          <button className={frame === "week" ? "active" : ""} onClick={() => setFrame("week")} role="tab" aria-selected={frame === "week"}><CalendarRange size={15} />Week</button>
          <button className={frame === "month" ? "active" : ""} onClick={() => setFrame("month")} role="tab" aria-selected={frame === "month"}><CalendarDays size={15} />Month</button>
        </div>
      </div>

      <div className="collection-toolbar roadmap-discovery">
        <label className="collection-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search episodes, topics, modules, or dates…" aria-label="Search roadmap" dir="auto" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear roadmap search">×</button>}</label>
        <label><span>State</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">All states</option><option value="remaining">Remaining</option><option value="watched">Watched</option><option value="needs-note">Needs a note</option><option value="has-note">Has a note</option></select></label>
        {frame === "journey" && <label><span>Order</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="sequence">Playlist sequence</option><option value="title">Title A–Z</option><option value="duration-asc">Shortest first</option><option value="duration-desc">Longest first</option></select></label>}
        <span className="result-count">{frame === "journey" ? `${filteredVideos.length} videos` : `${filteredSessions.length} sessions`}</span>
      </div>

      {frame === "journey" && (
        <div className="learning-path frame-panel">
          <div className="path-start"><span><Flag size={18} /></span><div><small>START HERE</small><strong {...languageProps(project.policy.priorities[0])}>{project.policy.priorities[0] || "Playlist foundations"}</strong></div></div>
          {topicLevels.map((level) => {
            const completed = level.videos.filter((video) => video.watched).length;
            return <article className="path-level" key={level.topic}>
              <div className="level-heading"><span>LEVEL {level.index + 1}</span><div><h3 {...languageProps(level.topic)}>{level.topic}</h3><small>{completed} of {level.videos.length} shown completed</small></div><strong>{level.videos.length ? Math.round((completed / level.videos.length) * 100) : 0}%</strong></div>
              <div className="path-track">
                {level.videos.map((video, index) => {
                  const needsNote = video.watched && !video.note.trim();
                  const ready = !video.watched && (index === 0 || level.videos[index - 1]?.watched);
                  const state = video.watched ? (needsNote ? "needs-note" : "complete") : ready ? "ready" : "upcoming";
                  return <button className={`path-node ${state}`} type="button" key={video.id} onClick={() => onOpenVideo(video)} aria-label={`Open episode ${video.index}: ${video.title}`}>
                    <span>{video.watched ? <CheckCircle2 size={19} /> : <PlayCircle size={19} />}</span>
                    <small>EP {String(video.index).padStart(3, "0")}</small>
                    <strong {...languageProps(video.title)}>{video.title}</strong>
                    <em>{formatDuration(video.durationSeconds)}</em>
                    <i>{state === "complete" ? "Mastered" : state === "needs-note" ? "Add note" : state === "ready" ? "Ready now" : "Upcoming"}</i>
                  </button>;
                })}
              </div>
            </article>;
          })}
          {!topicLevels.length && <article className="path-empty"><Search size={25} /><h3>No roadmap items match</h3><p>Try another phrase or reset the learning-state filter.</p><button className="secondary-button" type="button" onClick={() => { setQuery(""); setStatus("all"); }}>Reset filters</button></article>}
        </div>
      )}

      {frame === "day" && (
        <div className="day-roadmap frame-panel">
          {filteredSessions.map((session, index) => (
            <article className="roadmap-day-card interactive-session" key={session.id} role="button" tabIndex={0} onClick={() => onOpenSession(session)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenSession(session); } }} aria-label={`Open ${longDate(session.date)} study session`}>
              <div className="roadmap-day-index"><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
              <div className="roadmap-date"><strong>{longDate(session.date)}</strong><span>{session.date}</span></div>
              <div className="roadmap-module"><strong {...languageProps(session.module)}>{session.module ?? "Playlist study"}</strong><span>{session.videoIds.length} video{session.videoIds.length === 1 ? "" : "s"}</span></div>
              <div className="episode-chips">{session.videoIds.map((id) => <span key={id}>{episodeNumber(id)}</span>)}</div>
              <div className="roadmap-duration"><Clock3 size={14} /><strong>{durationLabel(watchSeconds(session))}</strong></div>
            </article>
          ))}
          {!filteredSessions.length && <div className="collection-empty"><Search size={22} /><strong>No sessions match</strong><p>Try another phrase or reset the learning-state filter.</p><button className="secondary-button" type="button" onClick={() => { setQuery(""); setStatus("all"); }}>Reset filters</button></div>}
        </div>
      )}

      {frame === "week" && (
        <div className="week-roadmap frame-panel">
          {weeks.map((week) => {
            const weekSeconds = week.items.reduce((sum, session) => sum + watchSeconds(session), 0);
            const episodeCount = week.items.reduce((sum, session) => sum + session.videoIds.length, 0);
            const end = new Date(dateAtNoon(week.start));
            end.setDate(end.getDate() + 6);
            return (
              <article className="week-card" key={week.start}>
                <div className="week-card-heading">
                  <div><span>Week {week.index + 1}</span><h4>{shortDate(week.start)} — {shortDate(end.toISOString().slice(0, 10))}</h4></div>
                  <div className="week-totals"><strong>{episodeCount} videos</strong><span>{durationLabel(weekSeconds)}</span></div>
                </div>
                <div className="week-days">
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const date = new Date(dateAtNoon(week.start));
                    date.setDate(date.getDate() + dayIndex);
                    const key = date.toISOString().slice(0, 10);
                    const item = week.items.find((session) => session.date === key);
                    const isThursday = date.getDay() === 4;
                    return item ? <button type="button" className="week-day planned interactive-session" key={key} onClick={() => onOpenSession(item)} aria-label={`Open ${longDate(item.date)} study session`}>
                        <span>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(date)}</span>
                        <strong>{date.getDate()}</strong>
                        <small>{item.videoIds.length} video{item.videoIds.length === 1 ? "" : "s"}<br />{item.plannedMinutes}m</small>
                      </button> : <div className={`week-day ${isThursday ? "off" : ""}`} key={key} aria-label={`${longDate(key)}: ${isThursday ? "rest day" : "no session"}`}>
                        <span>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(date)}</span>
                        <strong>{date.getDate()}</strong>
                        <small>{isThursday ? "Rest" : "Open"}</small>
                      </div>;
                  })}
                </div>
                <div className="week-focus"><Sparkles size={14} /><span>{week.items.map((item) => item.module).filter((value, index, array) => value && array.indexOf(value) === index).join(" · ")}</span></div>
              </article>
            );
          })}
          {!weeks.length && <div className="collection-empty"><Search size={22} /><strong>No weeks match</strong><p>Search by episode, topic, module, or date.</p><button className="secondary-button" type="button" onClick={() => { setQuery(""); setStatus("all"); }}>Reset filters</button></div>}
        </div>
      )}

      {frame === "month" && (
        <div className="month-roadmap frame-panel">
          {months.map((month) => {
            const first = dateAtNoon(`${month.key}-01`);
            const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
            const startDay = weekStartDay[weekStartsOn];
            const offset = (first.getDay() - startDay + 7) % 7;
            const cells = Array.from({ length: offset + daysInMonth });
            const orderedWeekdays = Array.from({ length: 7 }, (_, index) => weekDayLabels[(startDay + index) % 7]);
            return (
              <article className="month-card" key={month.key}>
                <div className="month-heading"><h4>{monthLabel(`${month.key}-01`)}</h4><span>{month.items.length} sessions</span></div>
                <div className="month-weekdays">{orderedWeekdays.map((day) => <span key={day}>{day}</span>)}</div>
                <div className="month-grid">
                  {cells.map((_, cellIndex) => {
                    if (cellIndex < offset) return <span className="month-cell empty" key={`empty-${cellIndex}`} />;
                    const day = cellIndex - offset + 1;
                    const date = `${month.key}-${String(day).padStart(2, "0")}`;
                    const item = month.items.find((session) => session.date === date);
                    const thursday = dateAtNoon(date).getDay() === 4;
                    return item ? (
                      <button type="button" className="month-cell planned interactive-session" key={date} onClick={() => onOpenSession(item)} aria-label={`Open ${longDate(item.date)} study session`}>
                        <b>{day}</b>
                        <small>{item.videoIds.map(episodeNumber).join(" · ")}</small>
                      </button>
                    ) : <span className={`month-cell ${thursday ? "off" : ""}`} key={date}>
                      <b>{day}</b>
                      {thursday && <i>rest</i>}
                    </span>;
                  })}
                </div>
              </article>
            );
          })}
          {!months.length && <div className="collection-empty"><Search size={22} /><strong>No months match</strong><p>Search by episode, topic, module, or date.</p><button className="secondary-button" type="button" onClick={() => { setQuery(""); setStatus("all"); }}>Reset filters</button></div>}
        </div>
      )}

      <div className="roadmap-legend">
        <span><i className="legend-dot planned" />Planned study</span>
        <span><i className="legend-dot off" />Protected rest day</span>
        <span><CheckCircle2 size={14} />Checkboxes automatically reshape future sessions</span>
      </div>
    </section>
  );
}
