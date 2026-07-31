import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { playlistProjects, userAccounts, userSettings } from "../../../db/schema";
import type { AccountSnapshot } from "../../../lib/account";
import type { AppSettings } from "../../../lib/app-settings";
import type { PlaylistStudyProject } from "../../../lib/playlist-study";
import { getAuthenticatedUser } from "../../../lib/server-auth";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      let loginUrl: string | null = null;
      try {
        const { env } = await import("cloudflare:workers");
        loginUrl = (env as unknown as { AUTH_LOGIN_URL?: string }).AUTH_LOGIN_URL || null;
      } catch { /* local preview without Worker bindings */ }
      return Response.json({ authenticated: false, loginUrl } satisfies AccountSnapshot, { status: 401 });
    }
    const db = await getDb();
    const [projectRows, settingsRows] = await Promise.all([
      db.select({ payload: playlistProjects.payload, updatedAt: playlistProjects.updatedAt }).from(playlistProjects).where(eq(playlistProjects.ownerEmail, user.email)),
      db.select({ payload: userSettings.payload, updatedAt: userSettings.updatedAt }).from(userSettings).where(eq(userSettings.ownerEmail, user.email)).limit(1),
    ]);
    const projects = projectRows.map((row) => JSON.parse(row.payload) as PlaylistStudyProject);
    const settings = settingsRows[0] ? JSON.parse(settingsRows[0].payload) as AppSettings : null;
    const now = new Date().toISOString();
    const name = settings?.displayName?.trim() || user.name?.trim() || user.email.split("@")[0];
    await db.insert(userAccounts).values({ email: user.email, displayName: name, provider: user.provider, lastSeenAt: now }).onConflictDoUpdate({
      target: userAccounts.email,
      set: { displayName: name, provider: user.provider, lastSeenAt: now },
    });
    const lastSyncedAt = [...projectRows.map((row) => row.updatedAt), ...settingsRows.map((row) => row.updatedAt)].sort().at(-1) || null;
    const snapshot: AccountSnapshot = {
      authenticated: true,
      user: { email: user.email, name, provider: user.provider },
      sync: {
        playlistCount: projects.length,
        videoCount: projects.reduce((sum, project) => sum + project.videos.length, 0),
        noteCount: projects.reduce((sum, project) => sum + project.videos.filter((video) => video.note.trim()).length, 0),
        lastSyncedAt,
      },
      signOutUrl: user.provider === "google-via-cloudflare" ? "/cdn-cgi/access/logout" : user.provider === "openai-workspace" ? "/signout-with-chatgpt?return_to=/" : null,
    };
    return Response.json(snapshot, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Account lookup failed" }, { status: 500 });
  }
}
