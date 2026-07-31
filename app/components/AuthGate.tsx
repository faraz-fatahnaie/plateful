"use client";

import { Cloud, RefreshCw, ShieldCheck } from "lucide-react";
import type { AccountSnapshot } from "../../lib/account";

export default function AuthGate({ mode, account }: { mode: "loading" | "anonymous" | "error"; account?: AccountSnapshot | null }) {
  if (mode === "loading") return <main className="auth-gate"><section><span className="auth-brand">P</span><div className="auth-loader" /><h1>Opening your learning workspace</h1><p>Checking your account and loading your private playlists…</p></section></main>;
  const loginUrl = account?.loginUrl;
  return <main className="auth-gate"><section><span className="auth-brand">P</span><p className="eyebrow">Private learning workspace</p><h1>{mode === "error" ? "We couldn’t load your account" : "Your playlists, on every device"}</h1><p>Continue with the same Google account to securely restore your playlists, schedule, notes, progress, reports, and app settings.</p><div className="auth-benefits"><span><Cloud size={17} /><strong>Cross-device sync</strong><small>D1 keeps one server-authoritative workspace per email.</small></span><span><ShieldCheck size={17} /><strong>Google stays private</strong><small>Plateful stores no Google password or OAuth token.</small></span></div>{loginUrl ? <a className="google-sign-in" href={loginUrl}><i>G</i>Continue with Google</a> : <button className="google-sign-in" type="button" onClick={() => window.location.reload()}><RefreshCw size={16} />Retry secure sign-in</button>}<small className="auth-deployment-note">This deployment must be protected by Google through Cloudflare Access or another verified identity gateway.</small></section></main>;
}
