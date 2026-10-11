import asyncio
import os
import tempfile
import unittest

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = (
    f"sqlite+pysqlite:///{_test_directory.name}/directory.sqlite"
)
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"

from app import main, models  # noqa: E402
from app.auth import create_access_token, hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402


async def call_app(method: str, path: str, token=None):
    """Drive the real FastAPI ASGI app (routing, security, dependencies)
    without needing an HTTP client library."""
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path.split("?")[0],
        "raw_path": path.split("?")[0].encode(),
        "query_string": path.split("?")[1].encode() if "?" in path else b"",
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
    import json
    return status, (json.loads(body) if body else None)


def request(method: str, path: str, token=None):
    return asyncio.run(call_app(method, path, token=token))


def make_student(db, name, uid, email, whatsapp=None):
    student = models.Student(
        name=name,
        university_id=uid,
        email=email,
        password=hash_password("TestPassword123"),
        program="BSCS",
        email_verified=True,
        whatsapp=whatsapp,
    )
    db.add(student)
    db.commit()
    return student


class StudentDirectoryAuthTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        db = SessionLocal()
        try:
            self.alice = make_student(
                db, "Alice", "10001", "alice.10001@iqra.edu.pk",
                whatsapp="+92-300-1111111",
            )
            self.bob = make_student(
                db, "Bob", "10002", "bob.10002@iqra.edu.pk",
                whatsapp="+92-300-2222222",
            )
            self.carol = make_student(db, "Carol", "10003", "carol.10003@iqra.edu.pk")
            self.dave = make_student(db, "Dave", "10004", "dave.10004@iqra.edu.pk")
            self.alice_token = create_access_token(self.alice.id)
        finally:
            db.close()

    def tearDown(self):
        Base.metadata.drop_all(engine)

    # ---------- GET /students ----------

    def test_directory_rejects_missing_or_invalid_credentials(self):
        status, body = request("GET", "/students")
        self.assertEqual(status, 401)
        self.assertEqual(body["detail"], "Not authenticated")

        status, body = request("GET", "/students", token="not-a-real-token")
        self.assertEqual(status, 401)
        self.assertEqual(body["detail"], "Invalid authentication token")

    def test_directory_allows_authenticated_students_with_safe_fields_only(self):
        status, body = request("GET", "/students", token=self.alice_token)
        self.assertEqual(status, 200)
        self.assertIsInstance(body, list)
        self.assertEqual(len(body), 4)

        approved = set(main.DIRECTORY_FIELDS)
        for entry in body:
            self.assertIsInstance(entry, dict)
            self.assertEqual(set(entry.keys()), approved)
            for forbidden in (
                "password",
                "email",
                "whatsapp",
                "email_verified",
                "verification_token",
                "profile_completed",
            ):
                self.assertNotIn(forbidden, entry)

        # Spot-check content and ordering-neutral lookup.
        alice_entry = next(e for e in body if e["id"] == self.alice.id)
        self.assertEqual(alice_entry["name"], "Alice")
        self.assertEqual(alice_entry["university_id"], "10001")

    def test_directory_raw_orm_is_never_returned(self):
        # Direct call: results must be plain dicts, not ORM rows that
        # would serialize every column through FastAPI's encoders.
        db = SessionLocal()
        try:
            current = db.get(models.Student, self.alice.id)
            result = main.get_students(skip=0, limit=50, current_student=current)
        finally:
            db.close()
        self.assertTrue(all(isinstance(entry, dict) for entry in result))
        self.assertTrue(
            all("password" not in entry and "email" not in entry for entry in result)
        )

    def test_directory_pagination_params_still_work(self):
        status, body = request(
            "GET", "/students?skip=1&limit=1", token=self.alice_token
        )
        self.assertEqual(status, 200)
        self.assertEqual(len(body), 1)

    # ---------- GET /students/{id} ----------

    def test_profile_endpoint_requires_authentication(self):
        status, body = request("GET", f"/students/{self.bob.id}")
        self.assertEqual(status, 401)
        self.assertEqual(body["detail"], "Not authenticated")

        status, body = request(
            "GET", f"/students/{self.bob.id}", token="not-a-real-token"
        )
        self.assertEqual(status, 401)
        self.assertEqual(body["detail"], "Invalid authentication token")

    def test_profile_endpoint_excludes_private_fields(self):
        status, body = request(
            "GET", f"/students/{self.bob.id}", token=self.alice_token
        )
        self.assertEqual(status, 200)
        self.assertEqual(set(body.keys()), set(main.DIRECTORY_FIELDS))
        self.assertNotIn("password", body)
        self.assertNotIn("email", body)
        self.assertNotIn("whatsapp", body)

        status, body = request(
            "GET", "/students/999999", token=self.alice_token
        )
        self.assertEqual(status, 404)

    # ---------- GET /students/{id}/contact ----------

    def test_contact_requires_authentication(self):
        status, body = request("GET", f"/students/{self.bob.id}/contact")
        self.assertEqual(status, 401)

        status, body = request(
            "GET", f"/students/{self.bob.id}/contact", token="garbage"
        )
        self.assertEqual(status, 401)

    def test_contact_denied_for_unrelated_students(self):
        # Carol and Alice share no team and no invitation.
        status, body = request(
            "GET", f"/students/{self.carol.id}/contact",
            token=create_access_token(self.alice.id),
        )
        self.assertEqual(status, 403)
        self.assertIn("invitation", body["detail"].lower())

    def test_contact_allowed_for_self_and_teammates(self):
        # Self
        status, body = request(
            "GET", f"/students/{self.alice.id}/contact",
            token=create_access_token(self.alice.id),
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["email"], "alice.10001@iqra.edu.pk")
        self.assertEqual(body["whatsapp"], "+92-300-1111111")

        # Teammates: Alice and Bob join the same team.
        db = SessionLocal()
        try:
            team = models.Team(
                name="Team Alpha",
                department_preference="BSCS",
                spots_available=2,
                created_by=self.alice.id,
            )
            db.add(team)
            db.commit()
            for student in (self.alice, self.bob):
                db.add(models.TeamMember(team_id=team.id, student_id=student.id))
            db.commit()
        finally:
            db.close()

        status, body = request(
            "GET", f"/students/{self.bob.id}/contact",
            token=create_access_token(self.alice.id),
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["email"], "bob.10002@iqra.edu.pk")

        # Dave is on no team with Alice -> still denied.
        status, body = request(
            "GET", f"/students/{self.dave.id}/contact",
            token=create_access_token(self.alice.id),
        )
        self.assertEqual(status, 403)

    def test_contact_allowed_when_invitation_exists_either_direction(self):
        db = SessionLocal()
        try:
            team = models.Team(
                name="Team Beta",
                department_preference="BSCS",
                spots_available=3,
                created_by=self.bob.id,
            )
            db.add(team)
            db.commit()
            # Bob (team owner) invited Carol.
            db.add(models.TeamInvitation(
                team_id=team.id, student_id=self.carol.id, invited_by=self.bob.id
            ))
            db.commit()
        finally:
            db.close()

        # Invitee (Carol) may see inviter's (Bob's) contact.
        status, body = request(
            "GET", f"/students/{self.bob.id}/contact",
            token=create_access_token(self.carol.id),
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["email"], "bob.10002@iqra.edu.pk")

        # Inviter (Bob) may see invitee's (Carol's) contact.
        status, body = request(
            "GET", f"/students/{self.carol.id}/contact",
            token=create_access_token(self.bob.id),
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["email"], "carol.10003@iqra.edu.pk")

        # Dave has no invitation and no shared team -> denied.
        status, body = request(
            "GET", f"/students/{self.carol.id}/contact",
            token=create_access_token(self.dave.id),
        )
        self.assertEqual(status, 403)

    def test_contact_unknown_student_is_404(self):
        status, body = request(
            "GET", "/students/999999/contact",
            token=create_access_token(self.alice.id),
        )
        self.assertEqual(status, 404)

    def test_may_view_contact_relationship_matrix(self):
        db = SessionLocal()
        try:
            self.assertTrue(main._may_view_contact(db, self.alice.id, self.alice.id))
            self.assertFalse(main._may_view_contact(db, self.alice.id, self.bob.id))

            team_a = models.Team(
                name="Team Gamma", department_preference="BSCS",
                spots_available=4, created_by=self.alice.id,
            )
            team_b = models.Team(
                name="Team Delta", department_preference="BSCS",
                spots_available=4, created_by=self.carol.id,
            )
            db.add_all([team_a, team_b])
            db.commit()
            db.add_all([
                models.TeamMember(team_id=team_a.id, student_id=self.alice.id),
                models.TeamMember(team_id=team_a.id, student_id=self.bob.id),
                models.TeamMember(team_id=team_b.id, student_id=self.carol.id),
            ])
            db.commit()

            self.assertTrue(main._may_view_contact(db, self.alice.id, self.bob.id))
            self.assertTrue(main._may_view_contact(db, self.bob.id, self.alice.id))
            # Same "in a team" but different teams -> no access.
            self.assertFalse(main._may_view_contact(db, self.alice.id, self.carol.id))
        finally:
            db.close()


class TeamContactAuthTests(unittest.TestCase):
    """GET /teams/{id}/contact: members and invited students only."""

    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        db = SessionLocal()
        try:
            self.owner = make_student(
                db, "Owner", "20001", "owner.20001@iqra.edu.pk"
            )
            self.member = make_student(
                db, "Member", "20002", "member.20002@iqra.edu.pk"
            )
            self.invitee = make_student(
                db, "Invitee", "20003", "invitee.20003@iqra.edu.pk"
            )
            self.stranger = make_student(
                db, "Stranger", "20004", "stranger.20004@iqra.edu.pk"
            )
            # Other-team-only student: in a team, but not THIS team.
            self.other_team_member = make_student(
                db, "Elsewhere", "20005", "elsewhere.20005@iqra.edu.pk"
            )

            self.team = models.Team(
                name="Contact Team",
                department_preference="BSCS",
                spots_available=3,
                created_by=self.owner.id,
                contact="owner-wa-number",
            )
            db.add(self.team)
            db.commit()
            # Mirror create_team: the creator is always the first member.
            db.add_all([
                models.TeamMember(team_id=self.team.id, student_id=self.owner.id),
                models.TeamMember(team_id=self.team.id, student_id=self.member.id),
            ])
            # Pending invitation: owner invited invitee to this team.
            db.add(models.TeamInvitation(
                team_id=self.team.id,
                student_id=self.invitee.id,
                invited_by=self.owner.id,
            ))
            # A different team the stranger belongs to.
            other_team = models.Team(
                name="Other Team",
                department_preference="BSCS",
                spots_available=3,
                created_by=self.other_team_member.id,
            )
            db.add(other_team)
            db.commit()
            self.other_team_id = other_team.id
            db.add(models.TeamMember(
                team_id=other_team.id,
                student_id=self.other_team_member.id,
            ))
            db.commit()
        finally:
            db.close()

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def fetch_contact(self, student, team_id=None):
        team_id = team_id or self.team.id
        return request(
            "GET", f"/teams/{team_id}/contact",
            token=create_access_token(student.id),
        )

    def test_requires_authentication(self):
        status, body = request("GET", f"/teams/{self.team.id}/contact")
        self.assertEqual(status, 401)
        self.assertEqual(body["detail"], "Not authenticated")

        status, body = request(
            "GET", f"/teams/{self.team.id}/contact", token="garbage"
        )
        self.assertEqual(status, 401)

    def test_owner_and_member_can_view(self):
        for student in (self.owner, self.member):
            status, body = self.fetch_contact(student)
            self.assertEqual(status, 200)
            self.assertEqual(body["contact"], "owner-wa-number")

    def test_invited_student_can_view(self):
        status, body = self.fetch_contact(self.invitee)
        self.assertEqual(status, 200)
        self.assertEqual(body["contact"], "owner-wa-number")

    def test_stranger_is_denied(self):
        status, body = self.fetch_contact(self.stranger)
        self.assertEqual(status, 403)
        self.assertIn("members", body["detail"].lower())

    def test_member_of_another_team_is_denied(self):
        # Being on some team must not grant access to every team.
        status, body = self.fetch_contact(self.other_team_member)
        self.assertEqual(status, 403)

    def test_invitation_to_other_team_does_not_leak_this_team(self):
        # The stranger is invited to the OTHER team; that must not
        # unlock THIS team's contact.
        db = SessionLocal()
        try:
            db.add(models.TeamInvitation(
                team_id=self.other_team_id,
                student_id=self.stranger.id,
                invited_by=self.other_team_member.id,
            ))
            db.commit()
        finally:
            db.close()

        status, body = self.fetch_contact(
            self.stranger, team_id=self.other_team_id
        )
        self.assertEqual(status, 200)  # invited to that one: allowed

        status, body = self.fetch_contact(self.stranger)
        self.assertEqual(status, 403)  # still no access to THIS team

    def test_unknown_team_is_404(self):
        status, body = self.fetch_contact(self.owner, team_id=999999)
        self.assertEqual(status, 404)

    def test_may_view_team_contact_matrix(self):
        db = SessionLocal()
        try:
            self.assertTrue(
                main._may_view_team_contact(db, self.team.id, self.owner.id)
            )
            self.assertTrue(
                main._may_view_team_contact(db, self.team.id, self.member.id)
            )
            self.assertTrue(
                main._may_view_team_contact(db, self.team.id, self.invitee.id)
            )
            self.assertFalse(
                main._may_view_team_contact(db, self.team.id, self.stranger.id)
            )
            self.assertFalse(
                main._may_view_team_contact(
                    db, self.team.id, self.other_team_member.id
                )
            )
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
