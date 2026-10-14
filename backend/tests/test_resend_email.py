import os
import tempfile
import unittest
from unittest.mock import patch

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_test_directory.name}/resend_email.sqlite"
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"
# Never inherit the pilot flag from a developer .env: these suites
# exercise the default (pilot off) flow. Tests that need the pilot on
# opt in explicitly with patch.dict(). setdefault keeps an explicitly
# exported value (e.g. PILOT_ONBOARDING_ENABLED=true) authoritative.
os.environ.setdefault("PILOT_ONBOARDING_ENABLED", "false")

from fastapi import HTTPException  # noqa: E402

from app import main, models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.email import send_password_reset_email, send_verification_email  # noqa: E402
from app.schemas import StudentCreate  # noqa: E402

API_KEY = "re_test_key_never_real"

# Production-style environment: Resend configured, no SMTP, HTTPS frontend
# (so the localhost console fallback is unavailable and never used).
RESEND_ENV = {
    "RESEND_API_KEY": API_KEY,
    "FRONTEND_URL": "https://fyp.example.com",
    "EMAIL_FROM": "",
    "SMTP_HOST": "", "SMTP_PORT": "", "SMTP_USERNAME": "",
    "SMTP_PASSWORD": "", "SMTP_FROM": "",
}


class ResendTransportTests(unittest.TestCase):
    def test_verification_email_sent_through_resend(self):
        with patch.dict(os.environ, RESEND_ENV), \
                patch("resend.Emails.send") as send:
            send_verification_email("ali.67267@iqra.edu.pk", "tok-verify-1")

        send.assert_called_once()
        params = send.call_args.args[0]
        # Default sender is Resend's permitted test sender.
        self.assertEqual(params["from"], "onboarding@resend.dev")
        self.assertEqual(params["to"], ["ali.67267@iqra.edu.pk"])
        self.assertEqual(params["subject"], "Verify your FYP Finder email")
        self.assertIn(
            "https://fyp.example.com/verify-email#token=tok-verify-1",
            params["text"],
        )

    def test_reset_email_sent_through_resend(self):
        with patch.dict(os.environ, RESEND_ENV), \
                patch("resend.Emails.send") as send:
            send_password_reset_email("ali.67267@iqra.edu.pk", "tok-reset-1")

        params = send.call_args.args[0]
        self.assertEqual(params["subject"], "Reset your FYP Finder password")
        self.assertIn(
            "https://fyp.example.com/reset-password#token=tok-reset-1",
            params["text"],
        )

    def test_email_from_env_overrides_sender(self):
        env = {**RESEND_ENV, "EMAIL_FROM": "noreply@verified-domain.test"}
        with patch.dict(os.environ, env), patch("resend.Emails.send") as send:
            send_verification_email("ali.67267@iqra.edu.pk", "tok-2")
        self.assertEqual(
            send.call_args.args[0]["from"], "noreply@verified-domain.test"
        )

    def test_resend_preferred_over_smtp(self):
        env = {
            **RESEND_ENV,
            "SMTP_HOST": "smtp.example.com", "SMTP_PORT": "587",
            "SMTP_USERNAME": "u", "SMTP_PASSWORD": "p",
            "SMTP_FROM": "no-reply@example.com",
        }
        with patch.dict(os.environ, env), \
                patch("resend.Emails.send") as send, \
                patch("app.email.smtplib.SMTP") as smtp:
            send_verification_email("ali.67267@iqra.edu.pk", "tok-3")

        send.assert_called_once()
        smtp.assert_not_called()

    def test_resend_failure_raises_generic_error_without_key(self):
        with patch.dict(os.environ, RESEND_ENV), patch(
            "resend.Emails.send",
            side_effect=RuntimeError(f"401 unauthorized key={API_KEY}"),
        ):
            with self.assertRaises(RuntimeError) as ctx:
                send_verification_email("ali.67267@iqra.edu.pk", "tok-4")

        # Provider errors (and the API key) never reach callers, logs,
        # or HTTP responses.
        self.assertEqual(str(ctx.exception), "Email provider rejected the message")
        self.assertNotIn(API_KEY, str(ctx.exception))
        self.assertNotIn("tok-4", str(ctx.exception))
        self.assertIsNone(ctx.exception.__cause__)


class RegistrationThroughResendTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def test_registration_sends_verification_via_resend(self):
        with patch.dict(os.environ, RESEND_ENV), patch(
            "resend.Emails.send"
        ) as send:
            response = main.create_student(StudentCreate(
                name="Test Student",
                email="ali.67267@iqra.edu.pk",
                university_id="67267",
                program="BSCS",
            ))

        self.assertIn("university email", response["message"].lower())
        send.assert_called_once()
        params = send.call_args.args[0]
        self.assertEqual(params["to"], ["ali.67267@iqra.edu.pk"])
        self.assertIn("#token=", params["text"])
        with SessionLocal() as db:
            self.assertEqual(db.query(models.PendingRegistration).count(), 1)
            # Only the token hash is stored, never the raw token.
            pending = db.query(models.PendingRegistration).one()
            self.assertNotIn("#token=", pending.token_hash)
            self.assertEqual(len(pending.token_hash), 64)

    def test_registration_returns_503_and_rolls_back_on_resend_failure(self):
        with patch.dict(os.environ, RESEND_ENV), patch(
            "resend.Emails.send",
            side_effect=RuntimeError("provider exploded"),
        ):
            with self.assertRaises(HTTPException) as ctx:
                main.create_student(StudentCreate(
                    name="Test Student",
                    email="ali.67267@iqra.edu.pk",
                    university_id="67267",
                    program="BSCS",
                ))

        self.assertEqual(ctx.exception.status_code, 503)
        detail = ctx.exception.detail
        self.assertEqual(detail, "Could not send verification email")
        self.assertNotIn(API_KEY, detail)
        self.assertNotIn("provider exploded", detail)
        with SessionLocal() as db:
            # Nothing is created when delivery fails.
            self.assertEqual(db.query(models.PendingRegistration).count(), 0)
            self.assertEqual(db.query(models.Student).count(), 0)


if __name__ == "__main__":
    unittest.main()
