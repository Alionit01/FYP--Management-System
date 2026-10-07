import io
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from fastapi import HTTPException, Request

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_test_directory.name}/security.sqlite"
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"

from app import main, models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.schemas import StudentCreate, StudentLogin, TeamCreate, VerificationRequest  # noqa: E402


class SecurityFlowTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        self.emails = []
        self.sender = patch.object(main, "send_verification_email", side_effect=self.capture_email)
        self.sender.start()

    def tearDown(self):
        self.sender.stop()
        Base.metadata.drop_all(engine)

    def capture_email(self, address, token):
        self.emails.append((address, token))

    def signup(self, local, university_id=None):
        return main.create_student(StudentCreate(
            name="Test Student", email=f"{local}@iqra.edu.pk",
            university_id=university_id or local.upper(), program="BSCS",
        ))

    def verified_student(self, local):
        self.signup(local)
        main.verify_email(VerificationRequest(token=self.emails[-1][1], password="password123"))
        with SessionLocal() as db:
            return db.query(models.Student).filter_by(email=f"{local}@iqra.edu.pk").first()

    def test_verification_delivered_only_to_mailbox_then_login_and_replay(self):
        output = io.StringIO()
        with redirect_stdout(output):
            response = self.signup("alice")
        token = self.emails[0][1]
        self.assertNotIn(token, str(response) + output.getvalue())
        self.assertFalse(any(route.path == "/verify-email" and "GET" in route.methods
                             for route in main.app.routes))
        self.assertNotIn("student_id", response)
        with SessionLocal() as db:
            self.assertEqual(db.query(models.Student).count(), 0)
            pending = db.query(models.PendingRegistration).one()
            self.assertNotEqual(pending.token_hash, token)
            self.assertNotIn("password", pending.student_data)

        request = Request({"type": "http", "headers": [], "client": ("127.0.0.1", 1234)})
        with self.assertRaises(HTTPException):
            main.login(StudentLogin(email="alice@iqra.edu.pk", password="password123"), request)
        main.verify_email(VerificationRequest(token=token, password="password123"))
        self.assertIn("access_token", main.login(
            StudentLogin(email="alice@iqra.edu.pk", password="password123"), request
        ))
        with self.assertRaises(HTTPException) as replay:
            main.verify_email(VerificationRequest(token=token, password="password123"))
        self.assertEqual(replay.exception.status_code, 400)

    def test_wrong_id_rejected_and_unverified_registration_cannot_reserve_id(self):
        with self.assertRaises(HTTPException) as mismatch:
            self.signup("attacker", university_id="VICTIM")
        self.assertEqual(mismatch.exception.status_code, 400)
        self.signup("victim")
        attacker_token = self.emails[-1][1]
        self.signup("victim")
        victim_token = self.emails[-1][1]
        self.assertNotEqual(attacker_token, victim_token)
        with SessionLocal() as db:
            self.assertEqual(db.query(models.Student).count(), 0)
        main.verify_email(VerificationRequest(token=victim_token, password="victims-password"))
        with self.assertRaises(HTTPException) as conflict:
            main.verify_email(VerificationRequest(token=attacker_token, password="attackers-password"))
        self.assertEqual(conflict.exception.status_code, 409)
        with SessionLocal() as db:
            student = db.query(models.Student).one()
            from app.auth import verify_password
            self.assertTrue(verify_password("victims-password", student.password))

    def test_verified_mailbox_reclaims_legacy_unverified_reservation(self):
        with SessionLocal() as db:
            db.add(models.Student(
                name="Unverified impostor", university_id="VICTIM",
                email="attacker@iqra.edu.pk", password="old-hash", program="BSCS",
                email_verified=False, verification_token="obsolete-legacy-token",
            ))
            db.commit()
        self.signup("victim")
        main.verify_email(VerificationRequest(token=self.emails[-1][1], password="victims-password"))
        with SessionLocal() as db:
            student = db.query(models.Student).one()
            self.assertEqual(student.email, "victim@iqra.edu.pk")
            self.assertTrue(student.email_verified)
            self.assertIsNone(student.verification_token)
            from app.auth import verify_password
            self.assertTrue(verify_password("victims-password", student.password))

    def test_expired_token_and_email_delivery_failure(self):
        self.signup("expired")
        token = self.emails[-1][1]
        with SessionLocal() as db:
            pending = db.query(models.PendingRegistration).one()
            pending.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            db.commit()
        with self.assertRaises(HTTPException) as expired:
            main.verify_email(VerificationRequest(token=token, password="password123"))
        self.assertEqual(expired.exception.status_code, 400)
        with patch.object(main, "send_verification_email", side_effect=OSError("SMTP unavailable")):
            with self.assertRaises(HTTPException) as failed:
                self.signup("failure")
        self.assertEqual(failed.exception.status_code, 503)
        with SessionLocal() as db:
            self.assertEqual(db.query(models.PendingRegistration).count(), 0)
            self.assertEqual(db.query(models.Student).count(), 0)

    def test_mailer_uses_tls_and_fragment_link(self):
        from app.email import send_verification_email
        config = {
            "SMTP_HOST": "smtp.example.com", "SMTP_PORT": "587",
            "SMTP_USERNAME": "smtp-user", "SMTP_PASSWORD": "smtp-password",
            "SMTP_FROM": "no-reply@example.com",
            "FRONTEND_URL": "https://fyp.example.com",
        }
        smtp = MagicMock()
        smtp.__enter__.return_value = smtp
        with patch.dict(os.environ, config), patch("app.email.smtplib.SMTP", return_value=smtp):
            send_verification_email("victim@iqra.edu.pk", "test-token")
        smtp.starttls.assert_called_once()
        smtp.login.assert_called_once_with("smtp-user", "smtp-password")
        message = smtp.send_message.call_args.args[0]
        self.assertIn("/verify-email#token=test-token", message.get_content())
        self.assertNotIn("/verify-email?token=", message.get_content())

    def test_team_membership_requires_target_acceptance(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        stranger = self.verified_student("stranger")
        created = main.create_team(TeamCreate(
            name="Test team", department_preference="Any", spots_available=1
        ), current_student=owner)
        team_id = created["team_id"]
        with self.assertRaises(HTTPException) as forbidden:
            main.invite_team_member(team_id, invitee.id, current_student=stranger)
        self.assertEqual(forbidden.exception.status_code, 403)
        main.invite_team_member(team_id, invitee.id, current_student=owner)
        invitation = main.get_my_invitations(current_student=invitee)[0]
        self.assertEqual(main.get_my_invitations(current_student=stranger), [])
        with SessionLocal() as db:
            self.assertIsNone(db.query(models.TeamMember).filter_by(student_id=invitee.id).first())
            self.assertEqual(db.get(models.Team, team_id).spots_available, 1)
        with self.assertRaises(HTTPException) as forbidden_accept:
            main.accept_invitation(invitation["id"], current_student=stranger)
        self.assertEqual(forbidden_accept.exception.status_code, 404)
        main.accept_invitation(invitation["id"], current_student=invitee)
        with SessionLocal() as db:
            self.assertIsNotNone(db.query(models.TeamMember).filter_by(student_id=invitee.id).first())
            self.assertEqual(db.get(models.Team, team_id).spots_available, 0)
        self.assertFalse(any(route.path == "/teams/{team_id}/members/{student_id}"
                             and "POST" in route.methods for route in main.app.routes))

    def test_invitee_can_decline_without_becoming_member(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        team_id = main.create_team(TeamCreate(
            name="Test team", department_preference="Any", spots_available=1
        ), current_student=owner)["team_id"]
        main.invite_team_member(team_id, invitee.id, current_student=owner)
        invitation_id = main.get_my_invitations(current_student=invitee)[0]["id"]
        main.decline_invitation(invitation_id, current_student=invitee)
        self.assertEqual(main.get_my_invitations(current_student=invitee), [])
        with SessionLocal() as db:
            self.assertIsNone(db.query(models.TeamMember).filter_by(student_id=invitee.id).first())


if __name__ == "__main__":
    unittest.main()
