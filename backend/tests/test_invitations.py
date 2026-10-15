"""The team invitation system, end to end.

An invitation is a proposal the invitee can accept, decline or let
lapse — so both sides need to be able to see and undo it:

  * the invitee gets an inbox entry with enough context to decide
    (who invited them, how big the team is, when the offer lapses),
  * the owner gets a sent list, plus revoke and resend, instead of
    sending invitations into a void,
  * an invitation expires, so nobody is left holding a months-old
    maybe that can still change a team at any moment,
  * a pending invitation holds its spot, so a team with one place
    left cannot promise it to five people at once.
"""

import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

from unittest.mock import patch

from fastapi import HTTPException

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_test_directory.name}/invitations.sqlite"
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"
os.environ.setdefault("PILOT_ONBOARDING_ENABLED", "false")

from app import main, models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.schemas import StudentCreate, TeamCreate, VerificationRequest  # noqa: E402


class InvitationTestCase(unittest.TestCase):
    """Shared fixtures: verified students, teams, and helpers to bend
    an invitation's clock without touching the code under test."""

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

    def signup(self, local, university_id=None, name=None):
        return main.create_student(StudentCreate(
            name=name or f"Student {local.title()}", email=f"{local}@iqra.edu.pk",
            university_id=university_id or local.upper(), program="BSCS",
        ))

    def verified_student(self, local, university_id=None, name=None):
        self.signup(local, university_id=university_id, name=name)
        main.verify_email(VerificationRequest(token=self.emails[-1][1], password="password123"))
        with SessionLocal() as db:
            return db.query(models.Student).filter_by(email=f"{local}@iqra.edu.pk").first()

    def complete_profiles(self, *students):
        with SessionLocal() as db:
            for student in students:
                db.query(models.Student).filter_by(id=student.id).update(
                    {models.Student.profile_completed: True}
                )
            db.commit()
            return [db.get(models.Student, student.id) for student in students]

    def make_team(self, owner, spots=2, name="Test team"):
        return main.create_team(TeamCreate(
            name=name, department_preference="Any", spots_available=spots
        ), current_student=owner)["team_id"]

    def force_expiry(self, invitation_id, when):
        with SessionLocal() as db:
            db.query(models.TeamInvitation).filter_by(id=invitation_id).update({
                models.TeamInvitation.expires_at: when,
            })
            db.commit()

    def invite(self, team_id, owner, invitee):
        main.invite_team_member(team_id, invitee.id, current_student=owner)
        return next(
            row["id"] for row in main.get_my_invitations(current_student=invitee)
            if row["team_id"] == team_id
        )

    def invitation_rows(self):
        with SessionLocal() as db:
            return db.query(models.TeamInvitation).count()

    def member_ids(self, team_id):
        with SessionLocal() as db:
            return sorted(
                row.student_id for row in db.query(models.TeamMember).filter_by(
                    team_id=team_id
                )
            )


class InboxTests(InvitationTestCase):
    """GET /my-invitations: enough context to actually decide."""

    def test_inbox_entry_describes_the_team_and_the_inviter(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner, spots=2, name="Signal Processors")

        self.invite(team_id, owner, invitee)

        entries = main.get_my_invitations(current_student=invitee)
        self.assertEqual(len(entries), 1)
        entry = entries[0]

        self.assertEqual(entry["team_name"], "Signal Processors")
        self.assertEqual(entry["member_count"], 1)
        self.assertEqual(entry["spots_available"], 2)
        self.assertEqual(entry["inviter"]["id"], owner.id)
        self.assertEqual(entry["inviter"]["name"], owner.name)
        self.assertEqual(entry["days_remaining"], models.INVITATION_TTL_DAYS)
        self.assertTrue(entry["created_at"])
        self.assertTrue(entry["expires_at"])

    def test_newest_invitation_is_listed_first(self):
        owner_a = self.verified_student("ownera")
        owner_b = self.verified_student("ownerb")
        invitee = self.verified_student("invitee")
        owner_a, owner_b, invitee = self.complete_profiles(owner_a, owner_b, invitee)

        team_a = self.make_team(owner_a, name="Team A")
        team_b = self.make_team(owner_b, name="Team B")
        self.invite(team_a, owner_a, invitee)
        self.invite(team_b, owner_b, invitee)

        entries = main.get_my_invitations(current_student=invitee)
        self.assertEqual(
            [entry["team_name"] for entry in entries],
            ["Team B", "Team A"],
        )

    def test_strangers_see_nothing(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        stranger = self.verified_student("stranger")
        owner, invitee, stranger = self.complete_profiles(owner, invitee, stranger)
        team_id = self.make_team(owner)

        self.invite(team_id, owner, invitee)
        self.assertEqual(main.get_my_invitations(current_student=stranger), [])


class ExpiryTests(InvitationTestCase):
    """An invitation that nobody acted on must stop mattering."""

    def test_expired_invitation_is_hidden_from_the_inbox(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner)
        invitation_id = self.invite(team_id, owner, invitee)

        self.force_expiry(invitation_id, datetime.now(timezone.utc) - timedelta(minutes=1))

        self.assertEqual(main.get_my_invitations(current_student=invitee), [])

    def test_expired_invitation_cannot_be_accepted(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner)
        invitation_id = self.invite(team_id, owner, invitee)

        self.force_expiry(invitation_id, datetime.now(timezone.utc) - timedelta(minutes=1))

        with self.assertRaises(HTTPException) as rejected:
            main.accept_invitation(invitation_id, current_student=invitee)
        self.assertEqual(rejected.exception.status_code, 409)
        self.assertIn("expired", rejected.exception.detail.lower())
        self.assertEqual(self.member_ids(team_id), [owner.id])

    def test_expired_invitation_stops_granting_contact_access(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner)
        invitation_id = self.invite(team_id, owner, invitee)

        # While it is live, both sides may see each other's contact so
        # the invitee can decide.
        self.assertTrue(main._may_view_contact(
            SessionLocal(), owner.id, invitee.id))
        self.assertTrue(main._may_view_team_contact(
            SessionLocal(), team_id, invitee.id))

        self.force_expiry(invitation_id, datetime.now(timezone.utc) - timedelta(minutes=1))

        db = SessionLocal()
        try:
            self.assertFalse(main._may_view_contact(db, owner.id, invitee.id))
            self.assertFalse(main._may_view_team_contact(db, team_id, invitee.id))
        finally:
            db.close()

    def test_expired_invitation_frees_the_team_to_invite_someone_else(self):
        owner = self.verified_student("owner")
        first = self.verified_student("first")
        second = self.verified_student("second")
        owner, first, second = self.complete_profiles(owner, first, second)
        # One advertised spot: only one of these two can ever join.
        team_id = self.make_team(owner, spots=1)
        invitation_id = self.invite(team_id, owner, first)

        with self.assertRaises(HTTPException) as blocked:
            self.invite(team_id, owner, second)
        self.assertEqual(blocked.exception.status_code, 409)
        self.assertIn("promised", blocked.exception.detail.lower())

        self.force_expiry(invitation_id, datetime.now(timezone.utc) - timedelta(minutes=1))

        # The lapsed invitation no longer holds the spot, so re-inviting
        # the same student is a fresh invitation with a new deadline
        # rather than a unique-constraint error.
        self.invite(team_id, owner, first)
        entries = main.get_my_invitations(current_student=first)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["days_remaining"], models.INVITATION_TTL_DAYS)

        # ...but that one open spot is now promised again, so the other
        # student has to wait until it is free.
        with self.assertRaises(HTTPException) as blocked:
            self.invite(team_id, owner, second)
        self.assertEqual(blocked.exception.status_code, 409)
        self.assertIn("promised", blocked.exception.detail.lower())
        self.assertEqual(main.get_my_invitations(current_student=second), [])


class CapacityTests(InvitationTestCase):
    """A spot promised to one student cannot be promised to another."""

    def test_pending_invitations_hold_their_spots(self):
        owner = self.verified_student("owner")
        invitees = [self.verified_student(f"invitee{n}") for n in range(4)]
        owner, *invitees = self.complete_profiles(owner, *invitees)
        team_id = self.make_team(owner, spots=3)

        for invitee in invitees[:3]:
            self.invite(team_id, owner, invitee)

        with self.assertRaises(HTTPException) as blocked:
            self.invite(team_id, owner, invitees[3])
        self.assertEqual(blocked.exception.status_code, 409)
        self.assertIn("promised", blocked.exception.detail.lower())
        self.assertEqual(len(main.get_my_invitations(current_student=invitees[3])), 0)

    def test_declining_frees_the_promised_spot(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        other = self.verified_student("other")
        third = self.verified_student("third")
        fourth = self.verified_student("fourth")
        owner, invitee, other, third, fourth = self.complete_profiles(
            owner, invitee, other, third, fourth
        )
        team_id = self.make_team(owner, spots=3)

        # Fill all three open places with pending invitations.
        for invitee_ in (invitee, other, third):
            self.invite(team_id, owner, invitee_)

        with self.assertRaises(HTTPException):
            self.invite(team_id, owner, fourth)

        invitation_id = next(
            row["id"] for row in main.get_my_invitations(current_student=invitee)
        )
        main.decline_invitation(invitation_id, current_student=invitee)

        self.invite(team_id, owner, fourth)

    def test_team_with_no_advertised_spots_cannot_invite(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner, spots=0)

        with self.assertRaises(HTTPException) as blocked:
            self.invite(team_id, owner, invitee)
        self.assertEqual(blocked.exception.status_code, 400)
        self.assertIn("no open spots", blocked.exception.detail.lower())


class SentInvitationTests(InvitationTestCase):
    """GET /teams/{id}/invitations, revoke and resend — the owner's side."""

    def test_owner_sees_who_they_invited(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner)

        self.invite(team_id, owner, invitee)

        listing = main.list_team_invitations(team_id, current_student=owner)
        self.assertEqual(len(listing["invitations"]), 1)
        entry = listing["invitations"][0]
        self.assertEqual(entry["status"], "pending")
        self.assertEqual(entry["days_remaining"], models.INVITATION_TTL_DAYS)
        self.assertEqual(entry["student"]["name"], invitee.name)
        self.assertEqual(entry["student"]["id"], invitee.id)
        self.assertNotIn("password", entry["student"])
        self.assertNotIn("email", entry["student"])
        self.assertEqual(listing["member_count"], 1)
        self.assertEqual(listing["open_invitations"], 1)
        self.assertEqual(listing["invitable_spots"], 2)

    def test_expired_invitation_is_labelled_and_not_counted_as_open(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner)
        invitation_id = self.invite(team_id, owner, invitee)

        self.force_expiry(invitation_id, datetime.now(timezone.utc) - timedelta(minutes=1))

        listing = main.list_team_invitations(team_id, current_student=owner)
        self.assertEqual(len(listing["invitations"]), 1)
        self.assertEqual(listing["invitations"][0]["status"], "expired")
        self.assertEqual(listing["open_invitations"], 0)
        self.assertEqual(listing["invitations"][0]["days_remaining"], 0)

    def test_only_the_owner_can_see_or_manage_sent_invitations(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        stranger = self.verified_student("stranger")
        owner, invitee, stranger = self.complete_profiles(owner, invitee, stranger)
        team_id = self.make_team(owner)
        invitation_id = self.invite(team_id, owner, invitee)

        for attempt in (
            lambda: main.list_team_invitations(team_id, current_student=stranger),
            lambda: main.revoke_team_invitation(team_id, invitation_id, current_student=stranger),
            lambda: main.resend_team_invitation(invitation_id, current_student=stranger),
            lambda: main.invitation_candidates(team_id, current_student=stranger),
        ):
            with self.assertRaises(HTTPException) as rejected:
                attempt()
            self.assertEqual(rejected.exception.status_code, 403)

    def test_revoke_removes_the_invitation_from_both_sides(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner)
        invitation_id = self.invite(team_id, owner, invitee)

        response = main.revoke_team_invitation(team_id, invitation_id, current_student=owner)
        self.assertIn("revoked", response["message"].lower())

        self.assertEqual(main.get_my_invitations(current_student=invitee), [])
        self.assertEqual(
            main.list_team_invitations(team_id, current_student=owner)["invitations"], []
        )
        self.assertEqual(self.invitation_rows(), 0)

        with self.assertRaises(HTTPException) as gone:
            main.revoke_team_invitation(team_id, invitation_id, current_student=owner)
        self.assertEqual(gone.exception.status_code, 404)

        # The invitee never joined, and the spot is free again.
        self.assertEqual(self.member_ids(team_id), [owner.id])

    def test_resend_gives_a_lapsed_invitation_a_new_deadline(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner)
        invitation_id = self.invite(team_id, owner, invitee)

        self.force_expiry(invitation_id, datetime.now(timezone.utc) - timedelta(days=3))
        self.assertEqual(main.get_my_invitations(current_student=invitee), [])

        response = main.resend_team_invitation(invitation_id, current_student=owner)
        self.assertEqual(response["invitation"]["status"], "pending")
        self.assertEqual(response["invitation"]["days_remaining"], models.INVITATION_TTL_DAYS)

        entries = main.get_my_invitations(current_student=invitee)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["id"], invitation_id)
        # Accepting works again once the deadline has been renewed.
        main.accept_invitation(entries[0]["id"], current_student=invitee)
        self.assertIn(invitee.id, self.member_ids(team_id))

    def test_resend_refuses_when_the_invitee_joined_another_team(self):
        owner = self.verified_student("owner")
        other_owner = self.verified_student("otherowner")
        invitee = self.verified_student("invitee")
        owner, other_owner, invitee = self.complete_profiles(owner, other_owner, invitee)
        team_id = self.make_team(owner)
        other_team = self.make_team(other_owner, name="Other team")
        invitation_id = self.invite(team_id, owner, invitee)
        main.accept_invitation(
            self.invite(other_team, other_owner, invitee), current_student=invitee
        )

        with self.assertRaises(HTTPException) as rejected:
            main.resend_team_invitation(invitation_id, current_student=owner)
        self.assertEqual(rejected.exception.status_code, 409)
        self.assertIn("another team", rejected.exception.detail.lower())

    def test_revoking_a_fresh_invitation_and_resending_works(self):
        owner = self.verified_student("owner")
        invitee = self.verified_student("invitee")
        owner, invitee = self.complete_profiles(owner, invitee)
        team_id = self.make_team(owner)
        invitation_id = self.invite(team_id, owner, invitee)

        main.revoke_team_invitation(team_id, invitation_id, current_student=owner)
        self.invite(team_id, owner, invitee)
        self.assertEqual(len(main.get_my_invitations(current_student=invitee)), 1)


class CandidateSearchTests(InvitationTestCase):
    """The owner needs to find a person, not scroll a dropdown."""

    def setUp(self):
        super().setUp()
        self.owner = self.complete_profiles(self.verified_student("owner"))[0]
        self.team_id = self.make_team(self.owner)
        self.free = self.complete_profiles(
            self.verified_student("2024cs007", name="Alicia Free")
        )[0]
        self.busy = self.complete_profiles(self.verified_student("busy"))[0]
        self.lapsed = self.complete_profiles(self.verified_student("lapsed"))[0]
        self.unverified = self.signup("pending")  # never verified

        # `busy` is already on another team; `lapsed` was invited here
        # and let the invitation run out, which is exactly the case the
        # old dropdown got wrong.
        other_owner = self.complete_profiles(self.verified_student("otherowner"))[0]
        other_team = self.make_team(other_owner, name="Other team")
        with SessionLocal() as db:
            db.add(models.TeamMember(team_id=other_team, student_id=self.busy.id))
            db.commit()

        lapsed_id = self.invite(self.team_id, self.owner, self.lapsed)
        self.force_expiry(lapsed_id, datetime.now(timezone.utc) - timedelta(minutes=1))

    def results(self, query=""):
        return main.invitation_candidates(
            self.team_id, query=query, current_student=self.owner
        )["results"]

    def test_every_candidate_carries_a_status_the_owner_can_act_on(self):
        statuses = {row["name"]: row["status"] for row in self.results()}
        self.assertEqual(statuses[self.free.name], "invitable")
        self.assertEqual(statuses[self.busy.name], "in-team")
        self.assertEqual(statuses[self.lapsed.name], "invitable")
        # Unverified sign-ups never reach the directory, so they cannot
        # be invited either.
        self.assertNotIn("Student Pending", statuses)
        self.assertNotIn(self.owner.name, statuses)

    def test_invitable_students_are_ranked_first(self):
        statuses = [row["status"] for row in self.results()]
        self.assertEqual(statuses, sorted(
            statuses, key=lambda status: {"invitable": 0, "invited": 1, "in-team": 2}[status]
        ))

    def test_search_matches_name_program_and_university_id(self):
        # By surname (name column).
        self.assertEqual(
            [row["id"] for row in self.results(query="Free")],
            [self.free.id],
        )
        # By university id — which, per the signup rule, is also the
        # email local part, so "Alicia Free" must not match it by name.
        self.assertEqual(
            [row["id"] for row in self.results(query="2024cs007")],
            [self.free.id],
        )
        # By program: every cohort member shares BSCS.
        found = {row["id"] for row in self.results(query="BSCS")}
        self.assertTrue(
            {self.free.id, self.busy.id, self.lapsed.id} <= found,
            f"expected the three fixtures in {found}",
        )
        self.assertEqual(self.results(query="nobody-at-all"), [])

    def test_an_active_invitation_is_labelled_rather_than_hidden(self):
        self.invite(self.team_id, self.owner, self.free)

        rows = {row["id"]: row["status"] for row in self.results()}
        self.assertEqual(rows[self.free.id], "invited")


if __name__ == "__main__":
    unittest.main()
