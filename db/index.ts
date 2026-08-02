import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

const initializationByDatabase = new WeakMap<object, Promise<void>>();

function ensureSchema(database: D1Database) {
  const existing = initializationByDatabase.get(database as object);
  if (existing) return existing;

  const initialization = database.batch([
    database.prepare(`CREATE TABLE IF NOT EXISTS playlist_projects (
      id TEXT PRIMARY KEY NOT NULL,
      owner_email TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    database.prepare("CREATE INDEX IF NOT EXISTS playlist_projects_owner_updated_idx ON playlist_projects (owner_email, updated_at)"),
    database.prepare(`CREATE TABLE IF NOT EXISTS user_settings (
      owner_email TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS user_accounts (
      email TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
  ]).then(() => undefined).catch((error) => {
    initializationByDatabase.delete(database as object);
    throw error;
  });

  initializationByDatabase.set(database as object, initialization);
  return initialization;
}

export async function getDb() {
  const { env } = await import("cloudflare:workers");
  const bindings = env as unknown as { DB?: D1Database };
  if (!bindings.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  await ensureSchema(bindings.DB);
  return drizzle(bindings.DB, { schema });
}
