# Google sign-in and cross-device sync

Plateful uses an identity gateway instead of storing Google OAuth credentials.
For a self-hosted Cloudflare deployment, Cloudflare Access performs Google
sign-in and Plateful cryptographically verifies the resulting Access JWT before
reading or writing account data.

## One-time deployment setup

1. In Cloudflare Zero Trust, add **Google** as an identity provider. A Google
   Workspace subscription is not required.
2. Create an Access self-hosted application for the complete Plateful hostname.
3. Add an Allow policy for the intended Google email addresses. For a personal
   deployment, allow only the owner email.
4. Configure these Worker secrets/variables:

   - `CF_ACCESS_TEAM_DOMAIN`: `https://your-team.cloudflareaccess.com`
   - `CF_ACCESS_AUD`: the Access application audience tag
   - `AUTH_MODE`: `cloudflare-access` (prevents fallback to other identity headers)
   - `AUTH_LOGIN_URL`: optional explicit gateway login URL

5. Prevent direct public access to the origin. Requests must pass through the
   Access application so the identity assertion is present.
6. Apply D1 migrations. `user_accounts`, `user_settings`, and
   `playlist_projects` are keyed or filtered by the verified email.

Cloudflare documents the [Google identity-provider setup](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/),
[Access JWT validation requirement](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/),
and the [`/cdn-cgi/access/logout` flow](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).

## Sync boundary

Synced through the account database:

- playlist inventory and study policy;
- sessions and Calendar sync metadata;
- watched/practiced state and timestamps;
- personal notes, saved transcripts, and AI study artifacts;
- notification preferences and inbox state;
- app settings and external-AI connection profiles.

Intentionally not synced:

- browser-entered AI API keys;
- Google OAuth tokens or passwords;
- temporary UI state such as an open dialog or active filter.

The same verified email always maps to the same private rows, so opening the app
on another device restores the server-authoritative workspace. A newly created
account receives the bundled LPIC starter project once, after which it becomes
normal private account data.

## Other supported environments

OpenAI-hosted workspace deployments can use the trusted
`oai-authenticated-user-email` identity header with `AUTH_MODE=openai-workspace`.
Local development may set
`DEV_AUTH_EMAIL`; it is honored only for `localhost` and `127.0.0.1`.
