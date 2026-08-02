"use client";

import { useState } from "react";
import { BellRing, CalendarClock, Check, Mail, Settings2, Sparkles, X } from "lucide-react";
import type { NotificationPreferences, PlaylistStudyProject, StudyNotification } from "../../lib/playlist-study";

const defaultPreferences: NotificationPreferences = {
  inApp: true,
  email: false,
  emailAddress: "",
  leadMinutes: 30,
  dailyDigest: true,
};

export default function NotificationCenter({
  project,
  onClose,
  onUpdate,
  onNavigate,
  accountEmail,
}: {
  project: PlaylistStudyProject;
  onClose: () => void;
  onUpdate: (project: PlaylistStudyProject) => void;
  onNavigate: (target?: string, videoId?: string) => void;
  accountEmail?: string | null;
}) {
  const [settings, setSettings] = useState(false);
  const [preferences, setPreferences] = useState(() => ({ ...(project.notificationPreferences || defaultPreferences), emailAddress: accountEmail || project.notificationPreferences?.emailAddress || "" }));
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const notifications = project.notifications || [];

  function saveNotifications(nextNotifications: StudyNotification[]) {
    onUpdate({ ...project, notifications: nextNotifications, updatedAt: new Date().toISOString() });
  }

  function markAllRead() {
    saveNotifications(notifications.map((item) => ({ ...item, read: true })));
  }

  function openNotification(item: StudyNotification) {
    saveNotifications(notifications.map((candidate) => candidate.id === item.id ? { ...candidate, read: true } : candidate));
    onNavigate(item.target, item.videoId);
  }

  function savePreferences() {
    onUpdate({ ...project, notificationPreferences: { ...preferences, emailAddress: accountEmail || preferences.emailAddress }, updatedAt: new Date().toISOString() });
    setMessage("Notification preferences saved.");
  }

  async function sendTest() {
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: accountEmail || preferences.emailAddress, subject: "Your Plateful reminder is ready", message: `Your next ${project.title} study session starts at ${project.policy.startTime}.` }),
      });
      const payload = (await response.json()) as { delivered?: boolean; message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Email test failed");
      setMessage(payload.delivered ? "Test email delivered." : payload.message || "Email settings are ready for server configuration.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email test failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="notification-layer" role="presentation" onClick={onClose}>
      <aside className="notification-center" role="dialog" aria-modal="true" aria-label="Notifications" onClick={(event) => event.stopPropagation()}>
        <header><div><span><BellRing size={18} /></span><div><p className="eyebrow">Stay on course</p><h2>Notifications</h2></div></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close notifications"><X size={16} /></button></header>
        <div className="notification-toolbar"><button className={!settings ? "active" : ""} onClick={() => setSettings(false)}><BellRing size={14} />Inbox{notifications.filter((item) => !item.read).length > 0 && <i>{notifications.filter((item) => !item.read).length}</i>}</button><button className={settings ? "active" : ""} onClick={() => setSettings(true)}><Settings2 size={14} />Preferences</button></div>

        {!settings ? <>
          <div className="notification-list">
            {notifications.map((item) => <button className={`notification-item ${item.read ? "read" : ""}`} key={item.id} onClick={() => openNotification(item)}><span className={`notification-kind ${item.kind}`}>{item.kind === "session" ? <CalendarClock size={16} /> : item.kind === "ai" ? <Sparkles size={16} /> : <BellRing size={16} />}</span><span><strong>{item.title}</strong><small>{item.message}</small><time>{new Date(item.createdAt).toLocaleString()}</time></span>{!item.read && <i />}</button>)}
            {!notifications.length && <div className="notification-empty"><Check size={23} /><strong>You’re all caught up</strong><small>Session reminders and milestones will appear here.</small></div>}
          </div>
          {notifications.some((item) => !item.read) && <button className="mark-read" onClick={markAllRead}>Mark all as read</button>}
        </> : <div className="notification-settings">
          <div className="setting-toggle"><span><BellRing size={16} /><span><strong>In-app reminders</strong><small>Sessions, missed work, AI results, and milestones</small></span></span><button className={preferences.inApp ? "on" : ""} onClick={() => setPreferences({ ...preferences, inApp: !preferences.inApp })}><i /></button></div>
          <div className="setting-toggle"><span><Mail size={16} /><span><strong>Email reminders</strong><small>Works with Gmail or any email address</small></span></span><button className={preferences.email ? "on" : ""} onClick={() => setPreferences({ ...preferences, email: !preferences.email })}><i /></button></div>
          <label>Verified account email<input type="email" value={accountEmail || preferences.emailAddress} onChange={(event) => setPreferences({ ...preferences, emailAddress: event.target.value })} placeholder="you@gmail.com" readOnly={Boolean(accountEmail)} /></label>
          <label>Remind me before a session<select value={preferences.leadMinutes} onChange={(event) => setPreferences({ ...preferences, leadMinutes: Number(event.target.value) })}><option value={10}>10 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={1440}>1 day</option></select></label>
          <label className="check-setting"><input type="checkbox" checked={preferences.dailyDigest} onChange={(event) => setPreferences({ ...preferences, dailyDigest: event.target.checked })} />Send one daily study digest</label>
          <p className="email-privacy">No Gmail password is stored. For abuse prevention, reminders are delivered only to the verified account address.</p>
          {message && <div className="notification-message">{message}</div>}
          <div className="notification-actions"><button className="secondary-button" onClick={sendTest} disabled={sending}>{sending ? "Testing…" : "Send test email"}</button><button className="primary-button" onClick={savePreferences}>Save preferences</button></div>
        </div>}
      </aside>
    </div>
  );
}
