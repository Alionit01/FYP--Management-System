import io
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_test_directory.name}/email_fallback.sqlite"
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"

from app import main, models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.email import send_password_reset_email, send_verification_email  # noqa: E402
from app.schemas import StudentCreate  # noqa: E402

SMTP_OFF = {
    "SMTP_HOST": "", "SMTP_PORT": "", "SMTP_USERNAME": "",
    "SMTP_PASSWORD": "", "SMTP_FROM": "",
}


class EmailFallbackTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def test_verification_link_printed_to_console_without_smtp(self):
        output = io.StringIO()
        with patch.dict(
            os.environ,
            {**SMTP_OFF, "FRONTEND_URL": "http://localhost:5173"},
        ):
            with redirect_stdout(output):
                send_verification_email("ali.67267@iqra.edu.pk", "test-token")
        text = output.getvalue()
        self.assertIn("[dev email fallback]", text)
        self.assertIn(
            "http://localhost:5173/verify-email#token=test-token", text
        )
        self.assertIn("ali.67267@iqra.edu.pk", text)

    def test_reset_link_printed_to_console_without_smtp(self):
        output = io.StringIO()
        with patch.dict(
            os.environ,
            {**SMTP_OFF, "FRONTEND_URL": "http://localhost:5173"},
        ):
            with redirect_stdout(output):
                send_password_reset_email("ali.67267@iqra.edu.pk", "reset-token")
        self.assertIn(
            "http://localhost:5173/reset-password#token=reset-token",
            output.getvalue(),
        )

    def test_no_fallback_for_non_local_frontend(self):
        with patch.dict(
            os.environ,
            {**SMTP_OFF, "FRONTEND_URL": "https://fyp.example.com"},
        ):
            with self.assertRaises(RuntimeError):
                send_verification_email("ali.67267@iqra.edu.pk", "test-token")

    def test_registration_succeeds_without_smtp_in_dev(self):
        with patch.dict(
            os.environ,
            {**SMTP_OFF, "FRONTEND_URL": "http://localhost:5173"},
        ):
            output = io.StringIO()
            with redirect_stdout(output):
                response = main.create_student(StudentCreate(
                    name="Test Student",
                    email="ali.67267@iqra.edu.pk",
                    university_id="67267",
                    program="BSCS",
                ))
        self.assertIn("university email", response["message"].lower())
        self.assertIn("verify-email#token=", output.getvalue())
        with SessionLocal() as db:
            self.assertEqual(db.query(models.PendingRegistration).count(), 1)
