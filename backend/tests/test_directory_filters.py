"""Server-side filtering for the two directories.

The student list and the team list used to ship 50 unfiltered rows to
the browser, which then filtered whatever happened to be loaded — so a
classmate on page two was reported as "No students found". These tests
pin the behaviour the UI now depends on: the query itself is narrowed,
pagination walks the *filtered* set, and a search that matches nothing
says so instead of pretending the person does not exist.
"""

import asyncio
import os
import tempfile
import unittest

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = (
    f"sqlite+pysqlite:///{_test_directory.name}/directory_filters.sqlite"
)
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"
os.environ.setdefault("PILOT_ONBOARDING_ENABLED", "false")

from app import main, models  # noqa: E402
from app.auth import create_access_token, hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402


async def call_app(method: str, path: str, token=None):
    """Drive the real FastAPI ASGI app without an HTTP client library."""
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path.split("?")[0],
        "raw_path": path.split("?")[0].encode(),
        "query_string": path.split("?")[1].encode() if "?" in path else b"",
        "root_path": "",
        "headers": [(b"host", b"testserver")],
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }
    if token:
        scope["headers"].append(
            (b"authorization", f"Bearer {token}".encode())
        )

    received = False

    async def receive():
        nonlocal received
        if not received:
            received = True
            return {"type": "http.request", "body": b"", "more_body": False}
        return {"type": "http.disconnect"}

    sent = []

    async def send(message):
        sent.append(message)

    await main.app(scope, receive, send)

    status = next(
        m["status"] for m in sent if m["type"] == "http.response.start"
    )
    body = b"".join(
        m.get("body", b"") for m in sent if m["type"] == "http.response.body"
    )
    import json

    return status, (json.loads(body) if body else None)


def request(method: str, path: str, token=None):
    return asyncio.run(call_app(method, path, token=token))


def make_student(db, name, uid, program, skills=None, interests=None,
                 status=None):
    student = models.Student(
        name=name,
        university_id=uid,
        email=f"{name.split()[0].lower()}.{uid}@iqra.edu.pk",
        password=hash_password("TestPassword123"),
        program=program,
        email_verified=True,
        skills=skills,
        interests=interests,
        fyp_status=status,
    )
    db.add(student)
    db.commit()
    return student


def make_team(db, owner, name, department, **fields):
    team = models.Team(
        name=name,
        department_preference=department,
        spots_available=fields.pop("spots_available", 2),
        created_by=owner.id,
        **fields,
    )
    db.add(team)
    db.commit()
    return team


def names(body):
    return [entry["name"] for entry in body]


class StudentDirectoryFilterTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        db = SessionLocal()
        try:
            self.alice = make_student(
                db, "Alice Ahmed", "10001", "BSCS",
                skills="React, Python", interests="Chess",
                status="Looking for a team",
            )
            self.bob = make_student(
                db, "Bob Bishop", "10002", "BSAI",
                skills="Machine Learning", status="Already in a team",
            )
            self.carol = make_student(
                db, "Carol Canton", "10003", "BSCS",
                skills="UI/UX, Figma", interests="Drawing",
                status="Looking for a team",
            )
            self.dave = make_student(db, "Dave Dover", "10004", "BSSE")
            self.token = create_access_token(self.alice.id)
        finally:
            db.close()

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def fetch(self, query=""):
        path = "/students" + (f"?{query}" if query else "")
        status, body = request("GET", path, token=self.token)
        self.assertEqual(status, 200, body)
        return body

    # ---------- no filter: the pre-existing contract ----------

    def test_without_filters_every_student_is_returned_in_id_order(self):
        self.assertEqual(
            names(self.fetch()), ["Alice Ahmed", "Bob Bishop",
                                  "Carol Canton", "Dave Dover"]
        )

    def test_blank_and_all_sentinels_are_the_same_as_no_filter(self):
        self.assertEqual(len(self.fetch("search=&program=&status=")), 4)
        self.assertEqual(len(self.fetch("program=All&status=All")), 4)

    # ---------- search ----------

    def test_search_finds_students_by_every_field_the_ui_promises(self):
        # The placeholder reads "Name, skills, interests...", and the
        # directory also indexes the program and the university ID.
        self.assertEqual(names(self.fetch("search=alice")), ["Alice Ahmed"])
        self.assertEqual(names(self.fetch("search=react")), ["Alice Ahmed"])
        self.assertEqual(names(self.fetch("search=chess")), ["Alice Ahmed"])
        self.assertEqual(names(self.fetch("search=10003")), ["Carol Canton"])
        self.assertEqual(
            names(self.fetch("search=bscs")), ["Alice Ahmed", "Carol Canton"]
        )

    def test_search_folds_case_so_students_need_not_type_it_exactly(self):
        self.assertEqual(names(self.fetch("search=aLiCe")), ["Alice Ahmed"])
        self.assertEqual(names(self.fetch("search=machine")), ["Bob Bishop"])

    def test_like_wildcards_in_a_search_term_are_matched_literally(self):
        # `_` matches any single character and `%` matches everything:
        # "a_e" would find Dave and "%" would return the whole
        # directory. Neither is what the student typed.
        self.assertEqual(self.fetch("search=a_e"), [])
        self.assertEqual(self.fetch("search=%"), [])
        self.assertEqual(self.fetch("search=1000_"), [])

    def test_a_search_matching_nobody_says_so_rather_than_guessing(self):
        self.assertEqual(self.fetch("search=zzzz"), [])

    # ---------- filters ----------

    def test_program_and_status_filters_narrow_the_query(self):
        self.assertEqual(
            names(self.fetch("program=BSCS")), ["Alice Ahmed", "Carol Canton"]
        )
        self.assertEqual(
            names(self.fetch("status=Already%20in%20a%20team")),
            ["Bob Bishop"],
        )
        self.assertEqual(
            names(self.fetch("program=BSCS&status=Looking%20for%20a%20team")),
            ["Alice Ahmed", "Carol Canton"],
        )

    def test_a_student_with_no_status_never_matches_a_status_filter(self):
        # Dave has never chosen an FYP status, so he must not appear
        # whichever status is asked for — including "no status" being
        # silently treated as a match.
        looking = names(self.fetch("status=Looking%20for%20a%20team"))
        taken = names(self.fetch("status=Already%20in%20a%20team"))
        self.assertNotIn("Dave Dover", looking)
        self.assertNotIn("Dave Dover", taken)

    def test_filters_combine_with_search(self):
        self.assertEqual(
            names(self.fetch("search=ui&program=BSCS")), ["Carol Canton"]
        )
        self.assertEqual(self.fetch("search=ui&program=BSAI"), [])

    # ---------- pagination walks the filtered set ----------

    def test_pages_are_sliced_after_filtering_not_before(self):
        # The bug this replaces: page one of the *unfiltered* directory
        # was filtered in the browser, so the second page of a filtered
        # query had to be fetched from a different starting point.
        first = self.fetch("program=BSCS&limit=1&skip=0")
        second = self.fetch("program=BSCS&limit=1&skip=1")

        self.assertEqual(names(first), ["Alice Ahmed"])
        self.assertEqual(names(second), ["Carol Canton"])
        # Past the end of the filtered set: empty, not "the rest of the
        # unfiltered directory".
        self.assertEqual(self.fetch("program=BSCS&limit=1&skip=2"), [])


class TeamDirectoryFilterTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        db = SessionLocal()
        try:
            self.owner = make_student(db, "Alice Ahmed", "10001", "BSCS")
            self.token = create_access_token(self.owner.id)
            self.nebula = make_team(
                db, self.owner, "Team Nebula", "BSCS",
                project_title="Smart study-buddy app",
                description="Turns lecture notes into quizzes",
                skills_needed="React, Python",
            )
            self.orion = make_team(
                db, self.owner, "Team Orion", "BSAI",
                project_title="Crop yield predictor",
                skills_needed="Machine Learning",
            )
            self.any_dept = make_team(
                db, self.owner, "Team Open", "Any",
                project_title="Anything goes",
                roles_needed="Whoever wants in",
            )
        finally:
            db.close()

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def fetch(self, query=""):
        # /teams is public: no token, matching what the Teams page sends.
        status, body = request("GET", "/teams" + (f"?{query}" if query else ""))
        self.assertEqual(status, 200, body)
        return body

    def test_team_search_covers_every_field_the_ui_searches(self):
        self.assertEqual(names(self.fetch("search=nebula")), ["Team Nebula"])
        self.assertEqual(
            names(self.fetch("search=lecture")), ["Team Nebula"]
        )
        self.assertEqual(
            names(self.fetch("search=quiz")), ["Team Nebula"]
        )
        self.assertEqual(
            names(self.fetch("search=machine")), ["Team Orion"]
        )
        self.assertEqual(
            names(self.fetch("search=whoever")), ["Team Open"]
        )

    def test_program_filter_keeps_teams_that_accept_any_department(self):
        # This is the rule the client-side filter had and is easy to
        # lose: an "Any Department" team is a fit for every program.
        self.assertEqual(
            names(self.fetch("program=BSCS")), ["Team Nebula", "Team Open"]
        )
        self.assertEqual(
            names(self.fetch("program=BSSE")), ["Team Open"]
        )
        self.assertEqual(len(self.fetch("program=All")), 3)

    def test_team_pagination_walks_the_filtered_set(self):
        self.assertEqual(
            names(self.fetch("program=BSCS&limit=1&skip=0")), ["Team Nebula"]
        )
        self.assertEqual(
            names(self.fetch("program=BSCS&limit=1&skip=1")), ["Team Open"]
        )
        self.assertEqual(self.fetch("program=BSCS&limit=1&skip=2"), [])

    def test_team_search_matching_nobody_returns_an_empty_list(self):
        self.assertEqual(self.fetch("search=zzzz"), [])


if __name__ == "__main__":
    unittest.main()
