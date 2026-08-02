# Search, filtering, sorting, and Persian typography

## Product analysis

Discovery controls belong where the learner is choosing or finding something,
not where the app is asking them to execute a fixed plan.

| Surface | Discovery model | Product reason |
|---|---|---|
| Global header | Search playlists, videos, notes, topics, and sessions; filter by result type; sort by relevance, title, or recency | Fast jump from anywhere without navigating first |
| Playlists | Search title/goal/preferences; filter status; sort by recent update, progress, or title | Useful once several learning projects exist |
| Notes | Search episode/title/topic/note text; filter note/completion state; sort by episode, title, topic, or recently watched | Turns the archive into a practical retrieval tool |
| Roadmap | Search episode/topic/module/date; filter learning state; sort Path episodes by sequence, title, or duration | Helps locate a concept without damaging schedule meaning |
| Day/Week/Month | Search and filter only; retain chronological order | Time layouts become misleading if arbitrarily sorted |
| Today, Reports, Guide, Settings | No extra collection controls | These are execution, interpretation, instruction, or configuration surfaces |

Empty states must explain the active query/filter and provide one clear reset.
Every search result routes directly to its playlist, video workspace, or exact
study session. Global search supports `/`, `Ctrl+K`, keyboard focus, and Escape.

## Persian language behavior

Vazirmatn is bundled locally for Persian and Arabic-script user content. Dynamic
titles, goals, topics, notes, and AI output use `lang="fa"` and `dir="rtl"` when
Persian characters are detected. Editable user-content fields use `dir="auto"`
so mixed English/Persian notes remain natural. English application chrome keeps
Fraunces and Manrope.

Iran Sans is not bundled because it is not an open-source dependency. Vazirmatn
provides an appropriate, redistributable Persian alternative.
