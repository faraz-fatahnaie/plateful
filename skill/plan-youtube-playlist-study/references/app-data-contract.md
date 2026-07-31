# App handoff contract

Use one `*.playlist-study.json` document per playlist when working with the
Plateful web app.

Required top-level fields are `schemaVersion`, `id`, `title`, `playlistUrl`,
`goal`, `preferences`, `status`, `totalVideoCount`, `totalDurationSeconds`,
`policy`, `videos`, `sessions`, `calendar`, and `updatedAt`.

## Rules

- Accept schema version `1`; stop on unknown versions.
- Preserve unknown fields when updating a document.
- Verify all video titles, URLs, indexes, and durations from the playlist.
- Treat `videos[].watched` as the source of truth for progress.
- Keep each video exactly once and keep stable video ids.
- Preserve past Calendar events and replan future events only.
- Set `calendar.syncState` to `changes-pending` when progress or policy changes.
- Preview exact Calendar mutations before applying them.
- Never put OAuth tokens, cookies, API keys, or private credentials in JSON.

For a new planning intake, fill the verified `videos` inventory, organize
topics, generate `sessions`, update totals, change `status` to `active`, and
return the complete JSON for import into the app.
