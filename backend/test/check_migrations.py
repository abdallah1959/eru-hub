import pathlib
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parents[1]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
for path in [
    ROOT / "schema.sql",
    ROOT / "migrations" / "0001_init.sql",
    ROOT / "migrations" / "0002_preliminary_lectures.sql",
]:
    db.executescript(path.read_text(encoding="utf-8"))

assert db.execute("SELECT COUNT(*) FROM courses").fetchone()[0] == 6
assert db.execute("SELECT COUNT(*) FROM rooms").fetchone()[0] == 3
assert db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 24
assert db.execute("SELECT COUNT(*) FROM courses WHERE status != 'needs_review'").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM rooms WHERE status != 'needs_review'").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM sessions WHERE status != 'needs_review'").fetchone()[0] == 0
assert db.execute("PRAGMA foreign_key_check").fetchall() == []
print("Migration checks passed: 6 courses, 3 rooms, 24 preliminary sessions; all remain needs_review.")
