"use client";

import { useState } from "react";
import {
  CalendarSync,
  Check,
  CheckCircle2,
  CirclePlay,
  ClipboardCheck,
  Copy,
  FileJson,
  FastForward,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { buildSkillRequest, type PlaylistStudyProject } from "../../lib/playlist-study";

const steps = [
  { icon: CirclePlay, title: "Add a playlist", copy: "Paste the YouTube playlist, define your learning goal, available minutes, rest days, and priority topics." },
  { icon: Sparkles, title: "Review the topic map", copy: "Start with publisher sections, ask your connected AI to classify the verified inventory, or organize it yourself. Every result stays editable." },
  { icon: ListChecks, title: "Study today’s queue", copy: "Open Today, watch only the assigned episodes, and reproduce one command or example before moving on." },
  { icon: ClipboardCheck, title: "Record real progress", copy: "Write a short episode note and check only videos you actually completed. The checkbox is the source of truth." },
  { icon: CalendarSync, title: "Reconcile Calendar", copy: "Preview future changes, then let Codex safely update upcoming Google Calendar blocks while preserving history." },
];

export default function GuideView({ project }: { project: PlaylistStudyProject }) {
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState([false, false, false, false]);
  const [copied, setCopied] = useState(false);
  const ActiveIcon = steps[activeStep].icon;

  async function copyRequest() {
    await navigator.clipboard.writeText(buildSkillRequest(project));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="tab-panel guide-view">
      <article className="guide-hero">
        <div><span className="feature-kicker"><Sparkles size={14} /> Start with confidence</span><h2>How Plateful works</h2><p>One repeatable workflow turns a long playlist into small, honest study sessions—and keeps the plan aligned with what you really watched.</p></div>
        <div className="guide-hero-mark"><span>5</span><small>simple<br />steps</small></div>
      </article>

      <div className="guide-workflow">
        <nav className="guide-steps" aria-label="How to use Plateful">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return <button key={step.title} className={activeStep === index ? "active" : ""} onClick={() => setActiveStep(index)}><span>{index + 1}</span><Icon size={17} /><strong>{step.title}</strong></button>;
          })}
        </nav>
        <article className="guide-step-detail" key={activeStep}>
          <div className="guide-detail-icon"><ActiveIcon size={28} /></div>
          <p className="eyebrow">Step {activeStep + 1} of {steps.length}</p>
          <h3>{steps[activeStep].title}</h3>
          <p>{steps[activeStep].copy}</p>
          <div className="guide-tip">
            <strong>Practical tip</strong>
            <span>{[
              "Write priorities as topics, not guessed module numbers—e.g. “networking” and “disks.”",
              "Publisher structure is the default. Rename, reprioritize, or reassign any topic before scheduling.",
              "Use Friday’s larger capacity for long episodes, catch-up, and hands-on labs.",
              "A video is done after watching, a short note, one reproduced example, and a checked box.",
              "Missed items stay unchecked; extra-watched items get checked. Reconciliation handles both cases.",
            ][activeStep]}</span>
          </div>
          <div className="guide-pagination"><button disabled={activeStep === 0} onClick={() => setActiveStep((value) => value - 1)}>Previous</button><span>{steps.map((_, index) => <i className={index === activeStep ? "active" : ""} key={index} />)}</span><button disabled={activeStep === steps.length - 1} onClick={() => setActiveStep((value) => value + 1)}>Next</button></div>
        </article>
      </div>

      <div className="guide-grid">
        <article className="guide-card">
          <p className="eyebrow">Definition of done</p><h3>Finish one episode properly</h3>
          <div className="interactive-checklist">
            {["Watched the complete video", "Captured 3–5 useful ideas", "Reproduced one command or example", "Checked the episode in Plateful"].map((item, index) => <button className={done[index] ? "done" : ""} onClick={() => setDone((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} key={item}><span>{done[index] && <Check size={13} />}</span>{item}</button>)}
          </div>
          <div className="checklist-progress"><span style={{ width: `${done.filter(Boolean).length * 25}%` }} /><small>{done.filter(Boolean).length}/4 complete</small></div>
        </article>

        <article className="guide-card">
          <p className="eyebrow">When reality changes</p><h3>The plan adapts without guilt</h3>
          <div className="scenario"><span className="scenario-icon missed"><RotateCcw size={18} /></span><div><strong>Missed a session</strong><p>Leave those videos unchecked. On your next visit they move to the front of today’s available queue, and every remaining video is repacked.</p></div></div>
          <div className="scenario"><span className="scenario-icon extra"><FastForward size={18} /></span><div><strong>Watched extra videos</strong><p>Check every completed video. The following sessions close the gap automatically.</p></div></div>
        </article>

        <article className="guide-card privacy-guide-card">
          <p className="eyebrow">Private by design</p><h3>Your data stays yours</h3>
          <div className="privacy-list"><span><ShieldCheck size={17} /><b>Private app data</b><small>Notes, progress, and playlist records stay in your own deployment.</small></span><span><FileJson size={17} /><b>Portable JSON</b><small>Export a project whenever you want to move or inspect it.</small></span><span><CalendarSync size={17} /><b>Safe Calendar writes</b><small>Google changes are previewed and approved through your connected Codex tools.</small></span></div>
          <button className="primary-button full copy-sync-button" onClick={copyRequest}>{copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy Calendar sync request"}</button>
        </article>
      </div>
    </section>
  );
}
