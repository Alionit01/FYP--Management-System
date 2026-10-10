import os
import tempfile
import unittest
from unittest.mock import patch

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_test_directory.name}/profile_completion.sqlite"
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"

from fastapi import HTTPException  # noqa: E402

from app import main, models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.schemas import (  # noqa: E402
    StudentCreate,
    StudentUpdate,
    TeamCreate,
    VerificationRequest,
)


class ProfileCompletionTests(unittest.TestCase):
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

    def verified_student(self, local="alice"):
        main.create_student(StudentCreate(
            name="Test Student", email=f"{local}@iqra.edu.pk",
            university_id=local.upper(), program="BSCS",
        ))
        main.verify_email(VerificationRequest(
            token=self.emails[-1][1], password="password123"
        ))
        with SessionLocal() as db:
            return db.query(models.Student).filter_by(
                email=f"{local}@iqra.edu.pk"
            ).first()

    def complete_profile_payload(self):
        # A profile picture is optional; skills + status are required.
        return StudentUpdate(
            name="Test Student",
            program="BSCS",
            skills="Python, React",
            fyp_status="Looking for a team",
        )

    def test_new_student_starts_incomplete(self):
        student = self.verified_student()
        profile = main.get_my_profile(current_student=student)
        self.assertFalse(profile["profile_completed"])

    def test_partial_save_does_not_complete_profile(self):
        student = self.verified_student()
        result = main.update_my_profile(
            StudentUpdate(
                name="Test Student", program="BSCS",
                profile_picture="data:image/png;base64,iVBORw0KGgo=",
            ),
            current_student=student,
        )
        self.assertFalse(result["profile"]["profile_completed"])

    def test_full_save_flips_flag_true(self):
        student = self.verified_student()
        result = main.update_my_profile(
            self.complete_profile_payload(), current_student=student
        )
        # No profile picture included: it is optional.
        self.assertIsNone(result["profile"]["profile_picture"])
        self.assertTrue(result["profile"]["profile_completed"])
        with SessionLocal() as db:
            self.assertTrue(
                db.get(models.Student, student.id).profile_completed
            )

    def test_grandfathered_profile_never_downgrades(self):
        student = self.verified_student()
        with SessionLocal() as db:
            db.query(models.Student).filter_by(id=student.id).update(
                {models.Student.profile_completed: True}
            )
            db.commit()
            student = db.get(models.Student, student.id)
        result = main.update_my_profile(
            StudentUpdate(name="Test Student", program="BSCS"),
            current_student=student,
        )
        self.assertTrue(result["profile"]["profile_completed"])

    def test_create_team_blocked_until_profile_complete(self):
        student = self.verified_student()
        with self.assertRaises(HTTPException) as blocked:
            main.create_team(
                TeamCreate(name="Team", department_preference="Any", spots_available=1),
                current_student=student,
            )
        self.assertEqual(blocked.exception.status_code, 403)

        main.update_my_profile(
            self.complete_profile_payload(), current_student=student
        )
        with SessionLocal() as db:
            student = db.get(models.Student, student.id)
        created = main.create_team(
            TeamCreate(name="Team", department_preference="Any", spots_available=1),
            current_student=student,
        )
        self.assertIn("team_id", created)
