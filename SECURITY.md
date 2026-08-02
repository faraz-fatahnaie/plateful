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
local Ollama or LM Studio endpoint when transcript content must remain on the
learner's machine.

Routes that can reach AI providers, YouTube captions, or the email provider
require a verified app identity before any outbound request or server secret is
used. Localhost receives an isolated preview identity; this exception does not
apply to deployed hostnames.

Saved AI connection profiles contain only the provider, model, endpoint, and
credential mode. Session keys live in browser memory only. Self-hosted operators
may instead configure `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
`OPENROUTER_API_KEY`, or `COMPATIBLE_AI_API_KEY` as server-side secrets.

The ChatGPT account-assisted workflow never asks for or stores a ChatGPT
password, session cookie, access token, or browser profile. It only copies a
prompt, opens `chatgpt.com`, and imports user-pasted JSON. Do not add browser
automation that extracts ChatGPT credentials or impersonates its private web
client.

Email delivery uses a server-side HTTP mail provider. Never request or store a
Gmail password. Keep `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` in the
self-hosted server's secret configuration. To prevent the app from becoming a
mail relay, reminders can be sent only to the authenticated account's verified
email address.

Report vulnerabilities privately to the repository owner instead of opening a
public issue containing exploit details or user data.
