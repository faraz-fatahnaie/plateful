#!/usr/bin/env python3
"""Generate a Markdown study tracker from a normalized playlist inventory."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Iterable, Sequence

DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


@dataclass(frozen=True)
class Episode:
    index: int
    title: str
    url: str
    duration: str
    seconds: int
    topic: str
    done: bool = False


@dataclass(frozen=True)
class Session:
    day: date
    episodes: tuple[Episode, ...]
    seconds: int
    capacity: int


def duration_seconds(value: str) -> int:
    parts = [int(part) for part in value.split(":")]
    if len(parts) == 2:
        minutes, seconds = parts
        hours = 0
    elif len(parts) == 3:
        hours, minutes, seconds = parts
    else:
        raise ValueError(f"Invalid duration: {value}")
    if minutes >= 60 and len(parts) == 3 or seconds >= 60:
        raise ValueError(f"Invalid duration: {value}")
    return hours * 3600 + minutes * 60 + seconds


def display_duration(seconds: int) -> str:
    hours, remainder = divmod(seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return (
        f"{hours}:{minutes:02d}:{seconds:02d}"
        if hours
        else f"{minutes}:{seconds:02d}"
    )


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug or "topic"


def load_inventory(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    for key in ("playlist", "schedule", "episodes"):
        if key not in data:
            raise ValueError(f"Missing top-level key: {key}")
    required_playlist = ("title", "url")
    required_schedule = (
        "start_date",
        "start_time",
        "time_zone",
        "default_minutes",
        "skip_weekdays",
        "priority_topics",
    )
    for key in required_playlist:
        if key not in data["playlist"]:
            raise ValueError(f"Missing playlist.{key}")
    for key in required_schedule:
        if key not in data["schedule"]:
            raise ValueError(f"Missing schedule.{key}")
    if not data["episodes"]:
        raise ValueError("episodes must not be empty")
    return data


def parse_episodes(rows: Sequence[dict[str, Any]]) -> list[Episode]:
    episodes: list[Episode] = []
    for row in rows:
        for key in ("index", "title", "url", "duration", "topic"):
            if key not in row:
                raise ValueError(f"Episode is missing {key}: {row}")
        episodes.append(
            Episode(
                index=int(row["index"]),
                title=str(row["title"]).replace("\n", " ").strip(),
                url=str(row["url"]),
                duration=str(row["duration"]),
                seconds=duration_seconds(str(row["duration"])),
                topic=str(row["topic"]).strip(),
                done=bool(row.get("done", False)),
            )
        )
    indexes = [episode.index for episode in episodes]
    if any(index <= 0 for index in indexes) or len(indexes) != len(set(indexes)):
        raise ValueError("Episode indexes must be unique positive integers")
    return sorted(episodes, key=lambda item: item.index)


def ordered_episodes(
    episodes: Sequence[Episode], priorities: Sequence[str]
) -> list[Episode]:
    topics = {episode.topic for episode in episodes}
    unknown = [topic for topic in priorities if topic not in topics]
    if unknown:
        raise ValueError(f"Priority topics have no episodes: {unknown}")
    ordered: list[Episode] = []
    seen: set[int] = set()
    for topic in priorities:
        for episode in episodes:
            if episode.topic == topic and episode.index not in seen:
                ordered.append(episode)
                seen.add(episode.index)
    ordered.extend(
        episode for episode in episodes if episode.index not in seen
    )
    return ordered


def plan_sessions(
    episodes: Sequence[Episode],
    start_day: date,
    default_minutes: int,
    weekday_minutes: dict[str, int],
    skip_weekdays: Iterable[str],
) -> list[Session]:
    queue = [episode for episode in episodes if not episode.done]
    skipped = {DAYS.index(day) for day in skip_weekdays}
    sessions: list[Session] = []
    cursor = 0
    day = start_day
    while cursor < len(queue):
        if day.weekday() in skipped:
            day += timedelta(days=1)
            continue
        capacity = int(
            weekday_minutes.get(DAYS[day.weekday()], default_minutes)
        ) * 60
        selected: list[Episode] = []
        total = 0
        while cursor < len(queue):
            episode = queue[cursor]
            if not selected or total + episode.seconds <= capacity:
                selected.append(episode)
                total += episode.seconds
                cursor += 1
                if total > capacity:
                    break
            else:
                break
        sessions.append(Session(day, tuple(selected), total, capacity))
        day += timedelta(days=1)
    return sessions


def unique_topic_slugs(episodes: Sequence[Episode]) -> dict[str, str]:
    result: dict[str, str] = {}
    used: set[str] = set()
    for episode in episodes:
        if episode.topic in result:
            continue
        base = slugify(episode.topic)
        candidate = base
        suffix = 2
        while candidate in used:
            candidate = f"{base}-{suffix}"
            suffix += 1
        result[episode.topic] = candidate
        used.add(candidate)
    return result


def note_text(episode: Episode) -> str:
    return f"""# Episode {episode.index:03d} — {episode.title}

- Topic: {episode.topic}
- Duration: {episode.duration}
- Video: {episode.url}
- Watched on:
- Confidence after practice (1–5):

## What I learned

-
-
-

## Commands, concepts, or examples

| Item | Meaning | My example |
|---|---|---|
|  |  |  |

## Practice

- [ ] Reproduced the main example
- [ ] Changed one input and predicted the result
- [ ] Explained it without replaying the video

## Mistake or surprise

-

## Open question

-

## My 30-second summary

-

## Review

- [ ] +1 day
- [ ] +7 days
- [ ] +30 days
"""


def write_tracker(
    inventory: dict[str, Any], output: Path, force: bool = False
) -> dict[str, Any]:
    playlist = inventory["playlist"]
    schedule = inventory["schedule"]
    episodes = parse_episodes(inventory["episodes"])
    ordered = ordered_episodes(episodes, schedule["priority_topics"])
    sessions = plan_sessions(
        ordered,
        date.fromisoformat(schedule["start_date"]),
        int(schedule["default_minutes"]),
        {
            str(key): int(value)
            for key, value in schedule.get("weekday_minutes", {}).items()
        },
        schedule["skip_weekdays"],
    )
    if output.exists() and any(output.iterdir()) and not force:
        raise FileExistsError(
            f"{output} is not empty; pass --force to replace generated files"
        )
    output.mkdir(parents=True, exist_ok=True)
    slugs = unique_topic_slugs(episodes)
    total_seconds = sum(episode.seconds for episode in episodes)
    finish = sessions[-1].day.isoformat() if sessions else "complete"

    readme = f"""# {playlist["title"]} study tracker

Source: [{playlist.get("channel", "YouTube playlist")}]({playlist["url"]})

- Episodes: {len(episodes)}
- Total watch time: {display_duration(total_seconds)}
- Planned start: {schedule["start_date"]}
- Planned finish: {finish}
- Time: {schedule["start_time"]} {schedule["time_zone"]}
- Excluded days: {", ".join(schedule["skip_weekdays"]) or "None"}

## Topic priority

{chr(10).join(f"{index}. {topic}" for index, topic in enumerate(schedule["priority_topics"], 1)) or "Original playlist order"}

## Workflow

1. Watch the assigned videos in SCHEDULE.md.
2. Mark completed videos in CHECKLIST.md.
3. Fill the related episode note.
4. Reconcile future Calendar blocks from checklist state.
"""
    (output / "README.md").write_text(readme, encoding="utf-8")

    checklist_lines = [
        f"# {playlist['title']} checklist",
        "",
        f"Progress: **{sum(item.done for item in episodes)} / {len(episodes)} videos**",
        "",
    ]
    topics_in_order = list(dict.fromkeys(item.topic for item in ordered))
    for topic in topics_in_order:
        checklist_lines.extend([f"## {topic}", ""])
        for episode in [item for item in ordered if item.topic == topic]:
            mark = "x" if episode.done else " "
            note_path = (
                f"topics/{slugs[topic]}/episode-{episode.index:03d}.md"
            )
            checklist_lines.append(
                f"- [{mark}] {episode.index:03d} · {episode.duration} · "
                f"[video]({episode.url}) · [note]({note_path}) — {episode.title}"
            )
        checklist_lines.append("")
    (output / "CHECKLIST.md").write_text(
        "\n".join(checklist_lines), encoding="utf-8"
    )

    schedule_lines = [
        f"# {playlist['title']} schedule",
        "",
        "| Date | Day | Episodes | Videos | Watch time |",
        "|---|---|---:|---:|---:|",
    ]
    for session in sessions:
        indexes = ", ".join(
            f"{episode.index:03d}" for episode in session.episodes
        )
        schedule_lines.append(
            f"| {session.day} | {DAYS[session.day.weekday()]} | "
            f"{indexes} | {len(session.episodes)} | "
            f"{display_duration(session.seconds)} |"
        )
    (output / "SCHEDULE.md").write_text(
        "\n".join(schedule_lines) + "\n",
        encoding="utf-8",
    )

    for episode in episodes:
        topic_dir = output / "topics" / slugs[episode.topic]
        topic_dir.mkdir(parents=True, exist_ok=True)
        (topic_dir / f"episode-{episode.index:03d}.md").write_text(
            note_text(episode), encoding="utf-8"
        )

    normalized = {
        "playlist": playlist,
        "schedule": schedule,
        "episodes": [
            {
                "index": item.index,
                "title": item.title,
                "url": item.url,
                "duration": item.duration,
                "topic": item.topic,
                "done": item.done,
            }
            for item in episodes
        ],
    }
    (output / "tracker-config.json").write_text(
        json.dumps(normalized, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return {
        "episodes": len(episodes),
        "sessions": len(sessions),
        "total_seconds": total_seconds,
        "finish_date": finish,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("inventory", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    summary = write_tracker(
        load_inventory(args.inventory), args.output, args.force
    )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
