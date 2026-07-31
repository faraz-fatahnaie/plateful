# Plateful

Plateful turns a YouTube playlist into a realistic study plan, a daily viewing
queue, per-episode notes, progress tracking, and safe Google Calendar
reconciliation.

The source code and bundled Codex skill are public. A deployed user's playlist
data, notes, account, and Calendar credentials remain private.

## Product workflow

1. Add a playlist URL, goal, time budget, days off, and priority topics.
2. Export the fixed `*.playlist-study.json` intake.
3. Ask the bundled Codex skill to verify the playlist and complete the plan.
4. Import or save the planned project in the private app.
5. Watch today's videos, add notes, and check only completed episodes.
6. Preview a reconciliation request before Codex updates future Calendar blocks.

## What the first version includes

- multi-playlist dashboard;
- guided playlist intake;
- daily watch queue and links;
- per-video notes and watched state;
- study policy and upcoming-session views;
- durable, user-owned D1 storage;
- portable JSON export;
- safe Calendar handoff that never stores Google OAuth secrets;
- installable `plan-youtube-playlist-study` Codex skill.

## Repository map

| Path | Purpose |
|---|---|
| `app/` | Product UI and authenticated API routes |
| `lib/playlist-study.ts` | Shared version-1 data contract and scheduling helpers |
| `db/` and `drizzle/` | Durable D1 schema and migrations |
| `docs/data-contract.md` | Public app/skill interchange specification |
| `skill/plan-youtube-playlist-study/` | Reusable Codex skill package |

## Privacy model

- Public: code, schema, documentation, sample project, and skill.
- Private: deployed database, notes, progress, playlist exports, and account.
- External secret: Google Calendar OAuth remains in the user's connected Google
  Calendar integration, never in this repository or app database.

See [SECURITY.md](SECURITY.md) before deploying or contributing.

## Install the skill

Copy `skill/plan-youtube-playlist-study` into your Codex skills directory, or
install it from this repository using the Codex skill installer.

## License

MIT
