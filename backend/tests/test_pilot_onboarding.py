import asyncio
import inspect
import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from fastapi import Request

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = (
    f"sqlite+pysqlite:///{_test_directory.name}/pilot_onboarding.sqlite"
)
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"

from app import main, models  # noqa: E402
from app.auth import verify_password  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.schemas import StudentCreate, StudentLogin, VerificationRequest  # noqa: E402


def login_request():
    return Request({"type": "http", "headers": [], "client": ("127.0.0.1", 1234)})


async def call_app(method: str, path: str, token=None):
    """Drive the real FastAPI ASGI app (routing, security, dependencies)."""
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
    return status, (json.loads(body) if body else None)


def request(method: str, path: str, token=None):
    return asyncio.run(call_app(method, path, token=token))


class PilotConfigTests(unittest.TestCase):
    """The pilot flag is off by default and fails closed."""

    def _enabled(self, value):
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": value}):
            return main.pilot_onboarding_enabled()

    def test_missing_or_empty_is_disabled(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("PILOT_ONBOARDING_ENABLED", None)
            self.assertFalse(main.pilot_onboarding_enabled())
        self.assertFalse(self._enabled(""))

    def test_explicit_opt_in_values(self):
        for value in ("true", "TRUE", "True", "1", "yes", "on"):
            self.assertTrue(self._enabled(value), value)

    def test_invalid_values_fail_closed(self):
        for value in ("banana", "false", "0", "off", " enabled"):
            self.assertFalse(self._enabled(value), value)

    def test_pilot_status_endpoint_reflects_flag(self):
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            self.assertEqual(main.pilot_status(), {"pilot_onboarding": True})
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "banana"}):
            self.assertEqual(main.pilot_status(), {"pilot_onboarding": False})


class PilotRegistrationTests(unittest.TestCase):
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

    def student(self, local="pilot", password="PilotPass123", **extra):
        return StudentCreate(
            name="Pilot Student",
            university_id=local.upper(),
            email=f"{local}@iqra.edu.pk",
            program="BSCS",
            password=password,
            **extra,
        )

    def with_pilot(self, fn):
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            return fn()

    # ---------- Pilot enabled ----------

    def test_pilot_registration_creates_unverified_account_without_email(self):
        result = self.with_pilot(
            lambda: main.create_student(self.student())
        )

        # Signed-in response, no email sent, no pending registration.
        self.assertEqual(
            result["message"], "Pilot account created. You are signed in."
        )
        self.assertIn("access_token", result)
        self.assertEqual(result["token_type"], "bearer")
        self.assertEqual(self.emails, [])

        with SessionLocal() as db:
            student = db.query(models.Student).one()
            # Unverified, marked as a pilot account, password hashed.
            self.assertFalse(student.email_verified)
            self.assertTrue(student.pilot_account)
            self.assertTrue(verify_password("PilotPass123", student.password))
            self.assertNotIn("PilotPass123", student.password)
            self.assertEqual(
                db.query(models.PendingRegistration).count(), 0
            )

    def test_pilot_response_leaks_no_password_or_hash(self):
        result = self.with_pilot(lambda: main.create_student(self.student()))
        self.assertEqual(
            set(result.keys()),
            {"message", "access_token", "token_type", "student_id"},
        )
        self.assertNotIn("$2b$", json.dumps(result))

    def test_pilot_login_allowed_while_enabled(self):
        self.with_pilot(lambda: main.create_student(self.student()))
        user = self.with_pilot(
            lambda: main.login(
                StudentLogin(
                    email="pilot@iqra.edu.pk", password="PilotPass123"
                ),
                login_request(),
            )
        )
        self.assertIn("access_token", user)

    def test_pilot_requires_password(self):
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            with self.assertRaises(Exception) as ctx:
                main.create_student(self.student(password=None))
        self.assertEqual(getattr(ctx.exception, "status_code", None), 400)

    def test_pilot_rejects_short_password(self):
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            with self.assertRaises(Exception):
                main.create_student(self.student(password="short"))

    def test_pilot_duplicate_email_and_university_id_rejected(self):
        self.with_pilot(lambda: main.create_student(self.student()))

        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            # Same email, different university ID.
            with self.assertRaises(Exception) as by_email:
                main.create_student(StudentCreate(
                    name="Duplicate", university_id="PILOT2",
                    email="pilot@iqra.edu.pk", program="BSCS",
                    password="PilotPass123",
                ))
            self.assertEqual(
                getattr(by_email.exception, "status_code", None), 400
            )
            # Same university ID, different email.
            with self.assertRaises(Exception) as by_uid:
                main.create_student(StudentCreate(
                    name="Duplicate", university_id="PILOT",
                    email="other@iqra.edu.pk", program="BSCS",
                    password="PilotPass123",
                ))
            self.assertEqual(
                getattr(by_uid.exception, "status_code", None), 400
            )

    def test_pilot_still_validates_university_id_and_program(self):
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            # University ID does not match the email local part.
            with self.assertRaises(Exception) as mismatch:
                main.create_student(StudentCreate(
                    name="Bad", university_id="99999",
                    email="pilot@iqra.edu.pk", program="BSCS",
                    password="PilotPass123",
                ))
            self.assertEqual(
                getattr(mismatch.exception, "status_code", None), 400
            )
            # Unknown program.
            with self.assertRaises(Exception) as bad_program:
                main.create_student(StudentCreate(
                    name="Bad", university_id="PILOT",
                    email="pilot@iqra.edu.pk", program="MBA",
                    password="PilotPass123",
                ))
            self.assertEqual(
                getattr(bad_program.exception, "status_code", None), 400
            )

    def test_pilot_never_overwrites_an_existing_account(self):
        # A verified account already exists for this mailbox.
        self.with_pilot(lambda: main.create_student(self.student()))
        with SessionLocal() as db:
            db.query(models.Student).update(
                {models.Student.email_verified: True}
            )
            db.commit()

        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            with self.assertRaises(Exception) as ctx:
                main.create_student(self.student(password="AnotherPass123"))
        self.assertEqual(getattr(ctx.exception, "status_code", None), 400)

        # The original password is untouched.
        with SessionLocal() as db:
            student = db.query(models.Student).one()
            self.assertTrue(verify_password("PilotPass123", student.password))

    # ---------- Pilot disabled (default) ----------

    def test_disabled_by_default_uses_email_verification_flow(self):
        result = main.create_student(self.student())
        self.assertEqual(
            result["message"], "Check your university email for a verification link."
        )
        self.assertNotIn("access_token", result)
        self.assertEqual(len(self.emails), 1)

        with SessionLocal() as db:
            self.assertEqual(db.query(models.Student).count(), 0)
            pending = db.query(models.PendingRegistration).one()
            # The pilot password field is never persisted.
            self.assertNotIn("password", pending.student_data)

    def test_normal_flow_still_verifies_and_creates_regular_account(self):
        result = main.create_student(self.student())
        token = self.emails[0][1]
        main.verify_email(VerificationRequest(token=token, password="SetPass456"))

        with SessionLocal() as db:
            student = db.query(models.Student).one()
            self.assertTrue(student.email_verified)
            self.assertFalse(student.pilot_account)
            self.assertTrue(verify_password("SetPass456", student.password))

        user = main.login(
            StudentLogin(email="pilot@iqra.edu.pk", password="SetPass456"),
            login_request(),
        )
        self.assertIn("access_token", user)

    def test_password_ignored_without_pilot_flag(self):
        # A client may send a password with the flag off; it must be
        # discarded, not stored or used.
        main.create_student(self.student())
        with SessionLocal() as db:
            pending = db.query(models.PendingRegistration).one()
            self.assertNotIn("password", pending.student_data)


class PilotSwitchOffTests(unittest.TestCase):
    """Turning the pilot off must be safe for existing accounts."""

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

        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            main.create_student(StudentCreate(
                name="Pilot Student", university_id="PILOT",
                email="pilot@iqra.edu.pk", program="BSCS",
                password="PilotPass123",
            ))

    def tearDown(self):
        self.sender.stop()
        Base.metadata.drop_all(engine)

    def test_pilot_login_works_then_locks_out_when_disabled(self):
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            user = main.login(
                StudentLogin(
                    email="pilot@iqra.edu.pk", password="PilotPass123"
                ),
                login_request(),
            )
        self.assertIn("access_token", user)

        # Flag off: same (still valid) credentials are rejected.
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "false"}):
            with self.assertRaises(Exception) as ctx:
                main.login(
                    StudentLogin(
                        email="pilot@iqra.edu.pk",
                        password="PilotPass123",
                    ),
                    login_request(),
                )
        self.assertEqual(getattr(ctx.exception, "status_code", None), 403)

    def test_account_survives_switch_off_unverified_and_intact(self):
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "false"}):
            with SessionLocal() as db:
                student = db.query(models.Student).one()
                self.assertFalse(student.email_verified)
                self.assertTrue(student.pilot_account)
                self.assertTrue(
                    verify_password("PilotPass123", student.password)
                )

    def test_normal_verification_reclaims_pilot_account(self):
        # After the pilot, the mailbox owner completes the normal
        # flow: the unverified pilot row is reclaimed, verified,
        # and the pilot marker cleared — no duplicate account.
        main.create_student(StudentCreate(
            name="Pilot Student", university_id="PILOT",
            email="pilot@iqra.edu.pk", program="BSCS",
        ))
        token = self.emails[0][1]
        main.verify_email(VerificationRequest(token=token, password="RealPass789"))

        with SessionLocal() as db:
            self.assertEqual(db.query(models.Student).count(), 1)
            student = db.query(models.Student).one()
            self.assertTrue(student.email_verified)
            self.assertFalse(student.pilot_account)
            self.assertTrue(verify_password("RealPass789", student.password))

        # Works with the pilot flag off.
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "false"}):
            user = main.login(
                StudentLogin(email="pilot@iqra.edu.pk", password="RealPass789"),
                login_request(),
            )
        self.assertIn("access_token", user)


class PilotProtectionTests(unittest.TestCase):
    """Auth/authz protections stay intact regardless of the pilot flag."""

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

    def test_protected_endpoints_reject_anonymous_requests(self):
        for path in ("/students", "/students/1", "/teams/1",
                     "/teams/1/members", "/my-profile"):
            status, body = request("GET", path)
            self.assertEqual(status, 401, path)
            self.assertEqual(body["detail"], "Not authenticated")

            status, _ = request("GET", path, token="garbage")
            self.assertEqual(status, 401, path)

    def test_pilot_registration_is_not_an_open_login(self):
        # Registration itself is public, but the returned token must
        # not grant access without a valid sign-in: the token is a
        # normal JWT for the new student, and protected endpoints
        # still require it.
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            result = main.create_student(StudentCreate(
                name="Pilot Student", university_id="PILOT",
                email="pilot@iqra.edu.pk", program="BSCS",
                password="PilotPass123",
            ))
        status, body = request("GET", "/my-profile", token=result["access_token"])
        self.assertEqual(status, 200)
        self.assertEqual(body["email"], "pilot@iqra.edu.pk")
        self.assertNotIn("pilot_account", body)
        self.assertNotIn("password", body)

    def test_wrong_password_still_rejected(self):
        with patch.dict(os.environ, {"PILOT_ONBOARDING_ENABLED": "true"}):
            main.create_student(StudentCreate(
                name="Pilot Student", university_id="PILOT",
                email="pilot@iqra.edu.pk", program="BSCS",
                password="PilotPass123",
            ))
        with self.assertRaises(Exception) as ctx:
            main.login(
                StudentLogin(email="pilot@iqra.edu.pk", password="WrongPass9"),
                login_request(),
            )
        self.assertEqual(getattr(ctx.exception, "status_code", None), 401)


class PilotMigrationTests(unittest.TestCase):
    """The startup migration adds the pilot marker safely."""

    _SQLITE_EQUIVALENT = (
        "ALTER TABLE students ADD COLUMN pilot_account"
        " BOOLEAN NOT NULL DEFAULT FALSE"
    )

    def test_production_migration_statement_is_present(self):
        source = inspect.getsource(main)
        migration_zone = source[: source.index("@app.get")]
        self.assertIn("ADD COLUMN IF NOT EXISTS", migration_zone)
        self.assertIn(
            "pilot_account BOOLEAN NOT NULL DEFAULT FALSE", migration_zone
        )

    def test_existing_rows_default_to_not_pilot(self):
        conn = sqlite3.connect(":memory:")
        try:
            conn.execute(
                "CREATE TABLE students ("
                " id INTEGER PRIMARY KEY,"
                " email VARCHAR UNIQUE NOT NULL,"
                " email_verified BOOLEAN NOT NULL DEFAULT FALSE)"
            )
            conn.execute(
                "INSERT INTO students (email, email_verified)"
                " VALUES ('legacy@iqra.edu.pk', 1)"
            )
            conn.execute(self._SQLITE_EQUIVALENT)
            row = conn.execute(
                "SELECT email_verified, pilot_account FROM students"
            ).fetchone()
            # The migration never verifies or flags existing accounts.
            self.assertEqual(row, (1, 0))
        finally:
            conn.close()

    def test_model_column_defaults_to_false(self):
        student = models.Student(
            name="Defaults", university_id="10060",
            email="d.10060@iqra.edu.pk", password="x", program="BSCS",
        )
        self.assertFalse(student.pilot_account)
        self.assertFalse(student.email_verified)


if __name__ == "__main__":
    unittest.main()
