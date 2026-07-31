"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  List,
  Route,
  Sparkles,
} from "lucide-react";
import type { PlaylistStudyProject, StudySession } from "../../lib/playlist-study";

type Frame = "day" | "week" | "month";

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

function saturdayWeekKey(value: string) {
  const date = dateAtNoon(value);
  const daysFromSaturday = (date.getDay() + 1) % 7;
  date.setDate(date.getDate() - daysFromSaturday);
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

export default function RoadmapView({ project }: { project: PlaylistStudyProject }) {
  const [frame, setFrame] = useState<Frame>("week");
  const sessions = project.sessions;
  const totalWatchSeconds = sessions.reduce((sum, session) => sum + watchSeconds(session), 0);

  const weeks = useMemo(() => {
    const grouped = new Map<string, StudySession[]>();
    sessions.forEach((session) => {
      const key = saturdayWeekKey(session.date);
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    });
    return Array.from(grouped.entries()).map(([start, items], index) => ({ start, items, index }));
  }, [sessions]);

  const months = useMemo(() => {
    const grouped = new Map<string, StudySession[]>();
    sessions.forEach((session) => {
      const key = session.date.slice(0, 7);
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    });
    return Array.from(grouped.entries()).map(([key, items]) => ({ key, items }));
  }, [sessions]);

  return (
    <section className="tab-panel roadmap-view">
      <article className="roadmap-hero">
        <div>
          <span className="feature-kicker"><Route size={14} /> Complete learning route</span>
          <h2>{project.title} roadmap</h2>
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
          <button className={frame === "day" ? "active" : ""} onClick={() => setFrame("day")} role="tab" aria-selected={frame === "day"}><List size={15} />Day</button>
          <button className={frame === "week" ? "active" : ""} onClick={() => setFrame("week")} role="tab" aria-selected={frame === "week"}><CalendarRange size={15} />Week</button>
          <button className={frame === "month" ? "active" : ""} onClick={() => setFrame("month")} role="tab" aria-selected={frame === "month"}><CalendarDays size={15} />Month</button>
        </div>
      </div>

      {frame === "day" && (
        <div className="day-roadmap frame-panel">
          {sessions.map((session, index) => (
            <article className="roadmap-day-card" key={session.id}>
              <div className="roadmap-day-index"><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
              <div className="roadmap-date"><strong>{longDate(session.date)}</strong><span>{session.date}</span></div>
              <div className="roadmap-module"><strong>{session.module ?? "Playlist study"}</strong><span>{session.videoIds.length} video{session.videoIds.length === 1 ? "" : "s"}</span></div>
              <div className="episode-chips">{session.videoIds.map((id) => <span key={id}>{episodeNumber(id)}</span>)}</div>
              <div className="roadmap-duration"><Clock3 size={14} /><strong>{durationLabel(watchSeconds(session))}</strong></div>
            </article>
          ))}
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
                    return (
                      <div className={`week-day ${item ? "planned" : ""} ${isThursday ? "off" : ""}`} key={key}>
                        <span>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(date)}</span>
                        <strong>{date.getDate()}</strong>
                        {item ? <small>{item.videoIds.length} video{item.videoIds.length === 1 ? "" : "s"}<br />{item.plannedMinutes}m</small> : <small>{isThursday ? "Rest" : "Open"}</small>}
                      </div>
                    );
                  })}
                </div>
                <div className="week-focus"><Sparkles size={14} /><span>{week.items.map((item) => item.module).filter((value, index, array) => value && array.indexOf(value) === index).join(" · ")}</span></div>
              </article>
            );
          })}
        </div>
      )}

      {frame === "month" && (
        <div className="month-roadmap frame-panel">
          {months.map((month) => {
            const first = dateAtNoon(`${month.key}-01`);
            const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
            const offset = (first.getDay() + 1) % 7;
            const cells = Array.from({ length: offset + daysInMonth });
            return (
              <article className="month-card" key={month.key}>
                <div className="month-heading"><h4>{monthLabel(`${month.key}-01`)}</h4><span>{month.items.length} sessions</span></div>
                <div className="month-weekdays">{["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="month-grid">
                  {cells.map((_, cellIndex) => {
                    if (cellIndex < offset) return <span className="month-cell empty" key={`empty-${cellIndex}`} />;
                    const day = cellIndex - offset + 1;
                    const date = `${month.key}-${String(day).padStart(2, "0")}`;
                    const item = month.items.find((session) => session.date === date);
                    const thursday = dateAtNoon(date).getDay() === 4;
                    return (
                      <span className={`month-cell ${item ? "planned" : ""} ${thursday ? "off" : ""}`} key={date}>
                        <b>{day}</b>
                        {item && <small>{item.videoIds.map(episodeNumber).join(" · ")}</small>}
                        {thursday && !item && <i>rest</i>}
                      </span>
                    );
                  })}
                </div>
              </article>
            );
          })}
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
