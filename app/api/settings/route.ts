import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { userSettings } from "../../../db/schema";
import type { AIConnection, AppSettings } from "../../../lib/app-settings";

function ownerEmail(request: Request) {
  return request.headers.get("oai-authenticated-user-email");
}

function validSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppSettings>;
  return candidate.schemaVersion === 1 &&
    typeof candidate.displayName === "string" &&
    typeof candidate.timezone === "string" &&
    typeof candidate.defaultStudyTime === "string" &&
    Array.isArray(candidate.aiConnections);
}

function withoutSecrets(settings: AppSettings): AppSettings {
  return {
    ...settings,
    aiConnections: settings.aiConnections.map((connection) => {
      const { apiKey: _discarded, ...safe } = connection as AIConnection & { apiKey?: string };
      void _discarded;
      return safe;
    }),
  };
}

export async function GET(request: Request) {
  const email = ownerEmail(request);
  if (!email) return Response.json({ error: "Sign in is required" }, { status: 401 });
  try {
    const db = await getDb();
    const rows = await db.select({ payload: userSettings.payload }).from(userSettings).where(eq(userSettings.ownerEmail, email)).limit(1);
    return Response.json({ settings: rows[0] ? JSON.parse(rows[0].payload) as AppSettings : null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const email = ownerEmail(request);
  if (!email) return Response.json({ error: "Sign in is required" }, { status: 401 });
  try {
    const input = (await request.json()) as unknown;
    if (!validSettings(input)) return Response.json({ error: "Invalid app settings" }, { status: 400 });
    const settings = withoutSecrets({ ...input, updatedAt: new Date().toISOString() });
    const db = await getDb();
    await db.insert(userSettings).values({ ownerEmail: email, payload: JSON.stringify(settings), updatedAt: settings.updatedAt }).onConflictDoUpdate({
      target: userSettings.ownerEmail,
      set: { payload: JSON.stringify(settings), updatedAt: settings.updatedAt },
    });
    return Response.json({ settings });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save settings" }, { status: 500 });
  }
}
