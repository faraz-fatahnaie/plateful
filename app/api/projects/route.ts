import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { playlistProjects } from "../../../db/schema";
import type { PlaylistStudyProject } from "../../../lib/playlist-study";
import { isPlaylistStudyProject } from "../../../lib/playlist-validation";
import { getAuthenticatedUser } from "../../../lib/server-auth";

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const email = user.email;
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
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const email = user.email;
    const project = (await request.json()) as unknown;
    if (!isPlaylistStudyProject(project)) {
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
