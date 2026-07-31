"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Library, NotebookPen, PlayCircle, Search, Tag, X } from "lucide-react";
import { languageProps, matchesSearch, normalizeSearch, videoMatchesSearch } from "../../lib/discovery";
import type { PlaylistStudyProject, StudySession, StudyVideo } from "../../lib/playlist-study";

type ResultKind = "playlist" | "video" | "note" | "topic" | "session";
type SearchResult = {
  id: string;
  kind: ResultKind;
  title: string;
  context: string;
  body: string;
  updatedAt: string;
  score: number;
  project: PlaylistStudyProject;
  video?: StudyVideo;
  session?: StudySession;
  topic?: string;
};

const kindLabel: Record<ResultKind, string> = { playlist: "Playlist", video: "Video", note: "Note", topic: "Topic", session: "Session" };

function relevance(query: string, title: string, context: string, body = "") {
  const needle = normalizeSearch(query);
  const normalizedTitle = normalizeSearch(title);
  if (!needle) return 0;
  return (normalizedTitle === needle ? 100 : normalizedTitle.startsWith(needle) ? 70 : normalizedTitle.includes(needle) ? 45 : 0) +
    (normalizeSearch(context).includes(needle) ? 20 : 0) + (normalizeSearch(body).includes(needle) ? 10 : 0);
}

function ResultIcon({ kind }: { kind: ResultKind }) {
  if (kind === "playlist") return <Library size={16} />;
  if (kind === "note") return <NotebookPen size={16} />;
  if (kind === "topic") return <Tag size={16} />;
  if (kind === "session") return <CalendarDays size={16} />;
  return <PlayCircle size={16} />;
}

export default function GlobalSearch({ projects, onClose, onOpenProject, onOpenVideo, onOpenSession, onOpenTopic }: {
  projects: PlaylistStudyProject[];
  onClose: () => void;
  onOpenProject: (project: PlaylistStudyProject) => void;
  onOpenVideo: (project: PlaylistStudyProject, video: StudyVideo) => void;
  onOpenSession: (project: PlaylistStudyProject, session: StudySession) => void;
  onOpenTopic: (project: PlaylistStudyProject, topic: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | ResultKind>("all");
  const [sort, setSort] = useState<"relevance" | "title" | "recent">("relevance");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const found: SearchResult[] = [];
    projects.forEach((project) => {
      if (matchesSearch(query, project.title, project.goal, project.preferences)) found.push({ id: `playlist-${project.id}`, kind: "playlist", title: project.title, context: `${project.totalVideoCount} videos · ${project.status}`, body: `${project.goal} ${project.preferences}`, updatedAt: project.updatedAt, score: relevance(query, project.title, project.goal, project.preferences), project });
      project.videos.forEach((video) => {
        if (videoMatchesSearch(video, query)) found.push({ id: `video-${project.id}-${video.id}`, kind: "video", title: video.title, context: `${project.title} · Episode ${video.index} · ${video.topic}`, body: `${video.note} ${video.aiArtifacts?.summary || ""}`, updatedAt: video.watchedAt || project.updatedAt, score: relevance(query, video.title, video.topic, video.note), project, video });
        if (video.note.trim() && matchesSearch(query, video.note, video.title, video.topic)) found.push({ id: `note-${project.id}-${video.id}`, kind: "note", title: video.title, context: `${project.title} · Personal note`, body: video.note.replace(/^#+\s*/gm, "").slice(0, 180), updatedAt: video.watchedAt || project.updatedAt, score: relevance(query, video.title, video.topic, video.note) + 5, project, video });
      });
      Array.from(new Set(project.videos.map((video) => video.topic))).forEach((topic) => {
        if (matchesSearch(query, topic)) found.push({ id: `topic-${project.id}-${topic}`, kind: "topic", title: topic, context: `${project.title} · Topic`, body: "", updatedAt: project.updatedAt, score: relevance(query, topic, project.title), project, topic });
      });
      project.sessions.forEach((session) => {
        if (matchesSearch(query, session.date, session.module, ...session.videoIds.map((id) => project.videos.find((video) => video.id === id)?.title))) found.push({ id: `session-${project.id}-${session.id}`, kind: "session", title: session.module || "Playlist study session", context: `${project.title} · ${session.date} · ${session.videoIds.length} videos`, body: "", updatedAt: session.date, score: relevance(query, session.module || "Study session", session.date), project, session });
      });
    });
    const filtered = kind === "all" ? found : found.filter((item) => item.kind === kind);
    return filtered.sort((left, right) => sort === "title" ? left.title.localeCompare(right.title) : sort === "recent" ? right.updatedAt.localeCompare(left.updatedAt) : right.score - left.score).slice(0, 40);
  }, [kind, projects, query, sort]);

  function open(result: SearchResult) {
    if (result.kind === "playlist") onOpenProject(result.project);
    else if ((result.kind === "video" || result.kind === "note") && result.video) onOpenVideo(result.project, result.video);
    else if (result.kind === "session" && result.session) onOpenSession(result.project, result.session);
    else if (result.kind === "topic" && result.topic) onOpenTopic(result.project, result.topic);
    onClose();
  }

  return <div className="search-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="global-search" role="dialog" aria-modal="true" aria-label="Search learning library">
      <div className="global-search-input"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search playlists, videos, notes, topics, or dates…" aria-label="Search all learning content" dir="auto" /><kbd>/</kbd><button type="button" onClick={onClose} aria-label="Close search"><X size={17} /></button></div>
      <div className="global-search-controls">
        <div className="search-kind-tabs" role="tablist" aria-label="Result type">{(["all", "playlist", "video", "note", "topic", "session"] as const).map((value) => <button type="button" role="tab" aria-selected={kind === value} className={kind === value ? "active" : ""} key={value} onClick={() => setKind(value)}>{value === "all" ? "All" : kindLabel[value]}</button>)}</div>
        <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="relevance">Relevance</option><option value="recent">Recent</option><option value="title">Title</option></select></label>
      </div>
      <div className="global-search-results">
        {!query.trim() && <div className="search-prompt"><span><Search size={24} /></span><strong>Find anything in your learning library</strong><p>Try a command, topic, episode title, note phrase, playlist, or study date.</p><small>Press Esc to close</small></div>}
        {query.trim() && results.map((result) => <button className="global-result" type="button" key={result.id} onClick={() => open(result)}><span className={`global-result-icon ${result.kind}`}><ResultIcon kind={result.kind} /></span><span className="global-result-copy"><small>{kindLabel[result.kind]} · {result.context}</small><strong {...languageProps(result.title)}>{result.title}</strong>{result.body && <p {...languageProps(result.body)}>{result.body}</p>}</span><ArrowUpRight size={15} /></button>)}
        {query.trim() && !results.length && <div className="search-prompt"><span><Search size={24} /></span><strong>No matching results</strong><p>Try fewer words or choose a different result type.</p><button className="text-button" type="button" onClick={() => { setQuery(""); setKind("all"); }}>Clear search</button></div>}
      </div>
      {query.trim() && <footer><span>{results.length}{results.length === 40 ? "+" : ""} results</span><span>Open a result to jump directly to it</span></footer>}
    </section>
  </div>;
}
