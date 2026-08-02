"use client";

import { Cloud, LogOut, RefreshCw, Settings2, ShieldCheck, X } from "lucide-react";
import type { AccountSnapshot } from "../../lib/account";
import { languageProps } from "../../lib/discovery";

function providerLabel(provider: NonNullable<AccountSnapshot["user"]>["provider"]) {
  if (provider === "google-via-cloudflare") return "Google account";
  if (provider === "openai-workspace") return "Workspace account";
  return "Local development";
}

export default function AccountMenu({ account, playlistCount, videoCount, noteCount, lastSyncedAt, onClose, onSettings, onRefresh }: {
  account: AccountSnapshot | null;
  playlistCount: number;
  videoCount: number;
  noteCount: number;
  lastSyncedAt: string | null;
  onClose: () => void;
  onSettings: () => void;
  onRefresh: () => void;
}) {
  const user = account?.user;
  return <aside className="account-menu" role="dialog" aria-label="Account and sync status">
    <header><div><span className="account-avatar">{(user?.name || "P").slice(0, 1).toUpperCase()}</span><div><strong {...languageProps(user?.name)}>{user?.name || "Local preview"}</strong><small>{user?.email || "Not signed in"}</small></div></div><button type="button" onClick={onClose} aria-label="Close account menu"><X size={15} /></button></header>
    <div className={`account-sync-state ${account?.authenticated ? "connected" : "preview"}`}><span><Cloud size={16} /></span><div><strong>{account?.authenticated ? "Synced across devices" : "Device-only preview"}</strong><small>{user ? providerLabel(user.provider) : "Sign in on deployment to enable sync"}</small></div></div>
    <div className="account-stats"><span><strong>{playlistCount}</strong><small>playlists</small></span><span><strong>{videoCount}</strong><small>videos</small></span><span><strong>{noteCount}</strong><small>notes</small></span></div>
    <div className="account-security"><ShieldCheck size={15} /><p>Your email identifies your private D1 workspace. Google passwords and OAuth tokens are never stored by Plateful.</p></div>
    <p className="account-last-sync">{lastSyncedAt ? `Last cloud save ${new Date(lastSyncedAt).toLocaleString()}` : "Cloud data has not been saved yet."}</p>
    <div className="account-actions"><button type="button" onClick={onRefresh}><RefreshCw size={14} />Refresh cloud data</button><button type="button" onClick={onSettings}><Settings2 size={14} />Account settings</button>{account?.signOutUrl && <a href={account.signOutUrl}><LogOut size={14} />Sign out</a>}</div>
  </aside>;
}
