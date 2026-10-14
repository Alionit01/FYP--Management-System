#!/usr/bin/env python3
"""Read-only report: which accounts could have been auto-verified (SEC-04).

Background. The pre-audit start-up block ran, on every boot in every
worker:

    UPDATE students SET email_verified = TRUE WHERE verification_token IS NULL

Nothing writes ``verification_token`` any longer, so that statement
matched *every* row, not just legacy ones. Any account that was
unverified at boot time was silently flipped to verified. The statement
has since been removed (audit finding SEC-04), but the accounts it
already touched still exist.

This script changes nothing. It classifies each account so a human can
decide, per account, what its legitimate verification state is:

    auto_verified_candidate  email_verified, no token — could have been
                             flipped by the old UPDATE. There is no
                             stored evidence either way, because the
                             statement left no trace.
    verified_with_token      email_verified and a token is present —
                             reached verification through the real flow.
    unverified               not verified. Untouched by the old UPDATE.

Because the old UPDATE recorded nothing, "auto_verified_candidate" is a
set of accounts worth *reviewing*, not a set proven to be wrong. Do not
bulk-change them from this report alone.

Usage (from the backend directory, with DATABASE_URL pointing at the
target database):

    .venv/bin/python scripts/report_verification_state.py

Safety properties:
- Executes SELECTs only. No row is created, updated, or deleted.
- Prints no passwords, password hashes, or tokens.
"""
import os
import sys

# Allow running as `python scripts/report_verification_state.py`.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal  # noqa: E402
from app import models  # noqa: E402


def main() -> int:
    if not os.getenv("DATABASE_URL"):
        print("DATABASE_URL is not set; refusing to guess a target.")
        return 1

    db = SessionLocal()
    try:
        total = db.query(models.Student).count()
        rows = db.query(models.Student).all()

        candidates = [s for s in rows
                      if s.email_verified and s.verification_token is None]
        with_token = [s for s in rows
                      if s.email_verified and s.verification_token is not None]
        unverified = [s for s in rows if not s.email_verified]

        print(f"accounts: {total}")
        print(f"  verified_with_token   : {len(with_token)}")
        print(f"  auto_verified_candidate: {len(candidates)}")
        print(f"  unverified            : {len(unverified)}")

        if candidates:
            print("\nAccounts whose verification cannot be evidenced"
                  " (review these):")
            for s in candidates:
                flag = " pilot" if s.pilot_account else ""
                print(f"  id={s.id:<4} {s.email}{flag}")

        if unverified:
            print("\nUnverified accounts (the old UPDATE would have"
                  " flipped these on next boot; it no longer does):")
            for s in unverified:
                flag = " pilot" if s.pilot_account else ""
                print(f"  id={s.id:<4} {s.email}{flag}")

        print("\nNothing was changed. To reconcile, decide each account"
              " above individually.")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
