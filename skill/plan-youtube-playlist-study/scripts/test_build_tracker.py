import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

SCRIPT = Path(__file__).with_name("build_tracker.py")
SPEC = importlib.util.spec_from_file_location("build_tracker", SCRIPT)
tracker = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = tracker
SPEC.loader.exec_module(tracker)


def item(index, duration, topic, done=False):
    return {
        "index": index,
        "title": f"Episode {index}",
        "url": f"https://youtube.example/{index}",
        "duration": duration,
        "topic": topic,
        "done": done,
    }


class TrackerTests(unittest.TestCase):
    def test_priority_and_skip_day_planning(self):
        episodes = tracker.parse_episodes([
            item(1, "20:00", "Basics"),
            item(2, "20:00", "Network"),
            item(3, "20:00", "Network"),
        ])
        ordered = tracker.ordered_episodes(episodes, ["Network"])
        self.assertEqual([episode.index for episode in ordered], [2, 3, 1])
        sessions = tracker.plan_sessions(
            ordered,
            date(2026, 8, 6),
            30,
            {"Friday": 60},
            ["Thursday"],
        )
        self.assertEqual(sessions[0].day, date(2026, 8, 7))
        self.assertEqual(
            [episode.index for episode in sessions[0].episodes],
            [2, 3, 1],
        )

    def test_generates_complete_tracker(self):
        inventory = {
            "playlist": {
                "title": "Example Course",
                "url": "https://youtube.example/playlist",
                "channel": "Teacher",
            },
            "schedule": {
                "start_date": "2026-08-01",
                "start_time": "20:00",
                "time_zone": "Asia/Tehran",
                "default_minutes": 30,
                "weekday_minutes": {"Friday": 60},
                "skip_weekdays": ["Thursday"],
                "priority_topics": ["Network"],
            },
            "episodes": [
                item(1, "12:00", "Basics"),
                item(2, "15:00", "Network"),
                item(3, "10:00", "Network"),
            ],
        }
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            output = root / "tracker"
            summary = tracker.write_tracker(inventory, output)
            self.assertEqual(summary["episodes"], 3)
            self.assertTrue((output / "README.md").exists())
            self.assertTrue((output / "CHECKLIST.md").exists())
            self.assertTrue((output / "SCHEDULE.md").exists())
            notes = list((output / "topics").rglob("episode-*.md"))
            self.assertEqual(len(notes), 3)
            checklist = (output / "CHECKLIST.md").read_text(encoding="utf-8")
            self.assertLess(
                checklist.index("## Network"),
                checklist.index("## Basics"),
            )


if __name__ == "__main__":
    unittest.main()
