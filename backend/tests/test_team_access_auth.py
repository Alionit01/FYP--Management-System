import asyncio
import json
import os
import tempfile
import unittest

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = (
    f"sqlite+pysqlite:///{_test_directory.name}/team_access.sqlite"
)
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"
# Never inherit the pilot flag from a developer .env: these suites
# exercise the default (pilot off) flow. Tests that need the pilot on
# opt in explicitly with patch.dict(). setdefault keeps an explicitly
# exported value (e.g. PILOT_ONBOARDING_ENABLED=true) authoritative.
os.environ.setdefault("PILOT_ONBOARDING_ENABLED", "false")

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


# Fields a signed-in student may see in a team payload.
TEAM_PUBLIC_FIELDS = {
    "id",
    "name",
    "project_title",
    "description",
    "department_preference",
    "spots_available",
    "skills_needed",
    "roles_needed",
    "created_by",
}
MEMBER_PUBLIC_FIELDS = {
    "id",
    "name",
    "program",
    "university_id",
    "profile_picture",
}
# Private columns that must never appear in team responses.
PRIVATE_FIELDS = (
    "password",
    "email",
    "whatsapp",
    "email_verified",
    "verification_token",
    "profile_completed",
)


def make_student(db, name, uid, email):
    student = models.Student(
        name=name,
        university_id=uid,
        email=email,
        password=hash_password("TestPassword123"),
        program="BSCS",
        email_verified=True,
    )
    db.add(student)
    db.commit()
    return student


class TeamAccessAuthTests(unittest.TestCase):
    """GET /teams/{id} and GET /teams/{id}/members require a sign-in."""

    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        db = SessionLocal()
        try:
            self.owner = make_student(
                db, "Owner", "30001", "owner.30001@iqra.edu.pk"
            )
            self.member = make_student(
                db, "Member", "30002", "member.30002@iqra.edu.pk"
            )
            self.outsider = make_student(
                db, "Outsider", "30003", "outsider.30003@iqra.edu.pk"
            )
            self.team = models.Team(
                name="Team Alpha",
                project_title="FYP project",
                department_preference="BSCS",
                spots_available=2,
                created_by=self.owner.id,
            )
            db.add(self.team)
            db.commit()
            db.add_all([
                models.TeamMember(team_id=self.team.id, student_id=self.owner.id),
                models.TeamMember(team_id=self.team.id, student_id=self.member.id),
            ])
            db.commit()
        finally:
            db.close()
        self.owner_token = create_access_token(self.owner.id)
        self.outsider_token = create_access_token(self.outsider.id)

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def assert_only_public_fields(self, payload):
        for forbidden in PRIVATE_FIELDS:
            self.assertNotIn(forbidden, json.dumps(payload))

    # ---------- GET /teams/{team_id} ----------

    def test_team_detail_requires_authentication(self):
        status, body = request("GET", f"/teams/{self.team.id}")
        self.assertEqual(status, 401)
        self.assertEqual(body["detail"], "Not authenticated")

        status, body = request(
            "GET", f"/teams/{self.team.id}", token="not-a-real-token"
        )
        self.assertEqual(status, 401)
        self.assertEqual(body["detail"], "Invalid authentication token")

    def test_team_detail_allows_any_signed_in_student_with_safe_fields(self):
        # Any authenticated student may browse team details, like
        # the student directory; membership is not required.
        status, body = request(
            "GET", f"/teams/{self.team.id}", token=self.outsider_token
        )
        self.assertEqual(status, 200)
        self.assertEqual(
            set(body.keys()), TEAM_PUBLIC_FIELDS | {"members"}
        )
        self.assertEqual(body["name"], "Team Alpha")
        self.assertEqual(len(body["members"]), 2)
        for entry in body["members"]:
            self.assertEqual(set(entry.keys()), MEMBER_PUBLIC_FIELDS)
        self.assert_only_public_fields(body)

        member_ids = {entry["id"] for entry in body["members"]}
        self.assertEqual(
            member_ids, {self.owner.id, self.member.id}
        )

    def test_team_detail_unknown_team_is_404(self):
        status, _ = request("GET", "/teams/999999", token=self.owner_token)
        self.assertEqual(status, 404)

    # ---------- GET /teams/{team_id}/members ----------

    def test_team_members_requires_authentication(self):
        status, body = request("GET", f"/teams/{self.team.id}/members")
        self.assertEqual(status, 401)
        self.assertEqual(body["detail"], "Not authenticated")

        status, body = request(
            "GET", f"/teams/{self.team.id}/members", token="garbage"
        )
        self.assertEqual(status, 401)

    def test_team_members_returns_only_roster_with_safe_fields(self):
        status, body = request(
            "GET", f"/teams/{self.team.id}/members",
            token=self.outsider_token,
        )
        self.assertEqual(status, 200)
        self.assertIsInstance(body, list)
        self.assertEqual(len(body), 2)
        for entry in body:
            self.assertEqual(set(entry.keys()), MEMBER_PUBLIC_FIELDS)
        self.assert_only_public_fields(body)

        member_ids = {entry["id"] for entry in body}
        self.assertEqual(member_ids, {self.owner.id, self.member.id})
        # The outsider's own record must not leak into the roster.
        self.assertNotIn(self.outsider.id, member_ids)

    def test_team_members_unknown_team_is_404(self):
        status, _ = request(
            "GET", "/teams/999999/members", token=self.owner_token
        )
        self.assertEqual(status, 404)


if __name__ == "__main__":
    unittest.main()
