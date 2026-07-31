# Playlist inventory schema

Use UTF-8 JSON:

```json
{
  "playlist": {
    "title": "Course title",
    "url": "https://www.youtube.com/playlist?list=...",
    "channel": "Channel name"
  },
  "schedule": {
    "start_date": "2026-08-01",
    "start_time": "20:00",
    "time_zone": "Asia/Tehran",
    "default_minutes": 30,
    "weekday_minutes": {
      "Friday": 60
    },
    "skip_weekdays": ["Thursday"],
    "priority_topics": ["Networking", "Storage"]
  },
  "topic_organization": {
    "preferred_method": "publisher"
  },
  "episodes": [
    {
      "index": 1,
      "title": "Episode title",
      "url": "https://www.youtube.com/watch?v=...",
      "duration": "12:34",
      "publisher_topic": "Module 109: Networking",
      "topic": "Networking",
      "topic_source": "publisher"
    }
  ]
}
```

## Rules

- Use unique positive integer indexes.
- Accept durations as MM:SS or HH:MM:SS.
- Use one stable topic name per episode.
- `preferred_method` is `publisher`, `ai`, or `manual`; use `publisher` by
  default when the creator provides meaningful grouping.
- Preserve creator-supplied grouping in `publisher_topic` even after a user or
  AI changes `topic`.
- `topic_source` records the latest assignment source. Topic names, priorities,
  ordering, and per-episode assignments always remain user-editable.
- Preserve exact YouTube titles and URLs.
- Use English weekday names.
- Use an IANA timezone.
- Priority topics must match episode topic strings exactly.
- Topics not listed as priorities retain original episode order after all
  priority topics.
