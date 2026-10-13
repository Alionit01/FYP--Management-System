#!/usr/bin/env python3
"""One-time bootstrap: promote exactly one existing student to admin.

Usage (from the backend directory, with DATABASE_URL pointing at the
target database):

    .venv/bin/python scripts/make_admin.py someone@iqra.edu.pk

Safety properties:
- Promotes ONLY an existing, email-verified account; never creates one.
- Refuses to run when any administrator already exists (exactly one).
- Prints no credentials, hashes, or tokens — only the numeric id.
- Not exposed over HTTP; there is no public bootstrap endpoint.

Run this once, then it can be deleted or kept; it is harmless while no
administrator exists is false (it always re-checks).
"""
import os
import sys

# Allow running as `python scripts/make_admin.py` from the backend dir.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from app import models  # noqa: E402
from app.database import SessionLocal  # noqa: E402


class BootstrapError(Exception):
    """A refusal with a safe, non-sensitive message."""


def promote_to_admin(db, email: str) -> int:
    """Promote a verified student to admin; return the student id.

    Raises BootstrapError on any refusal condition. Never creates an
    account and never reveals credentials.
    """
    email = (email or "").strip().lower()
    if not email:
        raise BootstrapError("An email address is required")

    if db.query(models.Student).filter(
        models.Student.role == models.ADMIN_ROLE
    ).first():
        raise BootstrapError(
            "An administrator already exists; refusing to create another. "
            "Demote the current administrator first if you intend a change."
        )

    student = db.query(models.Student).filter(
        models.Student.email == email
    ).first()
    if not student:
        raise BootstrapError("No account with that email exists")
    if not student.email_verified:
        raise BootstrapError(
            "That account has not verified its email; complete "
            "verification before granting administrator access"
        )

    student.role = models.ADMIN_ROLE
    db.commit()
    return student.id


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 1:
        print("Usage: python scripts/make_admin.py <email>", file=sys.stderr)
        return 2

    db = SessionLocal()
    try:
        try:
            student_id = promote_to_admin(db, argv[0])
        except BootstrapError as error:
            print(f"Refused: {error}", file=sys.stderr)
            return 1
    finally:
        db.close()

    print(f"Promoted student id={student_id} to admin")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
