import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { playlistProjects } from "../../../db/schema";
import type { PlaylistStudyProject } from "../../../lib/playlist-study";

function ownerEmail(request: Request): string | null {
  return request.headers.get("oai-authenticated-user-email");
}

function isProject(value: unknown): value is PlaylistStudyProject {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PlaylistStudyProject>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.id === "string" &&
    Boolean(candidate.id.trim()) &&
    typeof candidate.title === "string" &&
    Boolean(candidate.title.trim()) &&
    Array.isArray(candidate.videos) &&
    Array.isArray(candidate.sessions)
  );
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  const email = ownerEmail(request);
  if (!email) return Response.json({ error: "Sign in is required" }, { status: 401 });

  try {
    const db = await getDb();
    const rows = await db
      .select({ payload: playlistProjects.payload })
      .from(playlistProjects)
      .where(eq(playlistProjects.ownerEmail, email))
      .orderBy(desc(playlistProjects.updatedAt));

    return Response.json({
      projects: rows.map((row) => JSON.parse(row.payload) as PlaylistStudyProject),
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  const email = ownerEmail(request);
  if (!email) return Response.json({ error: "Sign in is required" }, { status: 401 });

  try {
    const project = (await request.json()) as unknown;
    if (!isProject(project)) {
      return Response.json({ error: "Invalid playlist-study project" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const storageId = `${email}::${project.id}`;
    const db = await getDb();
    await db
      .insert(playlistProjects)
      .values({
        id: storageId,
        ownerEmail: email,
        title: project.title,
        status: project.status,
        payload: JSON.stringify(project),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: playlistProjects.id,
        set: {
          ownerEmail: email,
          title: project.title,
          status: project.status,
          payload: JSON.stringify(project),
          updatedAt: now,
        },
      });

    return Response.json({ project }, { status: 200 });
  } catch (error) {
    return routeError(error);
  }
}
