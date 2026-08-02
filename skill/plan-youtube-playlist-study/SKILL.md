---
name: plan-youtube-playlist-study
description: Turn a YouTube playlist into a topic-organized, duration-aware study project for the Plateful app or a Markdown repository, with per-episode notes, an adaptive schedule, Calendar blocks, and safe reconciliation. Use when Codex needs to inspect a playlist, fill or modify playlist-study JSON, prioritize topics, plan around time limits or excluded weekdays, create or reconcile study events, scaffold progress tracking, or reschedule missed and extra-watched videos.
---

# Plan YouTube Playlist Study

Create a verified playlist inventory, generate a reusable tracker, and keep its
future schedule aligned with completed-video checkboxes.

## Workflow

1. Inspect the supplied YouTube video or playlist URL.
   - Resolve a video URL to its containing playlist when present.
   - Extract every episode index, title, URL, and exact duration.
   - Verify playlist count and total duration. Do not guess missing entries.
   - Prefer a purpose-built connector; otherwise use the browser according to
     its skill instructions.

2. Establish scheduling inputs.
   - Record start date, local time, IANA timezone, daily capacities, excluded
     weekdays, and topic priorities.
   - Treat time limits as watch-time budgets and do not split a video unless
     the user requests splitting.
   - If a single video exceeds a normal-day budget, place it alone and round
     the calendar block up to the next five minutes.
   - Use reasonable defaults when low-risk; state them before creating events.

3. Organize by subject.
   - Read the project's `topicOrganization.preferredMethod`; default to
     `publisher` when it is missing.
   - For `publisher`, preserve useful playlist sections, chapters, modules, or
     other creator-supplied grouping as `videos[].publisherTopic` and use it as
     the initial `videos[].topic`.
   - For `ai`, classify only the verified episode inventory and available
     publisher labels. Every episode must appear exactly once.
   - For `manual`, preserve the user's topic names, episode assignments, and
     priority order instead of regenerating them.
   - Prefer the user's intended subject over an incorrect module number.
   - Keep episode order within each topic.
   - Apply priority topics first, followed by remaining episodes in original
     playlist order.
   - Record `videos[].topicSource` and update `topicOrganization`. Generated
     publisher or AI results are suggestions: never prevent the user from
     renaming, reordering, reprioritizing, or reassigning topics afterward.

4. Build the requested tracker.
   - For the Plateful web app, read
     [references/app-data-contract.md](references/app-data-contract.md), update
     the supplied `*.playlist-study.json`, and preserve unknown fields.
   - For a Markdown repository, continue with the inventory workflow below.
   - Read [references/inventory-schema.md](references/inventory-schema.md).
   - Write a UTF-8 inventory JSON matching that schema.
   - Run:

     ```text
     python scripts/build_tracker.py INVENTORY.json --output OUTPUT_DIR
     ```

   - Inspect the generated README, CHECKLIST, SCHEDULE, topic directories, and
     episode notes before external publication.

5. Create Calendar blocks only when explicitly requested.
   - Confirm the exact Calendar account and target calendar.
   - Check availability at the proposed time.
   - Create solo private events without conferencing.
   - Put episode numbers, exact watch time, video links, and the post-watch
     checklist action in each description.
   - Never create events on excluded weekdays.
   - Read [references/calendar-reconciliation.md](references/calendar-reconciliation.md)
     before updating an existing plan.

6. Publish to GitHub only when explicitly requested.
   - Prefer the GitHub connector for repository operations.
   - Preserve a clean local Git history with intentional commits.
   - Never store OAuth credentials, refresh tokens, cookies, or API keys.
   - Verify the remote repository and branch after publication.

7. Reconcile progress.
   - Treat CHECKLIST.md as the source of truth.
   - Checked videos are complete, including extra-watched videos.
   - Unchecked missed videos remain at the front of the pending queue.
   - Preserve past Calendar events as history. For Plateful reconciliation,
     default the replacement boundary to today so missed unchecked videos become
     today’s first pending work; for standalone Calendar-only reconciliation,
     use tomorrow unless the user requests today.
   - Preview changes before applying them.

## Verification

- Episode count equals the playlist count.
- Every checklist entry links to one video and one note.
- Every episode appears exactly once in the tracker.
- Planned dates exclude forbidden weekdays.
- Sessions respect capacity except an unavoidable single long video.
- Calendar mutations affect only the identified playlist events.
- Git status is clean after the final commit.

## Resources

- [scripts/build_tracker.py](scripts/build_tracker.py): deterministic tracker
  and schedule generator.
- [scripts/test_build_tracker.py](scripts/test_build_tracker.py): resource
  regression tests.
- [references/inventory-schema.md](references/inventory-schema.md): inventory
  contract and examples.
- [references/calendar-reconciliation.md](references/calendar-reconciliation.md):
  safe missed/extra-video update algorithm.
- [references/app-data-contract.md](references/app-data-contract.md): portable
  web-app handoff contract.
