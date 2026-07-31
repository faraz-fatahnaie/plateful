# Security and privacy

Do not commit real playlist exports, private notes, Google OAuth client files,
refresh tokens, cookies, AI provider keys, mail-provider keys, or database
dumps.

The production site should remain owner-only unless its operator intentionally
changes the Sites access policy. Every API write is scoped to the authenticated
user header and stored under a per-user project key.

For self-hosted Google sign-in, Cloudflare Access must protect the origin.
Plateful verifies `Cf-Access-Jwt-Assertion` against the configured Access JWKS,
issuer, and audience before using its email claim. Never trust a client-supplied
email header by itself. Set `AUTH_MODE=cloudflare-access` so alternate identity
headers cannot bypass Access. `DEV_AUTH_EMAIL` is accepted only on localhost.

Calendar changes must be previewed before they are applied. The app generates a
reconciliation request; the connected Codex Google Calendar integration owns
the final private mutation.

Removing a playlist from Calendar follows the same boundary: the app prepares
and tracks a future-event removal request, but the connected Calendar workflow
must show exact matches and receive approval before deletion.

AI credentials entered in the web app are request-scoped and must not be
written to logs, D1, exported JSON, browser storage, or notifications. Prefer a
local Ollama endpoint when transcript content must remain on the learner's
machine.

Saved AI connection profiles contain only the provider, model, endpoint, and
credential mode. Session keys live in browser memory only. Self-hosted operators
may instead configure `OPENAI_API_KEY` or `COMPATIBLE_AI_API_KEY` as server-side
secrets.

Email delivery uses a server-side HTTP mail provider. Never request or store a
Gmail password. Keep `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` in the
self-hosted server's secret configuration.

Report vulnerabilities privately to the repository owner instead of opening a
public issue containing exploit details or user data.
