import os
import tempfile
import unittest
from unittest.mock import patch

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_test_directory.name}/registration_flow.sqlite"
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"

from fastapi import HTTPException  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from app import main, models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.schemas import StudentCreate, StudentUpdate, VerificationRequest  # noqa: E402


class OptionalUrlFieldTests(unittest.TestCase):
    """profile_picture, github and linkedin are optional on registration."""

    def build(self, **overrides):
        payload = {
            "name": "Test Student",
            "email": "ali.67267@iqra.edu.pk",
            "university_id": "67267",
            "program": "BSCS",
        }
        payload.update(overrides)
        return StudentCreate(**payload)

    def test_omitted_fields_default_to_none(self):
        student = self.build()
        self.assertIsNone(student.profile_picture)
        self.assertIsNone(student.github)
        self.assertIsNone(student.linkedin)

    def test_empty_strings_accepted(self):
        student = self.build(profile_picture="", github="", linkedin="")
        self.assertEqual(student.github, "")
        self.assertEqual(student.linkedin, "")
        self.assertEqual(student.profile_picture, "")

    def test_whitespace_only_treated_as_empty(self):
        student = self.build(
            profile_picture="   ", github="  ", linkedin="\t\n"
        )
        self.assertEqual(student.github, "")
        self.assertEqual(student.linkedin, "")
        self.assertEqual(student.profile_picture, "")

    def test_invalid_non_empty_values_still_rejected(self):
        # The /docs example value "string" must keep failing (422).
        for bad in ("string", "example.com", "www.site.com/page"):
            with self.assertRaises(ValidationError):
                self.build(github=bad)
            with self.assertRaises(ValidationError):
                self.build(linkedin=bad)
            with self.assertRaises(ValidationError):
                self.build(profile_picture=bad)

    def test_valid_http_and_data_image_values_kept(self):
        student = self.build(
            github="https://github.com/ali",
            linkedin="http://linkedin.com/in/ali",
            profile_picture="data:image/png;base64,iVBORw0KGgo=",
        )
        self.assertEqual(student.github, "https://github.com/ali")
        self.assertEqual(student.linkedin, "http://linkedin.com/in/ali")
        self.assertTrue(student.profile_picture.startswith("data:image/"))

    def test_update_schema_matches_create_schema(self):
        update = StudentUpdate(
            name="Test Student",
            program="BSCS",
            github="   ",
            linkedin="",
            profile_picture="",
        )
        self.assertEqual(update.github, "")
        self.assertEqual(update.linkedin, "")
        with self.assertRaises(ValidationError):
            StudentUpdate(
                name="Test Student", program="BSCS", github="string"
            )


class RegistrationEndToEndTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        self.emails = []
        self.sender = patch.object(
            main, "send_verification_email",
            side_effect=lambda address, token: self.emails.append((address, token)),
        )
        self.sender.start()

    def tearDown(self):
        self.sender.stop()
        Base.metadata.drop_all(engine)

    def register(self, **overrides):
        payload = {
            "name": "Test Student",
            "email": "ali.67267@iqra.edu.pk",
            "university_id": "67267",
            "program": "BSCS",
            # Registration form payload: optional links sent as blanks.
            "profile_picture": "",
            "github": "   ",
            "linkedin": "",
        }
        payload.update(overrides)
        return main.create_student(StudentCreate(**payload))

    def test_dotted_email_registration_creates_pending_only(self):
        response = self.register()
        self.assertIn("university email", response["message"].lower())
        self.assertEqual(len(self.emails), 1)
        address, token = self.emails[0]
        self.assertEqual(address, "ali.67267@iqra.edu.pk")
        with SessionLocal() as db:
            # No student row before verification.
            self.assertEqual(db.query(models.Student).count(), 0)
            pending = db.query(models.PendingRegistration).one()
            self.assertNotEqual(pending.token_hash, token)
            # Blank optional links are stored as empty strings.
            self.assertEqual(pending.student_data["github"], "")
            self.assertEqual(pending.student_data["linkedin"], "")

    def test_verification_creates_student_then_duplicates_rejected(self):
        self.register()
        token = self.emails[0][1]
        main.verify_email(VerificationRequest(token=token, password="password123"))
        with SessionLocal() as db:
            student = db.query(models.Student).one()
            self.assertEqual(student.university_id, "67267")
            self.assertTrue(student.email_verified)
            self.assertEqual(db.query(models.PendingRegistration).count(), 0)

        # Same email/ID again -> 400, no second pending row.
        with self.assertRaises(HTTPException) as dup:
            self.register()
        self.assertEqual(dup.exception.status_code, 400)
        self.assertEqual(
            dup.exception.detail, "Email or university ID already registered"
        )
        with SessionLocal() as db:
            self.assertEqual(db.query(models.Student).count(), 1)
            self.assertEqual(db.query(models.PendingRegistration).count(), 0)

    def test_invalid_verification_token_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            main.verify_email(VerificationRequest(
                token="not-a-real-token", password="password123"
            ))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(
            ctx.exception.detail, "Invalid or expired verification token"
        )
        with SessionLocal() as db:
            self.assertEqual(db.query(models.Student).count(), 0)
            self.assertEqual(db.query(models.PendingRegistration).count(), 0)

    def test_email_failure_leaves_no_records(self):
        with patch.object(main, "send_verification_email", side_effect=OSError("SMTP down")):
            with self.assertRaises(HTTPException) as ctx:
                self.register()
        self.assertEqual(ctx.exception.status_code, 503)
        with SessionLocal() as db:
            self.assertEqual(db.query(models.PendingRegistration).count(), 0)
            self.assertEqual(db.query(models.Student).count(), 0)


if __name__ == "__main__":
    unittest.main()
