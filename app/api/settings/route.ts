import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { userAccounts, userSettings } from "../../../db/schema";
import { sanitizeAppSettings, type AppSettings } from "../../../lib/app-settings";
import { getAuthenticatedUser } from "../../../lib/server-auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const email = user.email;
    const db = await getDb();
    const rows = await db.select({ payload: userSettings.payload }).from(userSettings).where(eq(userSettings.ownerEmail, email)).limit(1);
    return Response.json({ settings: rows[0] ? JSON.parse(rows[0].payload) as AppSettings : null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const email = user.email;
    const input = (await request.json()) as unknown;
    const settings = sanitizeAppSettings(input);
    if (!settings) return Response.json({ error: "Invalid app settings" }, { status: 400 });
    const db = await getDb();
    await db.insert(userSettings).values({ ownerEmail: email, payload: JSON.stringify(settings), updatedAt: settings.updatedAt }).onConflictDoUpdate({
      target: userSettings.ownerEmail,
      set: { payload: JSON.stringify(settings), updatedAt: settings.updatedAt },
    });
    await db.insert(userAccounts).values({ email, displayName: settings.displayName || user.name || email.split("@")[0], provider: user.provider, lastSeenAt: settings.updatedAt }).onConflictDoUpdate({
      target: userAccounts.email,
      set: { displayName: settings.displayName || user.name || email.split("@")[0], provider: user.provider, lastSeenAt: settings.updatedAt },
    });
    return Response.json({ settings });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save settings" }, { status: 500 });
  }
}
