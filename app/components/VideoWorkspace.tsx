"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  KeyRound,
  Link2,
  ListTree,
  LoaderCircle,
  NotebookPen,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";
import type { AIStudyArtifacts, PlaylistStudyProject, StudyVideo } from "../../lib/playlist-study";
import type { AIConnection, AIProvider } from "../../lib/app-settings";
import { AI_PROVIDER_CATALOG, getAIProvider, providerAllowsKey, providerDefaults as getProviderDefaults } from "../../lib/ai-providers";
import { buildStudyPrompt, parseStudyArtifacts, STUDY_PROMPT_PRESETS, type StudyPromptPresetId } from "../../lib/ai-study";
import { formatDuration } from "../../lib/playlist-study";
import { languageProps } from "../../lib/discovery";

type WorkspaceTab = "overview" | "ai" | "notes";

function youtubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) return url.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export default function VideoWorkspace({
  project,
  video,
  onBack,
  onToggleWatched,
  onSaveVideo,
  onOpenVideo,
  aiConnection,
  aiApiKey = "",
  persistTranscript = true,
}: {
  project: PlaylistStudyProject;
  video: StudyVideo;
  onBack: () => void;
  onToggleWatched: (videoId: string) => void;
  onSaveVideo: (video: StudyVideo) => void;
  onOpenVideo: (video: StudyVideo) => void;
  aiConnection?: AIConnection;
  aiApiKey?: string;
  persistTranscript?: boolean;
}) {
  const [tab, setTab] = useState<WorkspaceTab>(video.aiArtifacts ? "ai" : "overview");
  const [note, setNote] = useState(video.note);
  const [transcript, setTranscript] = useState(video.transcript || "");
  const [transcriptSource, setTranscriptSource] = useState<AIStudyArtifacts["transcriptSource"]>(video.transcript ? "pasted" : "youtube-captions");
  const [provider, setProvider] = useState<AIProvider>(aiConnection?.provider || "ollama");
  const [model, setModel] = useState(aiConnection?.model || "gemma3");
  const [baseUrl, setBaseUrl] = useState(aiConnection?.baseUrl || "http://localhost:11434");
  const [apiKey, setApiKey] = useState(aiApiKey);
  const [credentialMode, setCredentialMode] = useState<AIConnection["credentialMode"]>(aiConnection?.credentialMode || "session");
  const [aiBusy, setAiBusy] = useState(false);
  const [transcriptBusy, setTranscriptBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [manualResponse, setManualResponse] = useState("");
  const [promptPreset, setPromptPreset] = useState<StudyPromptPresetId>("complete");
  const [promptDraft, setPromptDraft] = useState(() => buildStudyPrompt({ title: video.title, topic: video.topic, transcript: video.transcript || "" }));
  const [promptCustomized, setPromptCustomized] = useState(false);

  const session = project.sessions.find((item) => item.videoIds.includes(video.id));
  const position = session ? session.videoIds.indexOf(video.id) + 1 : 0;
  const plannedVideos = project.sessions
    .flatMap((item) => item.videoIds)
    .map((id) => project.videos.find((item) => item.id === id))
    .filter((item): item is StudyVideo => Boolean(item));
  const index = plannedVideos.findIndex((item) => item.id === video.id);
  const previous = index > 0 ? plannedVideos[index - 1] : null;
  const next = index >= 0 && index < plannedVideos.length - 1 ? plannedVideos[index + 1] : null;
  const directId = youtubeId(video.url);

  const artifactNote = useMemo(() => {
    if (!video.aiArtifacts) return "";
    return [
      "## AI summary",
      video.aiArtifacts.summary,
      "",
      "## Key points",
      ...video.aiArtifacts.keyPoints.map((point) => `- ${point}`),
      ...(video.aiArtifacts.commands.length ? ["", "## Commands", ...video.aiArtifacts.commands.map((command) => `- \`${command}\``)] : []),
      "",
      "## Practice",
      ...video.aiArtifacts.practice.map((item) => `- ${item}`),
    ].join("\n");
  }, [video.aiArtifacts]);

  function setProviderDefaults(value: AIProvider) {
    const defaults = getProviderDefaults(value);
    setProvider(value);
    setApiKey("");
    setCredentialMode(defaults.credentialMode);
    setModel(defaults.model);
    setBaseUrl(defaults.baseUrl);
  }

  async function loadTranscript() {
    setTranscriptBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/videos/transcript", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: video.url }),
      });
      const payload = (await response.json()) as { transcript?: string; error?: string };
      if (!response.ok || !payload.transcript) throw new Error(payload.error || "Captions unavailable");
      setTranscript(payload.transcript);
      setTranscriptSource("youtube-captions");
      if (!promptCustomized) setPromptDraft(buildStudyPrompt({ title: video.title, topic: video.topic, transcript: payload.transcript }, promptPreset));
      if (persistTranscript) onSaveVideo({ ...video, transcript: payload.transcript });
      setMessage(`Public captions loaded${persistTranscript ? " and saved" : " for this session only"}. Review them before generating study material.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Captions unavailable. Paste a transcript instead.");
    } finally {
      setTranscriptBusy(false);
    }
  }

  async function analyze() {
    if (!transcript.trim()) {
      setMessage("Load captions or paste a transcript first.");
      return;
    }
    setAiBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, model, baseUrl, apiKey, credentialMode, title: video.title, topic: video.topic, transcript, transcriptSource, prompt: promptDraft }),
      });
      const payload = (await response.json()) as { artifacts?: AIStudyArtifacts; error?: string };
      if (!response.ok || !payload.artifacts) throw new Error(payload.error || "AI analysis failed");
      onSaveVideo({ ...video, transcript: persistTranscript ? transcript : undefined, aiArtifacts: payload.artifacts });
      setTab("ai");
      setMessage("Study pack created. Your personal note is still separate and unchanged.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI analysis failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function copyManualRequest() {
    if (!transcript.trim()) {
      setMessage("Load captions or paste a transcript first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(promptDraft.trim() || buildStudyPrompt({ title: video.title, topic: video.topic, transcript }, promptPreset));
      setMessage("Prompt copied. Paste it in ChatGPT, then bring the JSON response back here.");
    } catch {
      setMessage("Clipboard access was blocked. Select and copy the prepared request manually.");
    }
  }

  function refreshPrompt(nextPreset: StudyPromptPresetId = promptPreset) {
    setPromptPreset(nextPreset);
    setPromptDraft(buildStudyPrompt({ title: video.title, topic: video.topic, transcript }, nextPreset));
    setPromptCustomized(false);
    setMessage("Prepared prompt refreshed from the current transcript. You can edit every word before sending it.");
  }

  async function openChatGPTHandoff() {
    if (!transcript.trim()) {
      setMessage("Load captions or paste a transcript first.");
      return;
    }
    const chatWindow = window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    await copyManualRequest();
    if (!chatWindow) setMessage("Prompt copied. Your browser blocked the new tab, so open chatgpt.com and paste it there.");
  }

  function importManualResponse() {
    try {
      const artifacts: AIStudyArtifacts = { ...parseStudyArtifacts(manualResponse), provider: "chatgpt-manual", model: model || "ChatGPT", generatedAt: new Date().toISOString(), transcriptSource };
      onSaveVideo({ ...video, transcript: persistTranscript ? transcript : undefined, aiArtifacts: artifacts });
      setMessage("ChatGPT study pack imported. Your personal note is still separate and unchanged.");
    } catch (error) {
      setMessage(error instanceof Error ? `Could not import: ${error.message}` : "Could not import the ChatGPT response.");
    }
  }

  function saveNote() {
    onSaveVideo({ ...video, note });
    setMessage("Personal note saved.");
  }

  function appendAI() {
    const nextNote = [note.trim(), artifactNote].filter(Boolean).join("\n\n");
    setNote(nextNote);
    onSaveVideo({ ...video, note: nextNote });
    setTab("notes");
    setMessage("AI material appended to your personal note. You can edit it freely.");
  }

  return (
    <section className="tab-panel video-workspace">
      <div className="video-breadcrumb">
        <button type="button" onClick={onBack}><ArrowLeft size={15} />Back</button>
        <span {...languageProps(project.title)}>{project.title}</span><i>/</i><strong>Episode {String(video.index).padStart(3, "0")}</strong>
      </div>

      <div className="video-stage">
        <article className="player-card">
          <div className="player-frame">
            {directId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${directId}?rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="player-unavailable"><span><Play size={25} /></span><h3>Direct video ID needed</h3><p>This playlist entry does not yet contain its individual YouTube URL.</p><a href={video.url} target="_blank" rel="noreferrer">Open playlist <ExternalLink size={14} /></a></div>
            )}
          </div>
          <div className="player-meta">
            <div><span className="episode-badge">EP {String(video.index).padStart(3, "0")}</span><span className="topic-badge" {...languageProps(video.topic)}>{video.topic}</span></div>
            <h2 {...languageProps(video.title)}>{video.title}</h2>
            <div className="player-facts"><span><Clock3 size={14} />{formatDuration(video.durationSeconds)}</span><a href={video.url} target="_blank" rel="noreferrer"><Link2 size={14} />YouTube link</a><span><NotebookPen size={14} />{video.note.trim() ? "Note added" : "Note needed"}</span></div>
            <button className={`watch-state-button ${video.watched ? "watched" : ""}`} type="button" onClick={() => onToggleWatched(video.id)}>{video.watched ? <CheckCircle2 size={18} /> : <Check size={18} />}{video.watched ? "Completed" : "Mark as watched"}</button>
          </div>
        </article>

        <aside className="schedule-inspector">
          <p className="eyebrow">Scheduling information</p>
          <h3>{session ? dateLabel(session.date) : "Not scheduled yet"}</h3>
          <div className="schedule-facts">
            <span><CalendarDays size={17} /><b>{session?.date || "—"}</b><small>planned date</small></span>
            <span><Clock3 size={17} /><b>{project.policy.startTime}</b><small>{session?.plannedMinutes || 0} min session</small></span>
            <span><ListTree size={17} /><b>{position || "—"} of {session?.videoIds.length || "—"}</b><small>session position</small></span>
          </div>
          <div className="state-stack"><span><i className={video.watched ? "state-done" : "state-ready"} />{video.watched ? "Watched" : "Ready to watch"}</span><span><i className={video.note.trim() ? "state-done" : "state-note"} />{video.note.trim() ? "Personal note complete" : "Personal note missing"}</span><span><i className={video.aiArtifacts ? "state-done" : "state-idle"} />{video.aiArtifacts ? "AI study pack ready" : "AI study pack not created"}</span></div>
          <div className="episode-navigation"><button disabled={!previous} onClick={() => previous && onOpenVideo(previous)}><ArrowLeft size={14} />Previous</button><button disabled={!next} onClick={() => next && onOpenVideo(next)}>Next<ArrowRight size={14} /></button></div>
        </aside>
      </div>

      <div className="workspace-tabs" role="tablist" aria-label="Video workspace sections">
        <button className={tab === "overview" ? "active" : ""} aria-selected={tab === "overview"} onClick={() => setTab("overview")} role="tab"><FileText size={15} />Learn</button>
        <button className={tab === "ai" ? "active" : ""} aria-selected={tab === "ai"} onClick={() => setTab("ai")} role="tab"><WandSparkles size={15} />AI tools{video.aiArtifacts && <i />}</button>
        <button className={tab === "notes" ? "active" : ""} aria-selected={tab === "notes"} onClick={() => setTab("notes")} role="tab"><NotebookPen size={15} />Notes</button>
      </div>

      {message && <div className="workspace-message">{message}</div>}

      {tab === "overview" && (
        <div className="overview-grid workspace-panel">
          <article className="detail-card"><p className="eyebrow">Episode identity</p><h3>Everything about this video</h3><dl><div><dt>Playlist</dt><dd {...languageProps(project.title)}>{project.title}</dd></div><div><dt>Topic</dt><dd {...languageProps(video.topic)}>{video.topic}</dd></div><div><dt>Episode</dt><dd>{video.index}</dd></div><div><dt>Duration</dt><dd>{formatDuration(video.durationSeconds)}</dd></div><div><dt>Practiced</dt><dd>{video.practiced ? "Yes" : "Not yet"}</dd></div><div><dt>Completed at</dt><dd>{video.watchedAt ? new Date(video.watchedAt).toLocaleString() : "Not completed"}</dd></div></dl></article>
          <article className="detail-card focus-card"><p className="eyebrow">Definition of done</p><h3>Learn it, don’t just play it</h3><ul><li className={video.watched ? "done" : ""}><span>{video.watched && <Check size={13} />}</span>Watch the complete episode</li><li className={video.note.trim() ? "done" : ""}><span>{video.note.trim() && <Check size={13} />}</span>Capture 3–5 useful ideas</li><li className={video.practiced ? "done" : ""}><span>{video.practiced && <Check size={13} />}</span>Reproduce one command or example</li><li className={video.aiArtifacts ? "done" : ""}><span>{video.aiArtifacts && <Check size={13} />}</span>Review the AI study pack (optional)</li></ul></article>
        </div>
      )}

      {tab === "ai" && (
        <div className="ai-studio workspace-panel">
          <article className="ai-control-card">
            <div className="ai-card-heading"><span><Bot size={21} /></span><div><p className="eyebrow">Bring your own AI</p><h3>Create a study pack</h3></div></div>
            {aiConnection && <div className="active-ai-connection"><CheckCircle2 size={14} /><span>{provider === aiConnection.provider ? <>Using Settings connection: <strong>{aiConnection.name}</strong></> : <>Temporary video override: <strong>{getAIProvider(provider).label}</strong></>}</span></div>}
            <div className="provider-picker"><label>Connection type<select value={provider} onChange={(event) => setProviderDefaults(event.target.value as AIProvider)}>{AI_PROVIDER_CATALOG.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><p>{getAIProvider(provider).description}</p></div>
            <div className="ai-fields"><label>Model<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Model ID" /></label><label>Endpoint<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} /></label>{providerAllowsKey(provider) && credentialMode === "session" && <label>API key <span>used once, never saved</span><div className="secret-input"><KeyRound size={14} /><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="••••••••••" autoComplete="off" /></div></label>}{providerAllowsKey(provider) && credentialMode === "server" && <p className="server-key-ready">Using the server-managed secret configured in Settings.</p>}</div>
            {provider === "chatgpt" && <p className="provider-caveat"><strong>ChatGPT Premium handoff:</strong> this uses your existing signed-in ChatGPT browser session. Plateful does not request your password, cookies, or an API key.</p>}
            {provider === "openai" && <p className="provider-caveat">A ChatGPT subscription is separate from API access. This automatic connection requires an OpenAI API key.</p>}
            <div className="transcript-heading"><div><strong>Video transcript</strong><small>AI analyzes this text—not the video stream.</small></div><button onClick={loadTranscript} disabled={transcriptBusy}>{transcriptBusy ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />}Try captions</button></div>
            <textarea className="transcript-editor" value={transcript} onChange={(event) => { const value = event.target.value; setTranscript(value); setTranscriptSource("pasted"); if (!promptCustomized) setPromptDraft(buildStudyPrompt({ title: video.title, topic: video.topic, transcript: value }, promptPreset)); }} placeholder="Load public captions or paste the transcript here…" dir="auto" />
            <div className="prompt-workbench">
              <div className="prompt-workbench-heading"><div><strong>What should AI create?</strong><small>Choose a starting point, then edit the prepared prompt.</small></div><button type="button" onClick={() => refreshPrompt()}><RefreshCw size={13} />Refresh</button></div>
              <div className="prompt-presets" role="list" aria-label="Study prompt presets">
                {STUDY_PROMPT_PRESETS.map((item) => <button type="button" role="listitem" className={promptPreset === item.id ? "active" : ""} key={item.id} onClick={() => refreshPrompt(item.id)}><strong>{item.label}</strong><small>{item.description}</small></button>)}
              </div>
              <label className="prompt-editor-label">Editable prompt<textarea className="prompt-editor" value={promptDraft} onChange={(event) => { setPromptDraft(event.target.value); setPromptCustomized(true); }} dir="auto" /></label>
            </div>
            {provider === "chatgpt" ? <div className="manual-ai-handoff"><div className="handoff-step"><span>1</span><div><strong>Send the prepared prompt</strong><small>The button copies your edited prompt and opens your signed-in ChatGPT.</small></div></div><button className="primary-button full button-with-icon" type="button" onClick={openChatGPTHandoff}><ExternalLink size={15} />Copy prompt & open ChatGPT</button><button className="text-button copy-only-button" type="button" onClick={copyManualRequest}><Copy size={14} />Copy only</button><div className="handoff-step"><span>2</span><div><strong>Bring the answer back</strong><small>Copy ChatGPT&apos;s JSON answer and paste it below. Plateful validates it before saving.</small></div></div><label>ChatGPT response<textarea value={manualResponse} onChange={(event) => setManualResponse(event.target.value)} placeholder={'{"summary":"…","keyPoints":[…],"commands":[],"mindMap":[…],"practice":[…],"quiz":[…]}'} dir="auto" /></label><button className="secondary-button full button-with-icon" type="button" onClick={importManualResponse} disabled={!manualResponse.trim()}><Upload size={15} />Import & show result</button></div> : <button className="primary-button full ai-generate-button" type="button" disabled={aiBusy || !promptDraft.trim()} onClick={analyze}>{aiBusy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{aiBusy ? "Building your study pack…" : video.aiArtifacts ? "Regenerate with this prompt" : "Send prompt & create study pack"}</button>}
          </article>

          <article className="ai-results-card">
            {video.aiArtifacts ? <>
              <div className="ai-result-heading"><div><p className="eyebrow">AI study pack</p><h3>{video.aiArtifacts.model}</h3></div><span>{new Date(video.aiArtifacts.generatedAt).toLocaleDateString()}</span></div>
              <section className="artifact-section"><h4>Summary</h4><p {...languageProps(video.aiArtifacts.summary)}>{video.aiArtifacts.summary}</p></section>
              <section className="artifact-section"><h4>Key ideas</h4><ul>{video.aiArtifacts.keyPoints.map((point) => <li {...languageProps(point)} key={point}>{point}</li>)}</ul></section>
              {video.aiArtifacts.commands.length > 0 && <section className="artifact-section"><h4>Commands & examples</h4><div className="command-list">{video.aiArtifacts.commands.map((command) => <code key={command} {...languageProps(command)}>{command}</code>)}</div></section>}
              <section className="artifact-section"><h4>Mind map</h4><div className="mind-map"><strong {...languageProps(video.topic)}>{video.topic}</strong><div>{video.aiArtifacts.mindMap.map((branch) => <span key={branch.label}><b {...languageProps(branch.label)}>{branch.label}</b>{branch.children.map((child) => <small {...languageProps(child)} key={child}>{child}</small>)}</span>)}</div></div></section>
              <section className="artifact-section"><h4>Practice</h4><ol>{video.aiArtifacts.practice.map((item) => <li {...languageProps(item)} key={item}>{item}</li>)}</ol></section>
              <section className="artifact-section"><h4>Quick quiz</h4><div className="quiz-list">{video.aiArtifacts.quiz.map((item, quizIndex) => <details key={`${item.question}-${quizIndex}`}><summary><span>{quizIndex + 1}</span><strong {...languageProps(item.question)}>{item.question}</strong></summary><p {...languageProps(item.answer)}>{item.answer}</p></details>)}</div></section>
              <button className="secondary-button button-with-icon" type="button" onClick={appendAI}><NotebookPen size={14} />Append to my note</button>
            </> : <div className="ai-empty"><span><WandSparkles size={28} /></span><h3>No study pack yet</h3><p>Load captions or paste a transcript, choose your AI, and generate a summary, notes, mind map, practice tasks, and quiz.</p></div>}
          </article>
        </div>
      )}

      {tab === "notes" && (
        <article className="personal-note-panel workspace-panel">
          <div><p className="eyebrow">Your own words</p><h3>Personal episode note</h3><p>Keep this separate from AI output until you explicitly append it.</p></div>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={"## What I learned\n\n- Important idea\n\n## Practice\n\n- Command or example I reproduced\n\n## Remaining question\n\n- …"} dir="auto" />
          <button className="primary-button button-with-icon" type="button" onClick={saveNote}><Save size={15} />Save personal note</button>
        </article>
      )}
    </section>
  );
}
