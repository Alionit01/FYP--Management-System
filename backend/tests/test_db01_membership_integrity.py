"""DB-01: one team membership per student, enforced by the database.

Audit finding DB-01. ``models.TeamMember`` always declared
``UniqueConstraint("student_id", name="unique_student_team")``, but
``Base.metadata.create_all`` never alters an existing table, so databases
created before that constraint was added silently lost the guarantee.
The application-level checks were check-then-insert and raced when the
same student acted on two different teams at once: each request locked a
*different* team row, so both passed.

These tests pin the fix:

* migration ``0002_team_members_unique_student`` adds the constraint to a
  legacy database,
* the constraint actually rejects a second membership,
* the migration refuses to run (loudly, naming the rows) when existing
  data already violates the rule,
* the migration is repeatable,
* concurrent membership creation can never leave a student in two teams,
* and the API surfaces a uniqueness violation as a business-rule error
  rather than a silent success or an opaque 500.
"""

import os
import sqlite3
import tempfile
import threading
import unittest
from unittest.mock import patch

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = (
    f"sqlite+pysqlite:///{_test_directory.name}/db01.sqlite"
)
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"
# Never inherit the pilot flag from a developer .env.
os.environ.setdefault("PILOT_ONBOARDING_ENABLED", "false")

from app import main, migrations, models  # noqa: E402
from app.auth import create_access_token, hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.migrations import MigrationError, run_migrations  # noqa: E402
from app.schemas import TeamCreate  # noqa: E402


# ---------------------------------------------------------------------------
# a legacy schema, reproduced by hand
# ---------------------------------------------------------------------------

# Exactly the shape ``create_all`` produced before ``models.py`` declared
# ``unique_student_team``: composite unique (team_id, student_id) but no
# uniqueness on student_id alone. Built with raw SQL so the test does not
# depend on the current model definition.
_LEGACY_SCHEMA = """
CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    university_id VARCHAR NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    password VARCHAR NOT NULL,
    program VARCHAR NOT NULL,
    profile_picture VARCHAR,
    bio TEXT, github VARCHAR, linkedin VARCHAR, whatsapp VARCHAR,
    skills TEXT, interests TEXT, fyp_status VARCHAR,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR,
    profile_completed BOOLEAN NOT NULL DEFAULT TRUE,
    role VARCHAR NOT NULL DEFAULT 'student',
    pilot_account BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE teams (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    project_title VARCHAR, description TEXT,
    department_preference VARCHAR NOT NULL,
    spots_available INTEGER NOT NULL,
    skills_needed TEXT, roles_needed TEXT, contact VARCHAR,
    created_by INTEGER NOT NULL REFERENCES students(id)
);
CREATE TABLE team_members (
    id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT unique_team_student UNIQUE (team_id, student_id)
);
"""


def _build_legacy_db(path, duplicates=False):
    """Create a pre-audit database file, optionally with a duplicate."""
    conn = sqlite3.connect(path)
    conn.executescript(_LEGACY_SCHEMA)
    conn.executescript(
        """
        INSERT INTO students (id, name, university_id, email, password, program)
        VALUES (1, 'Test Student', 'A1', 'a1@x.edu', 'h', 'BSCS'),
               (2, 'Second',       'A2', 'a2@x.edu', 'h', 'BSCS'),
               (31, 'Owner',       'A31', 'a31@x.edu', 'h', 'BSCS');
        INSERT INTO teams (id, name, department_preference, spots_available, created_by)
        VALUES (1, 'Ahmed Khan', 'BSCS', 1, 1),
               (2, 'Alpha',      'BSCS', 0, 31);
        """
    )
    if duplicates:
        # The real conflict found in the dev database during the audit:
        # student 1 owns team 1 and is also a member of team 2.
        conn.executescript(
            """
            INSERT INTO team_members (id, team_id, student_id)
            VALUES (4, 1, 1), (3, 2, 1);
            """
        )
    else:
        conn.executescript(
            """
            INSERT INTO team_members (id, team_id, student_id)
            VALUES (4, 1, 1), (2, 2, 31);
            """
        )
    conn.commit()
    conn.close()


class _LegacyEngineMixin:
    """Runs migrations against an isolated legacy SQLite file."""

    def _make_legacy(self, duplicates=False):
        fd, path = tempfile.mkstemp(suffix=".sqlite", dir="/tmp/opencode")
        os.close(fd)
        self.addCleanup(os.unlink, path)
        _build_legacy_db(path, duplicates=duplicates)
        from sqlalchemy import create_engine

        legacy = create_engine(f"sqlite+pysqlite:///{path}")
        self.addCleanup(legacy.dispose)
        return legacy, path


# ---------------------------------------------------------------------------
# migration behaviour
# ---------------------------------------------------------------------------

class MigrationCreationTests(_LegacyEngineMixin, unittest.TestCase):
    """0002 adds the constraint to a database that predates it."""

    def test_creates_constraint_on_legacy_schema(self):
        legacy, path = self._make_legacy(duplicates=False)

        self.assertFalse(migrations._unique_constraint_exists(
            legacy, "team_members", "unique_student_team"))
        self.assertFalse(migrations._unique_index_exists(
            legacy, "team_members", "unique_student_team"))

        applied = run_migrations(legacy)
        self.assertIn("0002_team_members_unique_student", applied)

        self.assertTrue(
            migrations._unique_index_exists(
                legacy, "team_members", "unique_student_team")
            or migrations._unique_constraint_exists(
                legacy, "team_members", "unique_student_team"),
            "constraint must exist after the migration",
        )

        # Existing rows survive untouched.
        conn = sqlite3.connect(path)
        rows = conn.execute(
            "SELECT student_id FROM team_members ORDER BY student_id"
        ).fetchall()
        self.assertEqual([r[0] for r in rows], [1, 31])

    def test_constraint_rejects_a_second_membership(self):
        legacy, path = self._make_legacy(duplicates=False)
        run_migrations(legacy)

        conn = sqlite3.connect(path)
        with self.assertRaises(sqlite3.IntegrityError):
            # Student 1 is already in team 1; put them in team 2 as well.
            conn.execute(
                "INSERT INTO team_members (team_id, student_id) VALUES (2, 1)"
            )
        conn.close()

    def test_migration_is_repeatable(self):
        legacy, _ = self._make_legacy(duplicates=False)
        first = run_migrations(legacy)
        self.assertIn("0002_team_members_unique_student", first)
        # Re-running (fresh start-up, second worker) must not fail or
        # attempt to re-create the constraint.
        self.assertEqual(run_migrations(legacy), [])

    def test_fails_loudly_when_data_already_violates_the_rule(self):
        legacy, path = self._make_legacy(duplicates=True)

        with self.assertRaises(MigrationError) as ctx:
            run_migrations(legacy)

        message = str(ctx.exception)
        self.assertIn("student_id=1", message)
        self.assertIn("one-membership-per-student", message)

        # It must not have created a half-applied constraint.
        conn = sqlite3.connect(path)
        self.assertFalse(migrations._unique_index_exists(
            legacy, "team_members", "unique_student_team"))
        # ...and 0002 must not have recorded itself as applied (0001 is
        # independent and legitimately stays recorded).
        self.assertEqual(conn.execute(
            "SELECT version FROM schema_migrations").fetchall(),
            [("0001_students_baseline",)])
        # The offending rows are still there for a human to reconcile.
        self.assertEqual(
            conn.execute(
                "SELECT COUNT(*) FROM team_members WHERE student_id = 1"
            ).fetchone()[0],
            2,
        )
        conn.close()

    def test_no_migration_rewrites_email_verification(self):
        # SEC-04: the migration list must contain no statement that sets
        # email_verified. (The removed startup block did exactly this.)
        source = __import__("inspect").getsource(migrations)
        self.assertNotIn("SET email_verified = TRUE", source)


# ---------------------------------------------------------------------------
# database authority under concurrency
# ---------------------------------------------------------------------------

class ConcurrentMembershipTests(_LegacyEngineMixin, unittest.TestCase):
    """The database is the final authority, not the pre-check."""

    def test_concurrent_joins_never_produce_two_memberships(self):
        legacy, path = self._make_legacy(duplicates=False)
        run_migrations(legacy)

        conn = sqlite3.connect(path, check_same_thread=False)
        conn.execute("PRAGMA busy_timeout = 5000")
        # Student 2 belongs to no team yet; six threads race to put them
        # into six *different* teams.
        for team_id in (3, 4, 5, 6, 7, 8):
            conn.execute(
                "INSERT INTO teams (id, name, department_preference,"
                " spots_available, created_by)"
                " VALUES (?, ?, 'BSCS', 2, 31)",
                (team_id, f"Race {team_id}"),
            )
        conn.commit()

        successes = []
        lock = threading.Lock()

        def join(team_id):
            local = sqlite3.connect(path, check_same_thread=False)
            local.execute("PRAGMA busy_timeout = 5000")
            try:
                local.execute(
                    "INSERT INTO team_members (team_id, student_id)"
                    " VALUES (?, 2)",
                    (team_id,),
                )
                local.commit()
                with lock:
                    successes.append(team_id)
            except sqlite3.IntegrityError:
                local.rollback()
            finally:
                local.close()

        threads = [
            threading.Thread(target=join, args=(team_id,))
            for team_id in (3, 4, 5, 6, 7, 8)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        check = sqlite3.connect(path)
        count = check.execute(
            "SELECT COUNT(*) FROM team_members WHERE student_id = 2"
        ).fetchone()[0]
        check.close()
        conn.close()

        # Regardless of how the threads interleaved, the invariant holds.
        self.assertLessEqual(
            count, 1,
            f"student 2 ended up in {count} teams",
        )
        self.assertEqual(
            len(successes), count,
            "recorded successes must match the rows actually committed",
        )


# ---------------------------------------------------------------------------
# API behaviour
# ---------------------------------------------------------------------------

async def call_app(method, path, token=None, body=b""):
    """Drive the real FastAPI ASGI app directly (no HTTP client needed)."""
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path.split("?")[0],
        "raw_path": path.split("?")[0].encode(),
        "query_string": b"",
        "root_path": "",
        "headers": [(b"host", b"testserver")],
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }
    if token:
        scope["headers"].append(
            (b"authorization", f"Bearer {token}".encode())
        )
    if body:
        scope["headers"].append((b"content-type", b"application/json"))

    state = {"body": body, "done": False}

    async def receive():
        if not state["done"]:
            state["done"] = True
            return {"type": "http.request", "body": state["body"],
                    "more_body": False}
        return {"type": "http.disconnect"}

    sent = []

    async def send(message):
        sent.append(message)

    await main.app(scope, receive, send)

    status = None
    for message in sent:
        if message["type"] == "http.response.start":
            status = message["status"]
    raw = b"".join(
        message.get("body", b"")
        for message in sent
        if message["type"] == "http.response.body"
    )
    return status, raw


def _run(coro):
    import asyncio
    return asyncio.run(coro)


class ApiMembershipTests(unittest.TestCase):
    """Rejections at the API boundary, and graceful constraint handling."""

    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        run_migrations(engine)

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def _student(self, *, uid, email, verified=True):
        db = SessionLocal()
        try:
            student = models.Student(
                name=f"Student {uid}",
                university_id=uid,
                email=email,
                password=hash_password("Password123"),
                program="BSCS",
                email_verified=verified,
                role="student",
                profile_completed=True,
            )
            db.add(student)
            db.commit()
            db.refresh(student)
            return student.id
        finally:
            db.close()

    def _token(self, student_id):
        return create_access_token(student_id)

    def test_create_team_rejected_when_already_in_a_team(self):
        owner = self._student(uid="A1", email="a1@iqra.edu.pk")
        member = self._student(uid="A2", email="a2@iqra.edu.pk")

        status, _ = _run(call_app(
            "POST", "/teams",
            token=self._token(owner),
            body=TeamCreate(name="Owner Team", department_preference="BSCS",
                            spots_available=1).model_dump_json().encode(),
        ))
        self.assertEqual(status, 200)

        db = SessionLocal()
        try:
            team = db.query(models.Team).filter_by(name="Owner Team").one()
            db.add(models.TeamMember(team_id=team.id, student_id=member))
            db.commit()
        finally:
            db.close()

        status, raw = _run(call_app(
            "POST", "/teams",
            token=self._token(member),
            body=TeamCreate(name="Second Team", department_preference="BSCS",
                            spots_available=1).model_dump_json().encode(),
        ))
        self.assertEqual(status, 400)
        self.assertIn(b"already in a team", raw)

    def test_accept_invitation_rejected_when_already_in_a_team(self):
        owner = self._student(uid="A1", email="a1@iqra.edu.pk")
        member = self._student(uid="A2", email="a2@iqra.edu.pk")
        other = self._student(uid="A3", email="a3@iqra.edu.pk")

        db = SessionLocal()
        try:
            team_a = models.Team(name="Team A", department_preference="BSCS",
                                 spots_available=2, created_by=owner)
            team_b = models.Team(name="Team B", department_preference="BSCS",
                                 spots_available=2, created_by=other)
            db.add_all([team_a, team_b])
            db.flush()
            db.add(models.TeamMember(team_id=team_a.id, student_id=member))
            db.add(models.TeamInvitation(team_id=team_b.id,
                                         student_id=member,
                                         invited_by=other))
            db.commit()
            invitation_id = db.query(models.TeamInvitation).one().id
        finally:
            db.close()

        status, raw = _run(call_app(
            "POST", f"/invitations/{invitation_id}/accept",
            token=self._token(member),
        ))
        self.assertEqual(status, 409)
        self.assertIn(b"already in a team", raw)

        # The database must not have changed.
        conn = SessionLocal()
        try:
            self.assertEqual(
                conn.query(models.TeamMember).filter_by(
                    student_id=member).count(), 1)
        finally:
            conn.close()

    def test_constraint_violation_is_reported_as_a_business_rule(self):
        """If a race loses, the client sees 400, not a 500 or a success."""
        from sqlalchemy.exc import IntegrityError

        member = self._student(uid="A2", email="a2@iqra.edu.pk")
        real_factory = main.database.SessionLocal

        class RacingSession:
            """Real session, except the commit loses the race."""

            def __init__(self, real):
                self._real = real

            def query(self, *a, **k):
                return self._real.query(*a, **k)

            def __getattr__(self, name):
                return getattr(self._real, name)

            def add(self, obj):
                return self._real.add(obj)

            def commit(self):
                raise IntegrityError(
                    "INSERT INTO team_members ...",
                    {},
                    Exception('duplicate key value violates unique '
                              'constraint "unique_student_team"'),
                )

            def rollback(self):
                return self._real.rollback()

            def close(self):
                return self._real.close()

        with patch.object(main.database, "SessionLocal",
                          lambda: RacingSession(real_factory())):
            status, raw = _run(call_app(
                "POST", "/teams",
                token=self._token(member),
                body=TeamCreate(name="Raced Team", department_preference="BSCS",
                                spots_available=1).model_dump_json().encode(),
            ))

        self.assertEqual(status, 400)
        self.assertIn(b"already in a team", raw)


class StartupDoesNotVerifyTests(unittest.TestCase):
    """SEC-04: booting the app must not change verification state."""

    def test_boot_leaves_unverified_accounts_unverified(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        db = SessionLocal()
        try:
            db.add(models.Student(
                name="Pilot", university_id="P59",
                email="pilot59@iqra.edu.pk",
                password=hash_password("Password123"),
                program="BSCS", email_verified=False,
                verification_token=None, pilot_account=True,
            ))
            db.commit()
        finally:
            db.close()

        for _ in range(3):
            run_migrations(engine)

        db = SessionLocal()
        try:
            student = db.query(models.Student).filter_by(
                university_id="P59").one()
            self.assertFalse(
                student.email_verified,
                "startup must never verify an account because its token "
                "is null",
            )
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
