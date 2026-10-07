import io
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_test_directory.name}/password_reset.sqlite"
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"

from app import main, models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.schemas import PasswordReset, PasswordResetRequest, StudentCreate, VerificationRequest  # noqa: E402
from app.auth import verify_password  # noqa: E402


class PasswordResetTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        self.emails = []
        self.verify_sender = patch.object(main, "send_verification_email", side_effect=self.capture_verify)
        self.reset_sender = patch.object(main, "send_password_reset_email", side_effect=self.capture_reset)
        self.verify_sender.start()
        self.reset_sender.start()

    def tearDown(self):
        self.verify_sender.stop()
        self.reset_sender.stop()
        Base.metadata.drop_all(engine)

    def capture_verify(self, address, token):
        self.emails.append(("verify", address, token))

    def capture_reset(self, address, token):
        self.emails.append(("reset", address, token))

    def verified_student(self, local="alice"):
        main.create_student(StudentCreate(
            name="Test Student", email=f"{local}@iqra.edu.pk",
            university_id=local.upper(), program="BSCS",
        ))
        token = self.emails[-1][2]
        main.verify_email(VerificationRequest(token=token, password="password123"))
        with SessionLocal() as db:
            return db.query(models.Student).filter_by(email=f"{local}@iqra.edu.pk").first()

    def test_request_reset_sends_email_and_stores_hash(self):
        self.verified_student()
        response = main.forgot_password(PasswordResetRequest(email="alice@iqra.edu.pk"))
        self.assertEqual(response["message"], "If that email is registered, a password reset link has been sent.")
        self.assertEqual(self.emails[-1][0], "reset")
        token = self.emails[-1][2]
        with SessionLocal() as db:
            row = db.query(models.PasswordResetToken).one()
            self.assertNotEqual(row.token_hash, token)
            self.assertNotIn("alice", row.token_hash)

    def test_reset_changes_password_and_token_is_single_use(self):
        self.verified_student()
        main.forgot_password(PasswordResetRequest(email="alice@iqra.edu.pk"))
        token = self.emails[-1][2]
        result = main.reset_password(PasswordReset(token=token, password="newpass123"))
        self.assertIn("Password updated", result["message"])
        with SessionLocal() as db:
            student = db.query(models.Student).filter_by(email="alice@iqra.edu.pk").one()
            self.assertTrue(verify_password("newpass123", student.password))
            self.assertEqual(db.query(models.PasswordResetToken).count(), 0)
        # Token cannot be reused
        from fastapi import HTTPException
        with self.assertRaises(HTTPException):
            main.reset_password(PasswordReset(token=token, password="another123"))

    def test_reset_rejects_invalid_token(self):
        self.verified_student()
        from fastapi import HTTPException
        with self.assertRaises(HTTPException):
            main.reset_password(PasswordReset(token="deadbeef" * 8, password="newpass123"))

    def test_forgot_password_does_not_leak_account_existence(self):
        response = main.forgot_password(PasswordResetRequest(email="ghost@iqra.edu.pk"))
        self.assertEqual(response["message"], "If that email is registered, a password reset link has been sent.")
        self.assertEqual(len(self.emails), 0)

    def test_new_request_invalidates_previous_token(self):
        self.verified_student()
        main.forgot_password(PasswordResetRequest(email="alice@iqra.edu.pk"))
        first = self.emails[-1][2]
        main.forgot_password(PasswordResetRequest(email="alice@iqra.edu.pk"))
        second = self.emails[-1][2]
        from fastapi import HTTPException
        with self.assertRaises(HTTPException):
            main.reset_password(PasswordReset(token=first, password="newpass123"))
        result = main.reset_password(PasswordReset(token=second, password="newpass123"))
        self.assertIn("Password updated", result["message"])

    def test_expired_token_rejected(self):
        self.verified_student()
        main.forgot_password(PasswordResetRequest(email="alice@iqra.edu.pk"))
        token = self.emails[-1][2]
        with SessionLocal() as db:
            row = db.query(models.PasswordResetToken).one()
            row.expires_at = datetime.now(timezone.utc) - timedelta(hours=2)
            db.commit()
        from fastapi import HTTPException
        with self.assertRaises(HTTPException):
            main.reset_password(PasswordReset(token=token, password="newpass123"))


if __name__ == "__main__":
    unittest.main()
