# Playlist-study data contract

The app and skill exchange one portable JSON document per playlist. The current
schema version is `1`.

## Top-level fields

| Field | Purpose |
|---|---|
| `schemaVersion` | Contract version. Reject unsupported versions. |
| `id` | Stable, URL-safe project identifier. |
| `title`, `playlistUrl` | Human title and original YouTube playlist. |
| `goal`, `preferences` | User intent in plain language. |
| `status` | `planning`, `active`, `paused`, or `complete`. |
| `totalVideoCount`, `totalDurationSeconds` | Verified inventory totals. |
| `policy` | Timezone, capacities, excluded days, priorities, and splitting rule. |
| `videos` | Verified episode inventory plus watched timestamp, practiced, note, transcript, and optional AI artifact state. |
| `sessions` | Current date-by-date plan. |
| `calendar` | Provider, target calendar, sync status, pending-change count, and optional pending action/removal-request timestamp. |
| `notificationPreferences` | Opt-in in-app/email reminder policy; contains no mail credentials. |
| `notifications` | Durable in-app notification inbox and read state. |
| `updatedAt` | ISO-8601 last-modified timestamp. |

The TypeScript definition is in `lib/playlist-study.ts`.

## Ownership rules

- The app database is authoritative for interactive state after a project is
  imported.
- Exported JSON is the portable handoff format for the Codex skill.
- Checked `videos[].watched` values are the source of truth for replanning.
- `videos[].watchedAt` is the source of truth for activity reports and streaks.
- AI provider keys are request-scoped and never belong in this contract.
- AI output is stored in `videos[].aiArtifacts`; a learner's `note` remains
  independent unless they explicitly append generated material.
- Past Calendar events remain history. Only future playlist events are replaced.
- A Calendar removal request is pending state, not proof of deletion. The
  connected Calendar workflow must preview exact matches and obtain approval.
- A skill must preserve unknown fields so newer app versions remain compatible.
- Playlist metadata must be verified from YouTube; never invent titles or
  durations.

## Privacy boundary

The public repository contains code, schemas, sample data, and the reusable
skill. It must never contain a user's notes, OAuth tokens, Calendar IDs beyond
the harmless `primary` default, cookies, API keys, or exported private project
files.

Production data belongs in the private Sites D1 database. Google Calendar
changes run through the user's connected Codex Calendar tool after an explicit
preview. This keeps Google OAuth credentials out of the public app.

App-level preferences use a separate, user-scoped `user_settings` D1 row. The
settings payload contains study defaults and AI connection metadata, but never
API keys. Session keys stay in memory; server-managed keys stay in deployment
secrets.

## Minimal planning intake

```json
{
  "schemaVersion": 1,
  "id": "linux-networking",
  "title": "Linux networking",
  "playlistUrl": "https://www.youtube.com/playlist?list=…",
  "goal": "Configure and troubleshoot a small Linux network",
  "preferences": "Networking first; use Friday for labs",
  "status": "planning",
  "totalVideoCount": 0,
  "totalDurationSeconds": 0,
  "policy": {
    "timezone": "Asia/Tehran",
    "startDate": "2026-08-01",
    "startTime": "20:00",
    "weekdayMinutes": 30,
    "fridayMinutes": 60,
    "excludedWeekdays": ["Thursday"],
    "priorities": ["Networking", "Disks"],
    "doNotSplitVideos": true
  },
  "videos": [],
  "sessions": [],
  "calendar": {
    "provider": "google",
    "calendarId": "primary",
    "syncState": "not-connected",
    "pendingChangeCount": 0,
    "lastSyncedAt": null
  },
  "updatedAt": "2026-08-01T00:00:00Z"
}
```
