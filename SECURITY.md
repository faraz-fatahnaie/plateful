# Security and privacy

Do not commit real playlist exports, private notes, Google OAuth client files,
refresh tokens, cookies, AI provider keys, mail-provider keys, or database
dumps.

The production site should remain owner-only unless its operator intentionally
changes the Sites access policy. Every API write is scoped to the authenticated
user header and stored under a per-user project key.

Calendar changes must be previewed before they are applied. The app generates a
reconciliation request; the connected Codex Google Calendar integration owns
the final private mutation.

AI credentials entered in the web app are request-scoped and must not be
written to logs, D1, exported JSON, browser storage, or notifications. Prefer a
local Ollama endpoint when transcript content must remain on the learner's
machine.

Email delivery uses a server-side HTTP mail provider. Never request or store a
Gmail password. Keep `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` in the
self-hosted server's secret configuration.

Report vulnerabilities privately to the repository owner instead of opening a
public issue containing exploit details or user data.
