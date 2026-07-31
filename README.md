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
5. Open a video workspace, watch inside the app, add notes, and check only
   completed episodes.
6. Optionally analyze captions with an OpenAI API key or free local Ollama.
7. Review reports, milestones, and notifications.
8. Preview a reconciliation request before Codex updates future Calendar blocks.

## What the app includes

- multi-playlist dashboard;
- guided playlist intake;
- daily watch queue and links;
- privacy-enhanced embedded YouTube player and full video information workspace;
- verified 81-video LPIC sample inventory with direct links and exact durations;
- clickable gamified learning path plus day, week, and month roadmap views;
- bring-your-own-AI study studio for summaries, smart notes, mind maps, practice,
  and quizzes;
- OpenAI API, local Ollama, and OpenAI-compatible provider adapters;
- productivity, watch-time, topic-progress, quality, pace, and streak reports;
- in-app notification center and opt-in email/Gmail delivery;
- an interactive **How to use** tab with a five-step workflow;
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
| `app/components/RoadmapView.tsx` | Day, week, and month learning roadmap |
| `app/components/VideoWorkspace.tsx` | Embedded player, video details, notes, and AI studio |
| `app/components/ReportsView.tsx` | Productivity and learning-quality reports |
| `app/components/NotificationCenter.tsx` | In-app and email reminder preferences |
| `app/components/GuideView.tsx` | Interactive in-product guide and progress routine |
| `lib/playlist-study.ts` | Shared version-1 data contract and scheduling helpers |
| `lib/lpic-roadmap.ts` | Complete 55-session LPIC sample roadmap |
| `lib/lpic-videos.ts` | Verified 81-video LPIC inventory used by the sample |
| `db/` and `drizzle/` | Durable D1 schema and migrations |
| `docs/data-contract.md` | Public app/skill interchange specification |
| `docs/PRODUCT_DESIGN.md` | Product decisions and interaction model |
| `skill/plan-youtube-playlist-study/` | Reusable Codex skill package |

## Privacy model

- Public: code, schema, documentation, sample project, and skill.
- Private: deployed database, notes, progress, playlist exports, and account.
- External secret: Google Calendar OAuth remains in the user's connected Google
  Calendar integration, never in this repository or app database.

See [SECURITY.md](SECURITY.md) before deploying or contributing.

## AI and email configuration

- Local Ollama needs no cloud key; enter the local endpoint and installed model
  in the video workspace.
- OpenAI uses an API key for the current request. ChatGPT subscriptions and API
  billing are separate, so the app does not offer a misleading “Sign in with
  ChatGPT” control.
- AI keys are never written to D1 or project JSON.
- Email reminders can be delivered to Gmail or any address after the self-hosted
  server configures `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL`.
- A future scheduler can call the existing email endpoint at the preferred lead
  time; the app already stores the user's opt-in reminder policy.

## Install the skill

Copy `skill/plan-youtube-playlist-study` into your Codex skills directory, or
install it from this repository using the Codex skill installer.

## License

MIT
