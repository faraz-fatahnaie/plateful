# Calendar reconciliation

## Boundary

Default to tomorrow in the configured timezone. Preserve past and current-day
events as history unless the user explicitly requests otherwise.

## Desired plan

1. Parse CHECKLIST.md.
2. Remove checked episodes from the pending queue.
3. Order pending episodes by configured topic priorities, then original order.
4. Pack whole videos into allowed days using each day's capacity.
5. Skip forbidden weekdays.

## Existing event identification

Manage only events that have both:

- the tracker-specific title prefix; and
- the playlist URL or playlist ID in the description.

Prefer private extended properties when the Calendar API supports them:

- app: youtube-playlist-study
- playlist_id: the playlist identifier
- session_key: comma-separated episode indexes

Never identify events only by date or generic text such as "Study".

## Diff behavior

- Same session key and unchanged content: keep.
- Same session key with a new date or content: update.
- Desired session without an event: create.
- Future managed event with no desired session: delete.
- Duplicate managed event: retain one and delete duplicates.
- Unrelated event: never modify.

Preview create/update/delete counts before applying when the execution surface
supports a dry run.
