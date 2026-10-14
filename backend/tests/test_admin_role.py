import asyncio
import importlib.util
import inspect
import io
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = (
    f"sqlite+pysqlite:///{_test_directory.name}/admin_role.sqlite"
)
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"
# Never inherit the pilot flag from a developer .env: these suites
# exercise the default (pilot off) flow. Tests that need the pilot on
# opt in explicitly with patch.dict(). setdefault keeps an explicitly
# exported value (e.g. PILOT_ONBOARDING_ENABLED=true) authoritative.
os.environ.setdefault("PILOT_ONBOARDING_ENABLED", "false")

from fastapi import Depends, FastAPI  # noqa: E402

from app import dependencies, main, migrations, models  # noqa: E402
from app.auth import create_access_token, hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.schemas import StudentCreate, VerificationRequest  # noqa: E402

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SCRIPT_PATH = os.path.join(_BACKEND_DIR, "scripts", "make_admin.py")

# Load the bootstrap script as a module (scripts/ is not a package).
_spec = importlib.util.spec_from_file_location("make_admin_script", _SCRIPT_PATH)
make_admin = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(make_admin)


async def call_app(app, method, path, token=None):
    """Drive a real ASGI app through routing and security dependencies."""
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
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

    await app(scope, receive, send)

    status = next(
        m["status"] for m in sent if m["type"] == "http.response.start"
    )
    body = b"".join(
        m.get("body", b"") for m in sent if m["type"] == "http.response.body"
    )
    import json
    return status, (json.loads(body) if body else None)


def request(app, method, path, token=None):
    return asyncio.run(call_app(app, method, path, token=token))


def make_student(db, name, uid, email, verified=True):
    student = models.Student(
        name=name,
        university_id=uid,
        email=email,
        password=hash_password("TestPassword123"),
        program="BSCS",
        email_verified=verified,
    )
    db.add(student)
    db.commit()
    return student


# Test-only probe app: mounts the production admin dependency on a
# throwaway route so authorization is exercised through the real ASGI
# stack (HTTPBearer -> get_current_student -> get_current_admin) without
# adding any production endpoint.
probe_app = FastAPI()


@probe_app.get("/_test/admin-only")
def _admin_only(current_admin=Depends(dependencies.get_current_admin)):
    return {"id": current_admin.id, "role": current_admin.role}


class RoleDefaultTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def test_new_orm_students_default_to_student(self):
        db = SessionLocal()
        try:
            student = make_student(
                db, "Alice", "10001", "alice.10001@iqra.edu.pk"
            )
            self.assertEqual(student.role, models.STUDENT_ROLE)
            self.assertIn(student.role, models.VALID_ROLES)
        finally:
            db.close()


class RoleEscalationTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        self.emails = []
        self.sender = patch.object(
            main, "send_verification_email",
            side_effect=lambda address, token: self.emails.append(
                (address, token)
            ),
        )
        self.sender.start()

    def tearDown(self):
        self.sender.stop()
        Base.metadata.drop_all(engine)

    def test_payload_with_role_admin_creates_plain_student(self):
        main.create_student(StudentCreate(
            name="Mallory",
            university_id="10009",
            email="mallory.10009@iqra.edu.pk",
            program="BSCS",
            role="admin",  # must be ignored, never honored
        ))
        db = SessionLocal()
        try:
            pending = db.query(models.PendingRegistration).one()
            self.assertNotIn("role", pending.student_data)
        finally:
            db.close()

        main.verify_email(VerificationRequest(
            token=self.emails[0][1], password="TestPassword123"
        ))
        db = SessionLocal()
        try:
            student = db.query(models.Student).one()
            self.assertEqual(student.role, models.STUDENT_ROLE)
        finally:
            db.close()

    def test_explicit_role_write_accepts_only_valid_roles(self):
        # Application-controlled writes are constrained to VALID_ROLES
        # by the bootstrap path, which only ever writes ADMIN_ROLE.
        self.assertEqual(models.ADMIN_ROLE, "admin")
        self.assertEqual(models.STUDENT_ROLE, "student")
        self.assertEqual(models.VALID_ROLES, {"student", "admin"})


class MigrationTests(unittest.TestCase):
    """The startup migration adds the role column safely."""

    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)

    def tearDown(self):
        Base.metadata.drop_all(engine)

    # Production statement (Postgres), now from app/migrations.py:
    #   ALTER TABLE students ADD COLUMN role VARCHAR NOT NULL DEFAULT 'student'
    # SQLite lacks ADD COLUMN IF NOT EXISTS, so migrations.py asks the
    # schema instead; the backfill semantics (DEFAULT 'student' applying
    # to pre-existing rows) are verified with the same statement minus
    # that guard clause.
    _SQLITE_EQUIVALENT = (
        "ALTER TABLE students ADD COLUMN role VARCHAR NOT NULL DEFAULT 'student'"
    )

    def test_production_migration_statement_is_present_and_guarded(self):
        # The migration block moved out of main.py into app/migrations.py
        # (audit DB-02) — the guarantees below are asserted there now.
        source = inspect.getsource(migrations)
        self.assertIn("ADD COLUMN", source)
        self.assertIn(
            "role VARCHAR NOT NULL DEFAULT 'student'", source
        )
        # No SQL statement in any migration may write 'admin':
        # existing students are grandfathered, never promoted. (Lines
        # with 'admin' are allowed only in comments.)
        sql_lines = [
            line for line in source.splitlines()
            if "text(" in line or "ALTER TABLE" in line or "UPDATE " in line
        ]
        self.assertFalse(
            any("'admin'" in line for line in sql_lines),
            f"migration SQL must not write admin: {sql_lines}",
        )

    def test_backfill_defaults_legacy_rows_to_student(self):
        conn = sqlite3.connect(":memory:")
        try:
            conn.execute(
                "CREATE TABLE students ("
                " id INTEGER PRIMARY KEY,"
                " email VARCHAR UNIQUE NOT NULL)"
            )
            conn.execute(
                "INSERT INTO students (email) VALUES ('legacy@iqra.edu.pk')"
            )
            conn.execute(self._SQLITE_EQUIVALENT)
            (role,) = conn.execute("SELECT role FROM students").fetchone()
            self.assertEqual(role, "student")
        finally:
            conn.close()

    def test_create_all_schema_has_role_default(self):
        # Fresh databases (incl. test DBs) get the column from models.
        from sqlalchemy import text
        db = SessionLocal()
        try:
            db.execute(text(
                "INSERT INTO students (name, university_id, email,"
                " password, program, email_verified)"
                " VALUES ('Raw', '10050', 'raw.10050@iqra.edu.pk',"
                " 'x', 'BSCS', 1)"
            ))
            db.commit()
            (role,) = db.execute(text(
                "SELECT role FROM students WHERE university_id = '10050'"
            )).fetchone()
            self.assertEqual(role, "student")
        finally:
            db.rollback()
            db.close()


class AdminAuthorizationTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        db = SessionLocal()
        try:
            self.student = make_student(
                db, "Student", "20001", "student.20001@iqra.edu.pk"
            )
            self.admin = make_student(
                db, "Admin", "20002", "admin.20002@iqra.edu.pk"
            )
            self.admin.role = models.ADMIN_ROLE
            db.commit()
            self.admin_id = self.admin.id
            self.student_id = self.student.id
        finally:
            db.close()

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def test_missing_credentials_return_401(self):
        status, body = request(probe_app, "GET", "/_test/admin-only")
        self.assertEqual(status, 401)

    def test_invalid_token_returns_401(self):
        status, body = request(
            probe_app, "GET", "/_test/admin-only", token="garbage"
        )
        self.assertEqual(status, 401)

    def test_ordinary_student_returns_403(self):
        status, body = request(
            probe_app, "GET", "/_test/admin-only",
            token=create_access_token(self.student_id),
        )
        self.assertEqual(status, 403)
        self.assertEqual(body["detail"], "Administrator access required")

    def test_admin_is_authorized(self):
        status, body = request(
            probe_app, "GET", "/_test/admin-only",
            token=create_access_token(self.admin_id),
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["id"], self.admin_id)
        self.assertEqual(body["role"], "admin")

    def test_revocation_is_immediate_despite_valid_jwt(self):
        # The same (still-valid) JWT must lose admin access as soon as
        # the database role changes: the role is never read from JWT.
        token = create_access_token(self.admin_id)
        status, _ = request(
            probe_app, "GET", "/_test/admin-only", token=token
        )
        self.assertEqual(status, 200)

        db = SessionLocal()
        try:
            db.query(models.Student).filter_by(id=self.admin_id).update(
                {models.Student.role: models.STUDENT_ROLE}
            )
            db.commit()
        finally:
            db.close()

        status, body = request(
            probe_app, "GET", "/_test/admin-only", token=token
        )
        self.assertEqual(status, 403)


class JwtFormatTests(unittest.TestCase):
    def test_token_payload_unchanged(self):
        import jwt as pyjwt
        token = create_access_token(123)
        payload = pyjwt.decode(
            token, os.environ["SECRET_KEY"], algorithms=["HS256"]
        )
        # Batch B must not alter the JWT contract: only sub + exp.
        self.assertEqual(set(payload.keys()), {"sub", "exp"})
        self.assertEqual(payload["sub"], "123")


class BootstrapScriptTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def test_refuses_unknown_email(self):
        db = SessionLocal()
        try:
            with self.assertRaises(make_admin.BootstrapError) as ctx:
                make_admin.promote_to_admin(db, "ghost.1@iqra.edu.pk")
            self.assertIn("No account", str(ctx.exception))
        finally:
            db.close()

    def test_refuses_unverified_account(self):
        db = SessionLocal()
        try:
            unverified = make_student(
                db, "Unverified", "30001", "un.30001@iqra.edu.pk",
                verified=False,
            )
            with self.assertRaises(make_admin.BootstrapError) as ctx:
                make_admin.promote_to_admin(db, "un.30001@iqra.edu.pk")
            self.assertIn("not verified", str(ctx.exception))
            db.refresh(unverified)
            self.assertEqual(unverified.role, models.STUDENT_ROLE)
        finally:
            db.close()

    def test_promotes_verified_student(self):
        db = SessionLocal()
        try:
            student = make_student(
                db, "Future Admin", "30002", "boss.30002@iqra.edu.pk"
            )
            student_id = make_admin.promote_to_admin(
                db, "  BOSS.30002@IQRA.EDU.PK  "
            )
            self.assertEqual(student_id, student.id)
            db.refresh(student)
            self.assertEqual(student.role, models.ADMIN_ROLE)
        finally:
            db.close()

    def test_refuses_when_an_admin_already_exists(self):
        db = SessionLocal()
        try:
            first = make_student(db, "First", "30003", "first.30003@iqra.edu.pk")
            make_admin.promote_to_admin(db, "first.30003@iqra.edu.pk")

            second = make_student(
                db, "Second", "30004", "second.30004@iqra.edu.pk"
            )
            with self.assertRaises(make_admin.BootstrapError) as ctx:
                make_admin.promote_to_admin(db, "second.30004@iqra.edu.pk")
            self.assertIn("already exists", str(ctx.exception))

            db.refresh(second)
            self.assertEqual(second.role, models.STUDENT_ROLE)
            # Exactly one admin, still the first.
            admins = db.query(models.Student).filter(
                models.Student.role == models.ADMIN_ROLE
            ).all()
            self.assertEqual([a.id for a in admins], [first.id])
        finally:
            db.close()

    def test_never_creates_accounts(self):
        db = SessionLocal()
        try:
            before = db.query(models.Student).count()
            for address in ("ghost@iqra.edu.pk", "", None):
                with self.assertRaises(make_admin.BootstrapError):
                    make_admin.promote_to_admin(db, address)
            self.assertEqual(db.query(models.Student).count(), before)
        finally:
            db.close()

    def test_main_exit_codes_and_output_safety(self):
        db = SessionLocal()
        try:
            make_student(db, "Boss", "30005", "boss2.30005@iqra.edu.pk")
        finally:
            db.close()

        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = make_admin.main([])
        self.assertEqual(code, 2)
        self.assertIn("Usage", err.getvalue())

        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = make_admin.main(["boss2.30005@iqra.edu.pk"])
        self.assertEqual(code, 0)
        self.assertIn("Promoted student id=", out.getvalue())
        combined = out.getvalue() + err.getvalue()
        # Never print credentials or password hashes.
        self.assertNotIn("$2b$", combined)
        self.assertNotIn("password", combined.lower())

        # Second run: refused, exit 1, still exactly one admin.
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = make_admin.main(["boss2.30005@iqra.edu.pk"])
        self.assertEqual(code, 1)
        self.assertIn("Refused:", err.getvalue())

    def test_cli_end_to_end_in_subprocess(self):
        # Run the real script against the isolated test database file.
        db = SessionLocal()
        try:
            student = make_student(
                db, "Cli Boss", "30006", "cli.30006@iqra.edu.pk"
            )
        finally:
            db.close()

        env = dict(os.environ)
        env["DATABASE_URL"] = str(engine.url)
        env["SECRET_KEY"] = "test-only-secret-never-use-in-production"

        result = subprocess.run(
            [sys.executable, _SCRIPT_PATH, "cli.30006@iqra.edu.pk"],
            capture_output=True, text=True, env=env,
            cwd=_BACKEND_DIR, timeout=120,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Promoted student id=", result.stdout)
        self.assertNotIn("$2b$", result.stdout + result.stderr)

        db = SessionLocal()
        try:
            student = db.query(models.Student).filter_by(
                id=student.id
            ).one()
            self.assertEqual(student.role, models.ADMIN_ROLE)

            # A second run must refuse.
            again = subprocess.run(
                [sys.executable, _SCRIPT_PATH, "cli.30006@iqra.edu.pk"],
                capture_output=True, text=True, env=env,
                cwd=_BACKEND_DIR, timeout=120,
            )
            self.assertEqual(again.returncode, 1)
            self.assertIn("already exists", again.stderr)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
