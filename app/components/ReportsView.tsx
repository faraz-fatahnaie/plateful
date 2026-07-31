"use client";

import { BarChart3, BookOpenCheck, Clock3, Flame, Gauge, NotebookPen, Sparkles, Target } from "lucide-react";
import type { PlaylistStudyProject } from "../../lib/playlist-study";

function minutes(seconds: number) {
  return Math.round(seconds / 60);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export default function ReportsView({ project }: { project: PlaylistStudyProject }) {
  const watched = project.videos.filter((video) => video.watched);
  const completedMinutes = minutes(watched.reduce((sum, video) => sum + video.durationSeconds, 0));
  const notesWritten = project.videos.filter((video) => video.note.trim()).length;
  const noteCoverage = watched.length ? Math.round((watched.filter((video) => video.note.trim()).length / watched.length) * 100) : 0;
  const visibleProgress = project.videos.length ? Math.round((watched.length / project.videos.length) * 100) : 0;

  const weekGroups = new Map<string, { planned: number; complete: number }>();
  project.sessions.forEach((session) => {
    const date = new Date(`${session.date}T12:00:00`);
    const saturday = new Date(date);
    saturday.setDate(date.getDate() - ((date.getDay() + 1) % 7));
    const key = saturday.toISOString().slice(0, 10);
    const group = weekGroups.get(key) || { planned: 0, complete: 0 };
    group.planned += session.watchSeconds ? minutes(session.watchSeconds) : session.plannedMinutes;
    group.complete += session.videoIds.reduce((sum, id) => {
      const video = project.videos.find((item) => item.id === id);
      return sum + (video?.watched ? minutes(video.durationSeconds) : 0);
    }, 0);
    weekGroups.set(key, group);
  });
  const weeks = Array.from(weekGroups.entries()).slice(0, 10);
  const maxWeek = Math.max(1, ...weeks.map(([, value]) => value.planned));

  const topics = Array.from(new Set(project.videos.map((video) => video.topic))).map((topic) => {
    const videos = project.videos.filter((video) => video.topic === topic);
    const done = videos.filter((video) => video.watched).length;
    return { topic, done, total: videos.length, percent: videos.length ? Math.round((done / videos.length) * 100) : 0 };
  });

  const completionDates = watched.map((video) => video.watchedAt?.slice(0, 10)).filter((value): value is string => Boolean(value));
  const streak = new Set(completionDates).size;
  const paceLabel = completedMinutes ? `${Math.max(1, Math.round(completedMinutes / Math.max(1, streak)))} min/day` : "Start today";

  return (
    <section className="tab-panel reports-view">
      <article className="reports-hero">
        <div><span className="feature-kicker"><BarChart3 size={14} /> Honest learning analytics</span><h2>Progress you can act on</h2><p>Planned time is compared with videos you actually marked complete. As your history grows, pace and consistency become more precise.</p></div>
        <div className="report-level"><span>Level</span><strong>{Math.max(1, Math.floor(watched.length / 5) + 1)}</strong><small>{5 - (watched.length % 5 || 5)} videos to next level</small></div>
      </article>

      <div className="metric-grid">
        <article><span className="metric-icon mint"><Clock3 size={19} /></span><div><small>Completed watch time</small><strong>{completedMinutes}<i> min</i></strong><p>From checked videos</p></div></article>
        <article><span className="metric-icon saffron"><Gauge size={19} /></span><div><small>Visible completion</small><strong>{visibleProgress}<i>%</i></strong><p>{watched.length} of {project.videos.length} inventoried</p></div></article>
        <article><span className="metric-icon coral"><Flame size={19} /></span><div><small>Active-day streak</small><strong>{streak}<i> days</i></strong><p>{paceLabel}</p></div></article>
        <article><span className="metric-icon sky"><NotebookPen size={19} /></span><div><small>Note coverage</small><strong>{noteCoverage}<i>%</i></strong><p>{notesWritten} personal notes</p></div></article>
      </div>

      <div className="report-grid">
        <article className="report-card watchtime-chart">
          <div className="report-heading"><div><p className="eyebrow">Capacity vs reality</p><h3>Weekly watch time</h3></div><span><i className="planned" />Planned<i className="actual" />Completed</span></div>
          <div className="bar-chart">
            {weeks.map(([week, value]) => <div className="bar-column" key={week}><div className="bars"><i className="planned" style={{ height: `${Math.max(4, (value.planned / maxWeek) * 100)}%` }} /><i className="actual" style={{ height: `${Math.max(value.complete ? 4 : 0, (value.complete / maxWeek) * 100)}%` }} /></div><small>{shortDate(week)}</small></div>)}
          </div>
          <p className="chart-note"><Sparkles size={13} />Thursday remains protected; Friday carries the largest study capacity.</p>
        </article>

        <article className="report-card topic-report">
          <div className="report-heading"><div><p className="eyebrow">Topic mastery</p><h3>Where your effort is going</h3></div><Target size={19} /></div>
          <div className="topic-report-list">{topics.map((topic) => <div key={topic.topic}><span><strong>{topic.topic}</strong><small>{topic.done}/{topic.total} videos</small></span><i><b style={{ width: `${topic.percent}%` }} /></i><em>{topic.percent}%</em></div>)}</div>
          {!topics.length && <p className="report-empty">Topic analytics appear after playlist inventory.</p>}
        </article>

        <article className="report-card quality-report">
          <div className="report-heading"><div><p className="eyebrow">Learning quality</p><h3>Beyond passive watching</h3></div><BookOpenCheck size={19} /></div>
          <div className="quality-ring" style={{ "--quality": `${Math.round((noteCoverage + visibleProgress) / 2)}%` } as React.CSSProperties}><span><strong>{Math.round((noteCoverage + visibleProgress) / 2)}%</strong><small>quality score</small></span></div>
          <ul><li><span>Watched videos</span><strong>{watched.length}</strong></li><li><span>Personal notes</span><strong>{notesWritten}</strong></li><li><span>AI study packs</span><strong>{project.videos.filter((video) => video.aiArtifacts).length}</strong></li><li><span>Hands-on practice</span><strong>{project.videos.filter((video) => video.practiced).length}</strong></li></ul>
        </article>
      </div>
    </section>
  );
}
