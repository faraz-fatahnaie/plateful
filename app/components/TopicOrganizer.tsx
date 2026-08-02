"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Bot, Check, Copy, ExternalLink, Plus, Save, Sparkles, Tags, X } from "lucide-react";
import type { AIConnection } from "../../lib/app-settings";
import { getAIProvider, providerUsesManualHandoff } from "../../lib/ai-providers";
import type { PlaylistStudyProject, StudyVideo, TopicMethod } from "../../lib/playlist-study";
import { applyClassifications, buildTopicClassificationPrompt, parseTopicClassifications } from "../../lib/topic-organization";
import { languageProps, matchesSearch } from "../../lib/discovery";

function uniqueTopics(videos: StudyVideo[], priorities: string[]) {
  return Array.from(new Set([...priorities, ...videos.map((video) => video.topic || "Uncategorized")].filter(Boolean)));
}

export default function TopicOrganizer({ project, aiConnection, aiApiKey, onSave, onClose }: {
  project: PlaylistStudyProject;
  aiConnection?: AIConnection;
  aiApiKey?: string;
  onSave: (project: PlaylistStudyProject) => void;
  onClose: () => void;
}) {
  const organization = project.topicOrganization || { preferredMethod: "publisher" as const, lastGeneratedBy: null, publisherSegmentsDetected: project.videos.some((video) => Boolean(video.publisherTopic)), userEdited: false, updatedAt: null };
  const [method, setMethod] = useState<TopicMethod>(organization.preferredMethod);
  const [lastGeneratedBy, setLastGeneratedBy] = useState<TopicMethod | null>(organization.lastGeneratedBy);
  const [videos, setVideos] = useState(() => project.videos.map((video) => ({ ...video })));
  const [topicOrder, setTopicOrder] = useState(() => uniqueTopics(project.videos, project.policy.priorities));
  const [priorities, setPriorities] = useState(() => new Set(project.policy.priorities));
  const [query, setQuery] = useState("");
  const [manualResponse, setManualResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [userEdited, setUserEdited] = useState(organization.userEdited);
  const [message, setMessage] = useState("");

  const shownVideos = useMemo(() => videos.filter((video) => matchesSearch(query, video.index, video.title, video.topic)), [query, videos]);
  const publisherCount = videos.filter((video) => Boolean(video.publisherTopic)).length;

  function refreshOrder(nextVideos: StudyVideo[]) {
    setTopicOrder((current) => Array.from(new Set([...current, ...nextVideos.map((video) => video.topic)].filter(Boolean))));
  }

  function chooseMethod(next: TopicMethod) {
    setMethod(next);
    if (next === "manual") { setLastGeneratedBy("manual"); setUserEdited(true); }
    setMessage(next === "manual" ? "Manual mode selected. Edit names, priorities, and episode assignments below." : "");
  }

  function usePublisherStructure() {
    const next = videos.map((video) => ({ ...video, topic: video.publisherTopic || video.topic || "Uncategorized", topicSource: "publisher" as const }));
    setVideos(next);
    setTopicOrder(Array.from(new Set(next.map((video) => video.topic))));
    setMethod("publisher");
    setLastGeneratedBy("publisher");
    setUserEdited(false);
    setMessage(publisherCount ? `Applied ${publisherCount} publisher-labeled episodes. You can still edit everything below.` : "No separate publisher labels were found; the existing topic structure was preserved for review.");
  }

  async function classifyWithAI() {
    if (!aiConnection) { setMessage("Choose an external AI connection in Settings first."); return; }
    if (providerUsesManualHandoff(aiConnection.provider)) { setMethod("ai"); setMessage(`Use the ${getAIProvider(aiConnection.provider).shortLabel} handoff below: copy the request, then import its JSON result.`); return; }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/ai/topics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...aiConnection, apiKey: aiApiKey || "", title: project.title, videos: videos.map(({ id, index, title, publisherTopic, topic }) => ({ id, index, title, publisherTopic, topic })) }) });
      const payload = (await response.json()) as { topics?: Array<{ name: string; videoIds: string[] }>; provider?: string; error?: string };
      if (!response.ok || !payload.topics) throw new Error(payload.error || "AI topic classification failed");
      const next = applyClassifications(videos, payload.topics, "ai");
      setVideos(next); setTopicOrder(payload.topics.map((topic) => topic.name)); setMethod("ai"); setLastGeneratedBy("ai"); setUserEdited(false);
      setMessage(`AI created ${payload.topics.length} topics. Review and edit them before saving.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "AI topic classification failed"); }
    finally { setBusy(false); }
  }

  async function copyManualAIRequest() {
    try {
      await navigator.clipboard.writeText(buildTopicClassificationPrompt(project.title, videos));
      setMessage(`Topic-classification request copied. Paste it into ${aiConnection ? getAIProvider(aiConnection.provider).shortLabel : "your AI"}, then import the JSON response.`);
    } catch { setMessage("Clipboard access was blocked. Copy the classification request manually."); }
  }

  function importManualAITopics() {
    try {
      const topics = parseTopicClassifications(manualResponse, videos.map((video) => video.id));
      const next = applyClassifications(videos, topics, "ai");
      setVideos(next); setTopicOrder(topics.map((topic) => topic.name)); setMethod("ai"); setLastGeneratedBy("ai"); setUserEdited(false);
      setMessage(`Imported ${topics.length} ${aiConnection ? getAIProvider(aiConnection.provider).shortLabel : "AI"} topics. Review and edit them before saving.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not import topic JSON"); }
  }

  function renameTopic(oldName: string, newName: string) {
    const clean = newName.trimStart();
    setTopicOrder((current) => current.map((name) => name === oldName ? clean : name));
    setVideos((current) => current.map((video) => video.topic === oldName ? { ...video, topic: clean, topicSource: "manual" } : video));
    setPriorities((current) => { const next = new Set(current); if (next.delete(oldName)) next.add(clean); return next; });
    setUserEdited(true);
  }

  function moveTopic(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= topicOrder.length) return;
    const next = [...topicOrder]; [next[index], next[target]] = [next[target], next[index]]; setTopicOrder(next); setUserEdited(true);
  }

  function togglePriority(topic: string) {
    setPriorities((current) => { const next = new Set(current); if (next.has(topic)) next.delete(topic); else next.add(topic); return next; }); setUserEdited(true);
  }

  function assignVideo(videoId: string, topic: string) {
    const next = videos.map((video) => video.id === videoId ? { ...video, topic, topicSource: "manual" as const } : video);
    setVideos(next); refreshOrder(next); setUserEdited(true);
  }

  function addTopic() {
    let index = topicOrder.length + 1; let name = `New topic ${index}`;
    while (topicOrder.includes(name)) { index += 1; name = `New topic ${index}`; }
    setTopicOrder([...topicOrder, name]); setMethod("manual"); setUserEdited(true);
    setLastGeneratedBy("manual");
  }

  function save() {
    const validOrder = Array.from(new Set(topicOrder.map((topic) => topic.trim()).filter(Boolean)));
    if (!validOrder.length) { setMessage("Keep at least one non-empty topic before saving."); return; }
    const fallback = validOrder[0];
    const normalizedVideos = videos.map((video) => ({ ...video, topic: validOrder.includes(video.topic.trim()) ? video.topic.trim() : fallback, topicSource: validOrder.includes(video.topic.trim()) ? video.topicSource : "manual" as const }));
    const orderedPriorities = validOrder.filter((topic) => priorities.has(topic));
    onSave({ ...project, videos: normalizedVideos, policy: { ...project.policy, priorities: orderedPriorities }, topicOrganization: { preferredMethod: method, lastGeneratedBy, publisherSegmentsDetected: publisherCount > 0, userEdited: userEdited || method === "manual", aiProvider: lastGeneratedBy === "ai" ? aiConnection?.provider : organization.aiProvider, updatedAt: new Date().toISOString() }, updatedAt: new Date().toISOString() });
    onClose();
  }

  return <div className="modal-backdrop" role="presentation"><section className="modal topic-organizer" role="dialog" aria-modal="true" aria-label="Organize playlist topics">
    <div className="modal-heading"><div><p className="eyebrow">Topic organization</p><h2>Shape the learning map</h2><p>Start from the publisher, ask AI, or organize it yourself. Every result remains editable.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={17} /></button></div>
    <div className="topic-method-grid">
      <button className={method === "publisher" ? "active" : ""} onClick={() => chooseMethod("publisher")}><span><Tags size={18} /></span><strong>Publisher structure</strong><small>Default · {publisherCount || "no"} labeled episodes</small></button>
      <button className={method === "ai" ? "active" : ""} onClick={() => chooseMethod("ai")}><span><Bot size={18} /></span><strong>AI classification</strong><small>{aiConnection ? getAIProvider(aiConnection.provider).shortLabel : "Choose AI in Settings"}</small></button>
      <button className={method === "manual" ? "active" : ""} onClick={() => chooseMethod("manual")}><span><Sparkles size={18} /></span><strong>My organization</strong><small>Full manual control</small></button>
    </div>
    {method === "publisher" && <div className="topic-method-action"><div><strong>Respect the creator&apos;s intent first</strong><p>Uses playlist sections, chapters, or publisher labels captured during inventory. Missing labels keep their current topic.</p></div><button className="secondary-button" type="button" onClick={usePublisherStructure}>Apply publisher structure</button></div>}
    {method === "ai" && aiConnection && !providerUsesManualHandoff(aiConnection.provider) && <div className="topic-method-action"><div><strong>Classify the verified inventory</strong><p>AI receives episode IDs, titles, and available publisher labels—not your personal notes.</p></div><button className="primary-button button-with-icon" type="button" onClick={classifyWithAI} disabled={busy}><Bot size={14} />{busy ? "Classifying…" : "Classify with AI"}</button></div>}
    {method === "ai" && aiConnection && providerUsesManualHandoff(aiConnection.provider) && <div className="topic-manual-ai"><div className="manual-handoff-actions"><button className="secondary-button button-with-icon" type="button" onClick={copyManualAIRequest}><Copy size={14} />1. Copy request</button><a className="primary-button button-with-icon" href={getAIProvider(aiConnection.provider).defaultBaseUrl}><ExternalLink size={14} />2. Continue to {getAIProvider(aiConnection.provider).shortLabel}</a></div><label>3. Paste topic JSON<textarea value={manualResponse} onChange={(event) => setManualResponse(event.target.value)} placeholder={'{"topics":[{"name":"Networking","videoIds":["ep-001"]}]}'} /></label><button className="secondary-button" type="button" onClick={importManualAITopics} disabled={!manualResponse.trim()}>Import classification</button></div>}
    {message && <p className="topic-organizer-message">{message}</p>}
    <div className="topic-editor-head"><div><strong>Topics & priority</strong><small>Priority topics are scheduled first, in this order.</small></div><button className="secondary-button button-with-icon" type="button" onClick={addTopic}><Plus size={13} />Add topic</button></div>
    <div className="topic-edit-list">{topicOrder.map((topic, index) => <div className="topic-edit-row" key={`topic-${index}`}><span>{index + 1}</span><input value={topic} onChange={(event) => renameTopic(topic, event.target.value)} {...languageProps(topic)} /><button className={priorities.has(topic) ? "priority-on" : ""} type="button" onClick={() => togglePriority(topic)}>{priorities.has(topic) && <Check size={12} />}Priority</button><button type="button" onClick={() => moveTopic(index, -1)} disabled={index === 0} aria-label={`Move ${topic} up`}><ArrowUp size={13} /></button><button type="button" onClick={() => moveTopic(index, 1)} disabled={index === topicOrder.length - 1} aria-label={`Move ${topic} down`}><ArrowDown size={13} /></button></div>)}</div>
    <div className="episode-topic-head"><div><strong>Episode assignments</strong><small>Change any individual video after publisher or AI grouping.</small></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search episodes…" /></div>
    <div className="episode-topic-list">{shownVideos.map((video) => <label key={video.id}><span><small>EP {String(video.index).padStart(3, "0")} · {video.topicSource || "unknown"}</small><strong {...languageProps(video.title)}>{video.title}</strong></span><select value={video.topic} onChange={(event) => assignVideo(video.id, event.target.value)}>{topicOrder.filter(Boolean).map((topic) => <option value={topic} key={topic}>{topic}</option>)}</select></label>)}</div>
    <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button button-with-icon" type="button" onClick={save}><Save size={14} />Save topic map</button></div>
  </section></div>;
}
