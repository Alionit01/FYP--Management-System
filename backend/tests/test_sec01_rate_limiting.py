"""SEC-01: the login rate limiter must not be client-definable.

Audit finding SEC-01. ``_client_ip`` used the *left-most*
``X-Forwarded-For`` hop. That entry is written by the caller, not by
infrastructure: an attacker rotates the header on every request, gets a
fresh limiter key each time, and brute-forces a mailbox without ever
tripping ``429``. This was demonstrated against the running production
API during the audit.

The fix:

* forwarded headers are consulted only when ``TRUSTED_PROXY_COUNT`` says
  a proxy actually sits in front of the app (default 0 = ignore),
* the header is read from the right, so only hops appended by trusted
  infrastructure count; client-controlled entries are discarded,
* a second, per-mailbox limit survives an attack spread across many
  source addresses.

These tests drive the real ``_client_ip`` and the real ``login``
endpoint.
"""

import os
import tempfile
import unittest
from unittest.mock import patch

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = (
    f"sqlite+pysqlite:///{_test_directory.name}/sec01.sqlite"
)
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"
os.environ.setdefault("PILOT_ONBOARDING_ENABLED", "false")
# The suite must exercise the safe default, not a deployment setting.
os.environ.pop("TRUSTED_PROXY_COUNT", None)

from fastapi import Request  # noqa: E402

from app import main, models  # noqa: E402
from app.auth import hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.schemas import StudentLogin  # noqa: E402


def make_request(peer="203.0.113.9", forwarded_for=None):
    headers = []
    if forwarded_for is not None:
        headers.append((b"x-forwarded-for", forwarded_for.encode()))
    return Request({
        "type": "http",
        "headers": headers,
        "client": (peer, 1234),
    })


class ClientIpResolutionTests(unittest.TestCase):
    """Where the limiter believes the client lives."""

    def test_forwarded_header_is_ignored_by_default(self):
        # No TRUSTED_PROXY_COUNT configured -> no proxy is assumed, so
        # the header is attacker-controlled and must be discarded.
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("TRUSTED_PROXY_COUNT", None)
            request = make_request(peer="203.0.113.9",
                                   forwarded_for="1.2.3.4, 5.6.7.8")
            self.assertEqual(main._client_ip(request), "203.0.113.9")

    def test_spoofed_prefix_is_discarded_when_one_proxy_is_trusted(self):
        with patch.dict(os.environ, {"TRUSTED_PROXY_COUNT": "1"}):
            # The caller claimed "1.2.3.4"; the trusted proxy appended
            # the real peer. The claim must be ignored.
            request = make_request(peer="10.0.0.1",
                                   forwarded_for="1.2.3.4, 203.0.113.9")
            self.assertEqual(main._client_ip(request), "203.0.113.9")

    def test_single_hop_header_is_accepted_when_one_proxy_is_trusted(self):
        with patch.dict(os.environ, {"TRUSTED_PROXY_COUNT": "1"}):
            request = make_request(peer="10.0.0.1",
                                   forwarded_for="203.0.113.9")
            self.assertEqual(main._client_ip(request), "203.0.113.9")

    def test_two_proxies_read_from_the_correct_position(self):
        with patch.dict(os.environ, {"TRUSTED_PROXY_COUNT": "2"}):
            # hops = [client-spoof, client, edge-proxy]
            request = make_request(
                peer="10.0.0.1",
                forwarded_for="9.9.9.9, 203.0.113.9, 10.0.0.2")
            self.assertEqual(main._client_ip(request), "203.0.113.9")

    def test_missing_header_falls_back_to_peer(self):
        with patch.dict(os.environ, {"TRUSTED_PROXY_COUNT": "1"}):
            request = make_request(peer="203.0.113.9")
            self.assertEqual(main._client_ip(request), "203.0.113.9")

    def test_too_few_hops_falls_back_to_peer_rather_than_guessing(self):
        with patch.dict(os.environ, {"TRUSTED_PROXY_COUNT": "2"}):
            # Only one hop for two trusted proxies: malformed or forged.
            request = make_request(peer="203.0.113.9", forwarded_for="1.2.3.4")
            self.assertEqual(main._client_ip(request), "203.0.113.9")

    def test_blank_and_whitespace_hops_are_not_counted(self):
        with patch.dict(os.environ, {"TRUSTED_PROXY_COUNT": "1"}):
            request = make_request(peer="10.0.0.1",
                                   forwarded_for="  , 203.0.113.9 ")
            self.assertEqual(main._client_ip(request), "203.0.113.9")

    def test_unparseable_setting_is_treated_as_zero(self):
        with patch.dict(os.environ, {"TRUSTED_PROXY_COUNT": "not-a-number"}):
            request = make_request(peer="203.0.113.9",
                                   forwarded_for="1.2.3.4")
            self.assertEqual(main._client_ip(request), "203.0.113.9")


class RateLimitTests(unittest.TestCase):
    """The limiter still limits, and can no longer be dodged."""

    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        main._LOGIN_ATTEMPTS.clear()
        main._LOGIN_EMAIL_ATTEMPTS.clear()

    def tearDown(self):
        Base.metadata.drop_all(engine)
        main._LOGIN_ATTEMPTS.clear()
        main._LOGIN_EMAIL_ATTEMPTS.clear()

    def _login(self, request, email="nobody@iqra.edu.pk", password="WrongPass1"):
        try:
            main.login(StudentLogin(email=email, password=password), request)
        except Exception as exc:  # noqa: BLE001 - we assert on status
            return getattr(exc, "status_code", None)
        return 200

    def test_repeated_failures_from_one_client_are_limited(self):
        request = make_request(peer="203.0.113.9")
        statuses = [self._login(request) for _ in range(6)]
        self.assertEqual(statuses[:5], [401] * 5)
        self.assertEqual(statuses[5], 429)

    def test_rotating_forwarded_header_cannot_reset_the_limiter(self):
        """The exact bypass demonstrated against production."""
        request_peer = "203.0.113.9"
        statuses = []
        for i in range(6):
            req = make_request(peer=request_peer,
                               forwarded_for=f"198.51.100.{i}")
            statuses.append(self._login(req))
        self.assertEqual(statuses[:5], [401] * 5,
                         "rotating X-Forwarded-For must not buy retries")
        self.assertEqual(statuses[5], 429)

    def test_rotating_header_is_still_limited_behind_a_real_proxy(self):
        with patch.dict(os.environ, {"TRUSTED_PROXY_COUNT": "1"}):
            statuses = []
            for i in range(6):
                req = make_request(
                    peer="10.0.0.1",
                    forwarded_for=f"198.51.100.{i}, 203.0.113.9")
                statuses.append(self._login(req))
            self.assertEqual(statuses[:5], [401] * 5)
            self.assertEqual(statuses[5], 429)

    def test_legitimate_clients_on_different_addresses_are_not_confused(self):
        for octet in (11, 12):
            request = make_request(peer=f"198.51.100.{octet}")
            for _ in range(3):
                self.assertEqual(self._login(request), 401)

    def test_different_mailboxes_from_one_address_are_independent(self):
        request = make_request(peer="203.0.113.9")
        for email in ("a1@iqra.edu.pk", "a2@iqra.edu.pk"):
            for _ in range(3):
                self.assertEqual(
                    self._login(request, email=email), 401,
                    f"{email} was limited by another mailbox's failures")

    def test_per_mailbox_limit_survives_many_source_addresses(self):
        # The per-client ceiling is 5, so spread the attempts over
        # enough distinct source addresses that no single client key
        # ever reaches it. Only the per-mailbox limit can fire.
        total_failures = main.LOGIN_EMAIL_MAX_ATTEMPTS
        statuses = []
        for i in range(total_failures):
            request = make_request(peer=f"198.51.100.{i // 250}."
                                        f"{i % 250}")
            statuses.append(self._login(request))
        self.assertEqual(statuses, [401] * total_failures,
                         "no source address should have hit its own limit")

        # One more distributed attempt crosses the per-mailbox ceiling.
        request = make_request(peer="203.0.113.254")
        self.assertEqual(self._login(request), 429,
                         "a mailbox must be protected even when the "
                         "attack is spread across many source addresses")

    def test_successful_login_is_not_counted_as_a_failure(self):
        db = SessionLocal()
        try:
            db.add(models.Student(
                name="Real Student", university_id="R1",
                email="real.1@iqra.edu.pk",
                password=hash_password("Password123"),
                program="BSCS", email_verified=True, role="student",
            ))
            db.commit()
        finally:
            db.close()

        request = make_request(peer="203.0.113.9")
        for _ in range(3):
            status = self._login(request, email="real.1@iqra.edu.pk",
                                 password="Password123")
            self.assertEqual(status, 200)
        self.assertEqual(main._LOGIN_ATTEMPTS, {})
        self.assertEqual(main._LOGIN_EMAIL_ATTEMPTS, {})


if __name__ == "__main__":
    unittest.main()
