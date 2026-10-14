import os
import tempfile
import unittest
from unittest.mock import patch

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_test_directory.name}/university_id.sqlite"
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"
# Never inherit the pilot flag from a developer .env: these suites
# exercise the default (pilot off) flow. Tests that need the pilot on
# opt in explicitly with patch.dict(). setdefault keeps an explicitly
# exported value (e.g. PILOT_ONBOARDING_ENABLED=true) authoritative.
os.environ.setdefault("PILOT_ONBOARDING_ENABLED", "false")

from fastapi import HTTPException  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from app import main, models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.schemas import StudentCreate  # noqa: E402


class UniversityIdValidationTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        self.emails = []
        self.sender = patch.object(
            main, "send_verification_email", side_effect=self.capture_email
        )
        self.sender.start()

    def tearDown(self):
        self.sender.stop()
        Base.metadata.drop_all(engine)

    def capture_email(self, address, token):
        self.emails.append((address, token))

    def register(self, email, university_id):
        return main.create_student(StudentCreate(
            name="Test Student",
            email=email,
            university_id=university_id,
            program="BSCS",
        ))

    def assert_rejected(self, email, university_id, status_code):
        with SessionLocal() as db:
            pending_before = db.query(models.PendingRegistration).count()
        with self.assertRaises(HTTPException) as ctx:
            self.register(email, university_id)
        self.assertEqual(ctx.exception.status_code, status_code)
        with SessionLocal() as db:
            self.assertEqual(
                db.query(models.PendingRegistration).count(), pending_before
            )

    def test_id_matches_local_part_exactly(self):
        response = self.register("67267@iqra.edu.pk", "67267")
        self.assertIn("university email", response["message"].lower())

    def test_id_matches_local_part_after_dot(self):
        # Actual university format: ali.67267@iqra.edu.pk
        response = self.register("ali.67267@iqra.edu.pk", "67267")
        self.assertIn("university email", response["message"].lower())

    def test_uppercase_id_accepted(self):
        response = self.register("ali.bcs123@iqra.edu.pk", "BCS123")
        self.assertIn("university email", response["message"].lower())
        with SessionLocal() as db:
            pending = db.query(models.PendingRegistration).one()
            self.assertEqual(pending.student_data["university_id"], "BCS123")

    def test_mismatched_id_rejected(self):
        self.assert_rejected("ali.67267@iqra.edu.pk", "12345", 400)

    def test_id_without_dot_boundary_rejected(self):
        # "x67267" is not "ali.67267": the ID must follow a dot or be exact.
        self.assert_rejected("x67267@iqra.edu.pk", "67267", 400)

    def test_wrong_domain_rejected(self):
        self.assert_rejected("ali.67267@gmail.com", "67267", 403)

    def test_malformed_email_rejected(self):
        for bad_email in ("not-an-email", "ali.67267@", "@iqra.edu.pk"):
            with self.assertRaises(ValidationError):
                StudentCreate(
                    name="Test Student",
                    email=bad_email,
                    university_id="67267",
                    program="BSCS",
                )

    def test_empty_university_id_rejected(self):
        with self.assertRaises(ValidationError):
            StudentCreate(
                name="Test Student",
                email="ali.67267@iqra.edu.pk",
                university_id="",
                program="BSCS",
            )
