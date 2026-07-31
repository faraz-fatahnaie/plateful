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
4. Review topics from publisher structure (default), AI classification, or your
   own organization; edit names, priorities, and episode assignments.
5. Import or save the planned project in the private app.
6. Open a video workspace, watch inside the app, add notes, and check only
   completed episodes.
7. Optionally analyze captions with an OpenAI API key or free local Ollama.
8. Review reports, milestones, and notifications.
9. Preview a reconciliation request before Codex updates future Calendar blocks.
10. Use Settings to manage defaults, external AI profiles, and playlist-specific
   Calendar cleanup.

## What the app includes

- multi-playlist dashboard;
- global search plus scoped playlist, note, and roadmap filtering/sorting;
- automatic RTL direction and bundled Vazirmatn typography for Persian content;
- verified Google/Gmail identity with private cross-device account sync;
- guided playlist intake;
- editable publisher/AI/manual topic organization with provenance and priority
  control;
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
- an account center with sync status, cloud refresh, settings, and sign-out;
- portable JSON export;
- safe Calendar handoff that never stores Google OAuth secrets;
- installable `plan-youtube-playlist-study` Codex skill.
- account-scoped app settings with connection testing and secret-safe AI profiles;
- a confirmed “Remove playlist from Calendar” handoff that targets only future
  matching events and preserves history.

## Repository map

| Path | Purpose |
|---|---|
| `app/` | Product UI and authenticated API routes |
| `app/components/RoadmapView.tsx` | Day, week, and month learning roadmap |
| `app/components/VideoWorkspace.tsx` | Embedded player, video details, notes, and AI studio |
| `app/components/ReportsView.tsx` | Productivity and learning-quality reports |
| `app/components/NotificationCenter.tsx` | In-app and email reminder preferences |
| `app/components/SettingsView.tsx` | Study defaults, AI connections, and Calendar management |
| `app/components/TopicOrganizer.tsx` | Publisher, AI, and manual topic classification editor |
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

For self-hosted Google sign-in, follow [docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md).

## AI and email configuration

- A ChatGPT Free/Plus/Pro account can be defined as an account-assisted
  connection. Plateful copies a structured request, opens the user's signed-in
  ChatGPT session, and validates the JSON pasted back. It never requests a
  password or cookie. This path is manual because ChatGPT subscriptions and API
  billing are separate.
- Automatic connections support OpenAI, Anthropic, Google Gemini, OpenRouter,
  Ollama, LM Studio, and custom OpenAI-compatible endpoints.
- Browser-entered API keys remain in memory. Self-hosted operators can instead
  configure `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
  `OPENROUTER_API_KEY`, or `COMPATIBLE_AI_API_KEY`.
- AI keys are never written to D1 or project JSON.
- Email reminders can be delivered to Gmail or any address after the self-hosted
  server configures `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL`.
- A future scheduler can call the existing email endpoint at the preferred lead
  time; the app already stores the user's opt-in reminder policy.

See [docs/AI_CONNECTIONS.md](docs/AI_CONNECTIONS.md) for the connection matrix
and setup workflow.

## Install the skill

Copy `skill/plan-youtube-playlist-study` into your Codex skills directory, or
install it from this repository using the Codex skill installer.

## License

MIT
