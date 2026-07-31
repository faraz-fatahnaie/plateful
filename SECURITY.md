# Security and privacy

Do not commit real playlist exports, private notes, Google OAuth client files,
refresh tokens, cookies, API keys, or database dumps.

The production site should remain owner-only unless its operator intentionally
changes the Sites access policy. Every API write is scoped to the authenticated
user header and stored under a per-user project key.

Calendar changes must be previewed before they are applied. The app generates a
reconciliation request; the connected Codex Google Calendar integration owns
the final private mutation.

Report vulnerabilities privately to the repository owner instead of opening a
public issue containing exploit details or user data.
