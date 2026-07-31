"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CalendarX, CheckCircle2, ExternalLink, KeyRound, LoaderCircle, Plus, Save, Server, ShieldCheck, Trash2, User } from "lucide-react";
import type { AIConnection, AIProvider, AppSettings } from "../../lib/app-settings";
import { AI_PROVIDER_CATALOG, AI_PROVIDER_GROUP_LABELS, getAIProvider, providerAllowsKey, providerDefaults } from "../../lib/ai-providers";
import type { PlaylistStudyProject } from "../../lib/playlist-study";

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export default function SettingsView({
  settings,
  projects,
  activeProject,
  sessionKeys,
  onSessionKey,
  onSave,
  onPrepareCalendarRemoval,
}: {
  settings: AppSettings;
  projects: PlaylistStudyProject[];
  activeProject: PlaylistStudyProject;
  sessionKeys: Record<string, string>;
  onSessionKey: (connectionId: string, value: string) => void;
  onSave: (settings: AppSettings) => Promise<void>;
  onPrepareCalendarRemoval: (project: PlaylistStudyProject) => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [calendarProjectId, setCalendarProjectId] = useState(activeProject.id);
  const [confirmProject, setConfirmProject] = useState<PlaylistStudyProject | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(settings), [settings]);
  useEffect(() => setCalendarProjectId(activeProject.id), [activeProject.id]);

  const calendarProject = projects.find((item) => item.id === calendarProjectId) || activeProject;
  const futureSessions = useMemo(() => {
    const today = todayInTimezone(calendarProject.policy.timezone);
    return calendarProject.sessions.filter((session) => session.date >= today && session.status !== "complete");
  }, [calendarProject]);

  function updateConnection(id: string, patch: Partial<AIConnection>) {
    setDraft((current) => ({
      ...current,
      aiConnections: current.aiConnections.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item),
    }));
  }

  function addConnection() {
    const id = `ai-${Date.now()}`;
    const defaults = providerDefaults("chatgpt");
    setDraft((current) => ({
      ...current,
      aiConnections: [...current.aiConnections, { id, name: "My ChatGPT", enabled: true, updatedAt: new Date().toISOString(), ...defaults }],
      activeAIConnectionId: current.activeAIConnectionId || id,
    }));
  }

  function removeConnection(id: string) {
    setDraft((current) => {
      const next = current.aiConnections.filter((item) => item.id !== id);
      return { ...current, aiConnections: next, activeAIConnectionId: current.activeAIConnectionId === id ? next[0]?.id || null : current.activeAIConnectionId };
    });
    onSessionKey(id, "");
  }

  async function testConnection(connection: AIConnection) {
    setTesting(connection.id);
    setTestResults((current) => ({ ...current, [connection.id]: { ok: false, text: "Testing…" } }));
    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...connection, apiKey: sessionKeys[connection.id] || "" }),
      });
      const payload = (await response.json()) as { connected?: boolean; detail?: string; error?: string };
      if (!response.ok || !payload.connected) throw new Error(payload.error || "Connection failed");
      setTestResults((current) => ({ ...current, [connection.id]: { ok: true, text: payload.detail || "Connection verified." } }));
    } catch (error) {
      setTestResults((current) => ({ ...current, [connection.id]: { ok: false, text: error instanceof Error ? error.message : "Connection failed" } }));
    } finally {
      setTesting(null);
    }
  }

  async function save() {
    setSaving(true);
    await onSave({ ...draft, updatedAt: new Date().toISOString() });
    setSaving(false);
  }

  return (
    <section className="tab-panel settings-view">
      <div className="settings-lead"><div><p className="eyebrow">One place for your preferences</p><h2>Make Plateful work your way</h2><p>Defaults are saved to your account. API keys are never written to app settings.</p></div><button className="primary-button button-with-icon" type="button" onClick={save} disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save settings"}</button></div>

      <div className="settings-layout">
        <article className="settings-card">
          <div className="settings-section-head"><span><User size={19} /></span><div><h3>Profile & study defaults</h3><p>Used when you add a new playlist.</p></div></div>
          <div className="settings-form-grid">
            <label>Display name<input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} dir="auto" /></label>
            <label>Timezone<input value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} /></label>
            <label>Default study time<input type="time" value={draft.defaultStudyTime} onChange={(event) => setDraft({ ...draft, defaultStudyTime: event.target.value })} /></label>
            <label>Week starts on<select value={draft.weekStartsOn} onChange={(event) => setDraft({ ...draft, weekStartsOn: event.target.value as AppSettings["weekStartsOn"] })}><option value="saturday">Saturday</option><option value="sunday">Sunday</option><option value="monday">Monday</option></select></label>
            <label>Appearance<select value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value as AppSettings["theme"] })}><option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
            <label className="settings-check"><input type="checkbox" checked={draft.privacy.allowTranscriptStorage} onChange={(event) => setDraft({ ...draft, privacy: { allowTranscriptStorage: event.target.checked } })} /><span><strong>Store transcripts</strong><small>Keep fetched or pasted transcripts with episode data.</small></span></label>
          </div>
        </article>

        <article className="settings-card settings-span-two">
          <div className="settings-section-head"><span><Bot size={19} /></span><div><h3>External AI connections</h3><p>Use a signed-in AI account, a cloud API, a private local model, or a custom endpoint.</p></div><button className="secondary-button button-with-icon" type="button" onClick={addConnection}><Plus size={14} />Add connection</button></div>
          <div className="ai-connection-modes"><span><strong>Account-assisted</strong><small>ChatGPT subscription · copy/open/import</small></span><span><strong>Automatic APIs</strong><small>OpenAI · Anthropic · Gemini · OpenRouter</small></span><span><strong>Local & custom</strong><small>Ollama · LM Studio · compatible APIs</small></span></div>
          <div className="connection-list">
            {draft.aiConnections.map((connection) => {
              const result = testResults[connection.id];
              const definition = getAIProvider(connection.provider);
              return <div className={`connection-card ${draft.activeAIConnectionId === connection.id ? "active" : ""}`} key={connection.id}>
                <div className="connection-title"><label className="radio-title"><input type="radio" name="active-ai" checked={draft.activeAIConnectionId === connection.id} onChange={() => setDraft({ ...draft, activeAIConnectionId: connection.id })} /><span><strong>{connection.name || "Unnamed connection"}</strong><small>{draft.activeAIConnectionId === connection.id ? "Default for video study" : "Set as default"}</small></span></label><span className={`provider-pill ${connection.provider}`}>{definition.mode === "manual" ? "manual handoff" : definition.shortLabel}</span></div>
                <div className="connection-fields">
                  <label>Name<input value={connection.name} onChange={(event) => updateConnection(connection.id, { name: event.target.value })} /></label>
                  <label>Connection type<select value={connection.provider} onChange={(event) => { const provider = event.target.value as AIProvider; const next = getAIProvider(provider); updateConnection(connection.id, { ...providerDefaults(provider), name: next.defaultName }); }}>{(["account", "cloud", "local", "custom"] as const).map((group) => <optgroup label={AI_PROVIDER_GROUP_LABELS[group]} key={group}>{AI_PROVIDER_CATALOG.filter((item) => item.group === group).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</optgroup>)}</select></label>
                  <label>Model<input value={connection.model} onChange={(event) => updateConnection(connection.id, { model: event.target.value })} placeholder="Model ID" /></label>
                  <label>Endpoint<input value={connection.baseUrl} onChange={(event) => updateConnection(connection.id, { baseUrl: event.target.value })} /></label>
                  {providerAllowsKey(connection.provider) && <label>Credential source<select value={connection.credentialMode} onChange={(event) => updateConnection(connection.id, { credentialMode: event.target.value as AIConnection["credentialMode"] })}>{definition.auth === "optional-key" && <option value="none">No key</option>}<option value="session">Enter key for this session</option>{definition.serverSecret && <option value="server">Use server secret</option>}</select></label>}
                  {providerAllowsKey(connection.provider) && connection.credentialMode === "session" && <label>API key<div className="secret-input"><KeyRound size={14} /><input type="password" value={sessionKeys[connection.id] || ""} onChange={(event) => onSessionKey(connection.id, event.target.value)} placeholder="Used in memory only" autoComplete="off" /></div></label>}
                  {providerAllowsKey(connection.provider) && connection.credentialMode === "server" && <div className="server-secret"><Server size={15} /><span><strong>{definition.serverSecret}</strong><small>Configure this secret on your own server.</small></span></div>}
                </div>
                <p className="provider-description">{definition.description} {definition.docsUrl && <a href={definition.docsUrl} target="_blank" rel="noreferrer">Provider guide <ExternalLink size={12} /></a>}</p>
                {connection.provider === "chatgpt" && <p className="provider-caveat"><strong>Your Premium account works here through a manual handoff.</strong> Plateful prepares the request, opens ChatGPT, then imports the JSON result. It never asks for your ChatGPT password or cookies.</p>}
                {connection.provider === "openai" && <p className="provider-caveat">ChatGPT subscriptions and OpenAI API billing are separate. This automatic connection uses an OpenAI API key.</p>}
                <div className="connection-actions"><span className={result ? (result.ok ? "connection-result ok" : "connection-result error") : "connection-result"}>{result?.ok && <CheckCircle2 size={13} />}{result?.text || "Not tested yet"}</span><button className="text-button danger-text" type="button" onClick={() => removeConnection(connection.id)}><Trash2 size={13} />Remove</button><button className="secondary-button" type="button" onClick={() => testConnection(connection)} disabled={testing === connection.id}>{testing === connection.id ? <><LoaderCircle className="spin" size={14} />Testing…</> : "Test connection"}</button></div>
              </div>;
            })}
            {!draft.aiConnections.length && <div className="settings-empty"><Bot size={22} /><strong>No AI connection</strong><small>Add one to create summaries, notes, mind maps, practice tasks, and quizzes.</small></div>}
          </div>
          <div className="privacy-callout"><ShieldCheck size={17} /><p><strong>Secret-safe by design.</strong> Session keys stay only in browser memory and disappear on refresh. Saved connection profiles contain provider, endpoint, model, and credential mode—never the key.</p></div>
        </article>

        <article className="settings-card settings-span-two calendar-danger-card">
          <div className="settings-section-head"><span><CalendarX size={19} /></span><div><h3>Calendar management</h3><p>Remove one playlist’s future study blocks without touching its app data.</p></div></div>
          <div className="calendar-management">
            <label>Playlist<select value={calendarProject.id} onChange={(event) => setCalendarProjectId(event.target.value)}>{projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <div className="calendar-removal-summary"><span><strong>{futureSessions.length}</strong><small>future sessions</small></span><span><strong>{calendarProject.calendar.calendarId}</strong><small>calendar</small></span><span><strong>{calendarProject.calendar.syncState}</strong><small>sync state</small></span></div>
            {calendarProject.calendar.pendingAction === "remove" && <p className="pending-removal">Removal preview requested {calendarProject.calendar.removalRequestedAt ? new Date(calendarProject.calendar.removalRequestedAt).toLocaleString() : "recently"}. Paste the copied request into Codex to review the exact events.</p>}
            <button className="danger-button button-with-icon" type="button" disabled={!futureSessions.length} onClick={() => { setConfirmProject(calendarProject); setConfirmation(""); }}><CalendarX size={16} />Remove playlist from Calendar</button>
          </div>
          <p className="calendar-safety">This does not delete the playlist, notes, history, or completed events. Google Calendar must show the matching future events for your approval before deletion.</p>
        </article>
      </div>

      {confirmProject && <div className="modal-backdrop" role="presentation"><div className="modal calendar-confirm" role="dialog" aria-modal="true" aria-label="Confirm Calendar removal"><div className="modal-heading"><div><p className="eyebrow">Calendar removal preview</p><h2>Protect your study history</h2><p>Type the playlist name to prepare a deletion preview for future events only.</p></div><button className="icon-button" type="button" onClick={() => setConfirmProject(null)} aria-label="Close">×</button></div><div className="removal-boundary"><strong>Will target</strong><span>Future study events for “{confirmProject.title}”</span><strong>Will preserve</strong><span>Past events, unrelated events, playlist data, notes, and progress</span></div><label className="confirm-name">Type <strong>{confirmProject.title}</strong><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoFocus /></label><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setConfirmProject(null)}>Cancel</button><button className="danger-button" type="button" disabled={confirmation !== confirmProject.title} onClick={async () => { await onPrepareCalendarRemoval(confirmProject); setConfirmProject(null); }}>Prepare exact removal preview</button></div></div></div>}
    </section>
  );
}
