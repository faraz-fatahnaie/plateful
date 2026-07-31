# Plateful product design: the learning cockpit

## Product outcome

Plateful should feel like a focused learning cockpit, not a generic dashboard.
The learner can plan a playlist, stay inside the app to watch, understand every
video's place in the schedule, create durable notes, ask an AI for study
artifacts, and see honest evidence of progress.

## Core navigation

1. **Today** — the next useful action and today's queue.
2. **Roadmap** — a gamified learning path plus day, week, and month frames.
3. **Playlists** — all study projects and their health.
4. **Notes** — the learner's episode-by-episode knowledge archive.
5. **Reports** — watch time, consistency, completion, topic mastery, and pace.
6. **How to use** — the repeatable study and reconciliation workflow.

Video detail is a contextual workspace opened from any episode, roadmap node,
report, or notification. It is not another permanent navigation item.

## Video workspace

The workspace uses a two-column layout on wide screens and a single column on
mobile.

- A privacy-enhanced YouTube embed keeps playback inside Plateful. If a video
  ID is unavailable, the player explains why and keeps a safe external link.
- The identity block shows episode number, title, topic, duration, URL,
  watched state, and note state.
- The schedule block shows assigned date/time, session capacity, rest-day
  policy, position in the session, and previous/next episode controls.
- A large watched toggle records `watchedAt`, making reports based on real
  activity instead of guesses.
- Manual notes remain editable beside AI output. AI never overwrites the
  learner's writing without an explicit copy/append action.

## AI study studio

The AI studio turns a transcript into four structured artifacts:

- concise summary;
- smart notes and key commands/concepts;
- a hierarchical mind map;
- practice questions and next actions.

### Provider model

- **OpenAI API:** the user supplies an API key for the request or configures a
  server-side key. A ChatGPT subscription cannot be used as third-party app
  authentication because ChatGPT and API access are separate products.
- **Ollama:** the recommended free/local option. The user supplies the local
  endpoint and installed model. No cloud key is required for the local API.
- **OpenAI-compatible endpoint:** a portable adapter for another self-hosted or
  hosted provider that supports the common chat API shape.

Keys are never written to the project JSON or D1. A browser-entered key is sent
only to the self-hosted server for the current request. Provider name, model,
and base URL are device preferences; credentials are not.

### Transcript acquisition

1. Try public YouTube caption tracks server-side.
2. If captions are unavailable, let the user paste a transcript.
3. Keep a documented extension point for a self-hosted transcription service.

The interface must describe the source and never claim that AI watched a video
when it only analyzed captions.

## Reports and productivity

Reports answer practical questions rather than producing decorative charts:

- How many minutes did I complete this week?
- Am I keeping pace with the planned schedule?
- Which topics are strong, active, or untouched?
- How many videos are watched but still need a personal note?
- What is my current consistency streak?
- What finish date is projected at my current pace?

The report uses scheduled duration plus `watched` and `watchedAt` values. Empty
states explain that reports become more accurate as videos are checked.

## Gamified roadmap

The default roadmap frame is a vertical learning path grouped by topic. Each
episode is a node with one of four states:

- completed;
- ready now;
- upcoming;
- needs a note.

Nodes show episode number, duration, and state. Selecting a node opens its video
workspace. Day/week/month frames remain available for planning. Episode chips
in every frame are also clickable.

Gamification is intentionally lightweight: progress rings, level labels,
streaks, and milestone celebrations reinforce consistency without punishing a
missed day.

## Notifications

### In-app

The bell opens a notification center containing:

- today's session reminder;
- missed-session or pending-replan alert;
- watched-without-notes reminder;
- AI analysis completion;
- roadmap milestone or streak celebration.

Notifications have read/unread state and direct actions to the relevant video,
roadmap, or Calendar preview.

### Email and Gmail delivery

The learner can choose an email address (including Gmail), reminder days, and
lead time. Delivery uses a server-side HTTP mail provider such as Resend so no
Gmail password is stored. A test-notification action verifies configuration.
The self-hosted deployment configures `RESEND_API_KEY` and
`NOTIFICATION_FROM_EMAIL`; a scheduled job can call the same endpoint later.

## Visual direction

The product uses a rich dark spruce shell, warm parchment surfaces, electric
mint for progress, saffron for milestones, and coral for attention. Display
type uses **Fraunces Variable**; interface type uses **Manrope Variable**.
Rounded cards, offset shadows, subtle grain-like gradients, and short spring
motions create personality while preserving contrast and fast scanning.

## Accessibility and privacy

- Keyboard-operable navigation, controls, dialogs, and roadmap nodes.
- Visible focus states, semantic labels, reduced-motion support, and responsive
  layouts.
- YouTube embeds use the privacy-enhanced domain.
- AI provider keys and mail credentials are never persisted in playlist data.
- AI output is labeled by provider/model and remains editable or discardable.
- Email is opt-in, and every send/test action is explicit.

## Settings and external connections

Settings is a first-class destination for profile and study defaults, reusable
AI connection profiles, transcript-storage preference, and Calendar management.
Connection cards make the active provider visible and support an explicit test.
Only provider metadata is durable: session API keys remain in memory, while a
self-hosted deployment may supply server secrets.

Calendar removal uses a deliberate danger-zone flow. The learner selects one
playlist, sees the number of future sessions, types its exact name, and prepares
a precise Codex request. The app marks the removal as pending; it never claims
deletion succeeded. Google Calendar must preview exact matches and receive
explicit approval, while past and unrelated events remain untouched.

## Implementation sequence

1. Extend the versioned project contract with completion timestamps, AI
   artifacts, and notification preferences.
2. Add transcript, AI-analysis, and email-notification server endpoints.
3. Build the video workspace and embedded player.
4. Add reports and the clickable learning path.
5. Add the notification center and preferences.
6. Add user settings, reusable external-AI profiles, and safe Calendar cleanup.
7. Apply the new palette/type/motion system and validate the complete flow.
