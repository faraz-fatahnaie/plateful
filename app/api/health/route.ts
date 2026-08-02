import { playlistProjects } from "../../../db/schema";
import { getDb } from "../../../db";

export async function GET() {
  try {
    const db = await getDb();
    await db.select({ id: playlistProjects.id }).from(playlistProjects).limit(1);
    return Response.json({ ok: true, storage: "d1" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Database unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
