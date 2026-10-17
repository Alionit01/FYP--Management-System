import hashlib
import os
import secrets
import time
from collections import deque
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from .database import SessionLocal
from . import schemas

from .database import engine, Base
from . import models, database
from .models import INVITATION_TTL, utc_now
from .schemas import (
    StudentCreate,
    TeamCreate,
    StudentLogin,
    VerificationRequest,
    StudentUpdate,
    TeamUpdate,
    PasswordResetRequest,
    PasswordReset,
    MAX_TEAM_MEMBERS,
    DIRECTORY_PICTURE_INLINE_LIMIT,
)
from .auth import hash_password, verify_password, create_access_token
from .email import send_verification_email, send_password_reset_email
from fastapi import FastAPI, HTTPException, Depends, Request
from .dependencies import get_current_student

app = FastAPI()

# Load .env explicitly so ALLOWED_ORIGINS below does not depend on the
# import order of sibling modules (database/auth) happening to call it.
load_dotenv()


# Exact origins allowed to call this API. CORS requires exact string
# matches (no wildcards, and "localhost" != "127.0.0.1"), so they are
# listed explicitly rather than inferred.
#
# The deployed frontend is always allowed. Local dev servers are added
# via the ALLOWED_ORIGINS env var (comma-separated), which *extends*
# the production list so a partial local value can never drop it:
#
#   ALLOWED_ORIGINS=http://127.0.0.1:5199,http://localhost:5173
#
# Never add "*" here — the API returns data for signed-in students.
_PRODUCTION_ORIGINS = ("https://fypms-psi.vercel.app",)

# Sensible local defaults when ALLOWED_ORIGINS is unset: Vite's default
# port on both possible hostnames.
_DEFAULT_DEV_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")

_extra_origins = tuple(
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
)

ALLOWED_ORIGINS = list(
    dict.fromkeys(_PRODUCTION_ORIGINS + (_extra_origins or _DEFAULT_DEV_ORIGINS))
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROGRAMS = {
    "BSCS",
    "BSAI",
    "BSCB",
    "BSSE",
    "BESE",
}

FYP_STATUSES = {
    "Looking for a team",
    "Already in a team",
}

TEAM_DEPARTMENT_OPTIONS = PROGRAMS | {"Any"}


# Temporary supervised-pilot onboarding. OFF by default and
# fail-closed: a missing, empty, or unrecognized value keeps
# the normal email-verification flow. Enable only for the
# in-person pilot by setting PILOT_ONBOARDING_ENABLED=true.
_PILOT_ON_VALUES = {"true", "1", "yes", "on"}


def pilot_onboarding_enabled() -> bool:
    return (
        os.getenv("PILOT_ONBOARDING_ENABLED", "")
        .strip()
        .lower()
        in _PILOT_ON_VALUES
    )


def _trusted_proxy_count() -> int:
    """How many reverse proxies sit in front of this application.

    0 (the default) means "no proxy is configured": forwarded headers
    are ignored and the direct TCP peer is the login rate-limit
    identity. Set this in deployment to the number of hops you actually
    operate. Unparseable or negative values fail safe to 0.
    """
    try:
        return max(0, int(os.getenv("TRUSTED_PROXY_COUNT", "0")))
    except ValueError:
        return 0


# Create database tables, then apply versioned migrations.
#
# This replaces an inline ALTER TABLE block that ran inside
# ``try/except Exception: pass``. That block performed an unguarded
# ``UPDATE students SET email_verified = TRUE WHERE verification_token
# = NULL`` on *every* start-up in every worker. Because nothing writes
# ``verification_token`` any longer, it matched every row and silently
# converted unverified pilot accounts into verified ones (audit finding
# SEC-04). Migration failure is now loud instead of swallowed (DB-02).
#
# Imported above create_all so that SchemaMigration is registered in
# Base.metadata and its bookkeeping table is created with the rest.
from .migrations import run_migrations  # noqa: E402
from .observability import configure as configure_logging  # noqa: E402
from .observability import log_event, log_warning  # noqa: E402

configure_logging()

Base.metadata.create_all(bind=engine)
try:
    applied = run_migrations(engine)
except Exception:
    # DB-02: a migration that cannot complete must be loud. Record it
    # with its traceback before the process exits.
    from .observability import log_exception

    log_exception("migration_failed", phase="startup")
    raise

if applied:
    # Migrations are rare and consequential; record which ones ran.
    log_event("migrations_applied", versions=",".join(applied))


log_event(
    "rate_limit_config",
    trusted_proxy_count=_trusted_proxy_count(),
    forwarded_headers="trusted; read right-to-left"
    if _trusted_proxy_count() > 0
    else "IGNORED; the direct peer is used",
)
if _trusted_proxy_count() == 0:
    log_warning(
        "proxy_trust_unconfigured",
        detail=(
            "TRUSTED_PROXY_COUNT is 0, so X-Forwarded-For is ignored. If "
            "this app runs behind a proxy, the ASGI server must not "
            "rewrite the client address either: run uvicorn with "
            "--no-proxy-headers (or an empty FORWARDED_ALLOW_IPS), "
            "otherwise request.client.host is already a client-controlled "
            "claim and the limiter is bypassable."
        ),
    )


@app.get("/")
def root():
    return {"message": "FYP Finder API is running!"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/pilot-status")
def pilot_status():
    # Public, non-secret flag so the frontend can explain the
    # pilot registration flow. Reveals nothing about accounts.
    return {"pilot_onboarding": pilot_onboarding_enabled()}


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault(
        "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
    )
    return response


# ---------------------------------------------------------------------------
# Error visibility (audit REL-04)
# ---------------------------------------------------------------------------
#
# Before this, an unexpected failure produced a 500 for the client and
# left nothing behind: no traceback, no path, no way to find out what
# happened. The handlers below record the event and preserve the
# response the framework would have sent anyway.

from fastapi.exception_handlers import http_exception_handler  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402


@app.exception_handler(HTTPException)
async def _logged_http_exception(request: Request, exc: HTTPException):
    """Record authorization denials and server-side failures.

    401 and 422 are deliberately not logged: they are routine (a wrong
    password, a rejected form) and are already recorded where they
    matter, so logging them here would add noise and duplicate personal
    data for no benefit.
    """
    if exc.status_code == 403 or exc.status_code >= 500:
        log_warning(
            "http_error",
            status=exc.status_code,
            method=request.method,
            path=request.url.path,
        )
    return await http_exception_handler(request, exc)


@app.exception_handler(Exception)
async def _logged_unexpected_exception(request: Request, exc: Exception):
    """Last resort: an exception nothing else handled."""
    log_exception(
        "unhandled_exception",
        method=request.method,
        path=request.url.path,
        error_type=type(exc).__name__,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# =========================
# AUTHENTICATION
# =========================

VERIFICATION_TTL = timedelta(hours=1)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@app.post("/students", status_code=202)
def create_student(student: StudentCreate):
    university_domain = os.getenv("UNIVERSITY_EMAIL_DOMAIN")
    if not university_domain:
        raise HTTPException(status_code=500, detail="University email domain is not configured")

    email = student.email.lower()
    if not email.endswith("@" + university_domain.lower()):
        raise HTTPException(status_code=403, detail="University email required")

    # The university ID must appear in the email local part: either the
    # whole local part (67267@iqra.edu.pk) or after a dot
    # (ali.67267@iqra.edu.pk). Comparison is case-insensitive.
    local_part = email.rsplit("@", 1)[0]
    university_id = student.university_id.strip().lower()
    if not university_id or (
        local_part != university_id
        and not local_part.endswith("." + university_id)
    ):
        raise HTTPException(
            status_code=400, detail="University ID must match your email address"
        )
    if student.program not in PROGRAMS:
        raise HTTPException(status_code=400, detail="Invalid program")
    if student.fyp_status and student.fyp_status not in FYP_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid FYP status")

    db = database.SessionLocal()
    token = secrets.token_urlsafe(32)
    try:
        db.query(models.PendingRegistration).filter(
            models.PendingRegistration.expires_at <= datetime.now(timezone.utc)
        ).delete()
        if db.query(models.Student).filter(
            models.Student.email_verified.is_(True),
            (models.Student.email == email) |
            (func.lower(models.Student.university_id) == student.university_id.strip().lower())
        ).first():
            raise HTTPException(status_code=400, detail="Email or university ID already registered")

        if pilot_onboarding_enabled():
            # Supervised pilot: create the account immediately so
            # students can register and sign in without email
            # delivery. The account stays UNVERIFIED
            # (email_verified=False) — the pilot never verifies an
            # email address — and the login policy below admits it
            # only while the pilot flag is explicitly enabled.
            if not student.password:
                raise HTTPException(
                    status_code=400,
                    detail="A password is required to create your account"
                )
            # Stricter than the normal flow: during the pilot any
            # existing row (verified or not) blocks re-registration,
            # so an account cannot be duplicated or overwritten by
            # re-registering with the same email or university ID.
            if db.query(models.Student).filter(
                (models.Student.email == email) |
                (func.lower(models.Student.university_id) == student.university_id.strip().lower())
            ).first():
                raise HTTPException(status_code=400, detail="Email or university ID already registered")

            new_student = models.Student(
                name=student.name,
                email=email,
                university_id=student.university_id.strip().upper(),
                program=student.program,
                fyp_status=student.fyp_status,
                password=hash_password(student.password),
                email_verified=False,
                pilot_account=True,
            )
            db.add(new_student)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                raise HTTPException(
                    status_code=409,
                    detail="Email or university ID already registered"
                )
            db.refresh(new_student)

            # Sign the student in immediately (same token shape as
            # /login) so the QR-code flow is one step.
            return {
                "message": "Pilot account created. You are signed in.",
                "access_token": create_access_token(new_student.id),
                "token_type": "bearer",
                "student_id": new_student.id,
            }

        # The pilot-only password field must never be
        # persisted: pending registrations hold no password.
        data = student.model_dump(exclude={"password"})
        data["email"] = email
        data["university_id"] = student.university_id.strip().upper()
        pending = models.PendingRegistration(
            token_hash=_token_hash(token),
            expires_at=datetime.now(timezone.utc) + VERIFICATION_TTL,
            student_data=data,
        )
        db.add(pending)
        db.commit()

        try:
            send_verification_email(email, token)
        except Exception:
            # SMTP libraries raise several types of errors. Do not expose
            # the message or token in a response or log.
            db.delete(pending)
            db.commit()
            raise HTTPException(status_code=503, detail="Could not send verification email") from None

        return {"message": "Check your university email for a verification link."}
    finally:
        db.close()


@app.post("/verify-email")
def verify_email(request: VerificationRequest):
    token = request.token
    db = database.SessionLocal()
    try:
        pending = db.query(models.PendingRegistration).filter(
            models.PendingRegistration.token_hash == _token_hash(token)
        ).with_for_update().first()
        if not pending:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")

        expires_at = pending.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= expires_at:
            db.delete(pending)
            db.commit()
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")

        data = dict(pending.student_data)
        data["password"] = hash_password(request.password)
        existing = db.query(models.Student).filter(
            (models.Student.email == data["email"]) |
            (func.lower(models.Student.university_id) == data["university_id"].lower())
        ).with_for_update().all()
        if any(student.email_verified for student in existing):
            raise HTTPException(status_code=409, detail="Email or university ID already registered")
        if len(existing) > 1:
            # Conflicting legacy, unverified records require manual review;
            # never overwrite or discard multiple accounts automatically.
            raise HTTPException(status_code=409, detail="Conflicting unverified accounts; contact support")

        if existing:
            # Allow the verified mailbox owner to reclaim a legacy unverified
            # row that was previously reserving this identity.
            for field, value in data.items():
                setattr(existing[0], field, value)
            existing[0].email_verified = True
            existing[0].verification_token = None
            # A pilot account reclaimed through the normal
            # verification flow becomes a regular verified
            # account; the pilot marker is cleared.
            existing[0].pilot_account = False
        else:
            db.add(models.Student(**data, email_verified=True))
        db.delete(pending)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Email or university ID already registered")

        return {"message": "Email verified successfully"}
    finally:
        db.close()


_LOGIN_ATTEMPTS: dict = {}          # keyed by "<client-ip>|<email>"
_LOGIN_EMAIL_ATTEMPTS: dict = {}    # keyed by "<email>"
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 60
# Per-account ceiling. Higher than the per-client limit on purpose: it
# must survive a distributed source (many client IPs, one target
# mailbox) without letting one attacker lock a student out of their own
# account from a single IP.
LOGIN_EMAIL_MAX_ATTEMPTS = 20
LOGIN_EMAIL_WINDOW_SECONDS = 900
_MAX_TRACKED_KEYS = 10000


def _direct_peer(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _client_ip(request: Request) -> str:
    """Best-effort client address, spoof-resistant by default.

    ``X-Forwarded-For`` is a *claim* written by whoever sent it: proxies
    append the address they observed, so the left-most entries are
    whatever the caller chose to send. The old implementation took the
    first hop, which let an attacker rotate the header on every request
    and reset the login limiter each time (audit SEC-01).

    We therefore only honour the header when a proxy is explicitly
    configured, and we read it from the right. With N trusted proxies
    the right-most N entries were appended by infrastructure we control,
    so the entry at position ``len(hops) - N`` is the real client and
    everything left of it is discarded. With N=0 the header is ignored
    entirely.
    """
    trusted = _trusted_proxy_count()
    if trusted <= 0:
        return _direct_peer(request)

    forwarded = request.headers.get("x-forwarded-for")
    if not forwarded:
        return _direct_peer(request)

    hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
    if len(hops) < trusted:
        # Fewer hops than we trust: the chain is malformed or
        # client-supplied. Do not guess — fall back to the peer.
        return _direct_peer(request)
    return hops[len(hops) - trusted]


def _prune(attempts, window: float, now: float) -> None:
    while attempts and now - attempts[0] > window:
        attempts.popleft()


def _evict(store: dict, window: float) -> None:
    """Bound memory by dropping keys whose newest attempt has expired."""
    if len(store) <= _MAX_TRACKED_KEYS:
        return
    now = time.monotonic()
    for key in [k for k, v in store.items()
                if not v or now - v[-1] > window]:
        del store[key]


def _login_rate_keys(request: Request, email: str) -> list:
    """Both limits a failed login counts against.

    The composite (client, mailbox) key is the primary defence and stops
    a single source hammering one account. The mailbox-only key stops
    the same attack spread across many source addresses.
    """
    email = (email or "").strip().lower()
    return [
        (_LOGIN_ATTEMPTS, f"{_client_ip(request)}|{email}",
         LOGIN_WINDOW_SECONDS, LOGIN_MAX_ATTEMPTS),
        (_LOGIN_EMAIL_ATTEMPTS, email,
         LOGIN_EMAIL_WINDOW_SECONDS, LOGIN_EMAIL_MAX_ATTEMPTS),
    ]


def _record_login_failure(request: Request, email: str) -> None:
    now = time.monotonic()
    for store, key, window, _limit in _login_rate_keys(request, email):
        attempts = store.setdefault(key, deque())
        _prune(attempts, window, now)
        attempts.append(now)
    _evict(_LOGIN_ATTEMPTS, LOGIN_WINDOW_SECONDS)
    _evict(_LOGIN_EMAIL_ATTEMPTS, LOGIN_EMAIL_WINDOW_SECONDS)


def _check_login_rate_limit(request: Request, email: str) -> None:
    now = time.monotonic()
    for store, key, window, limit in _login_rate_keys(request, email):
        attempts = store.get(key)
        if not attempts:
            continue
        _prune(attempts, window, now)
        if len(attempts) >= limit:
            log_event(
                "login_rate_limited",
                client_ip=_client_ip(request),
                scope=("account" if store is _LOGIN_EMAIL_ATTEMPTS
                       else "client"),
                limit=limit,
                window_seconds=int(window),
            )
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please try again later."
            )


@app.post("/login")
def login(student: StudentLogin, request: Request):

    _check_login_rate_limit(request, student.email)

    db = database.SessionLocal()

    try:
        user = db.query(models.Student).filter(
            models.Student.email == student.email.lower()
        ).first()

        if not user or not verify_password(
            student.password, user.password
        ):
            # Count against the submitted mailbox even when no such
            # account exists, so enumeration via response timing or
            # status codes cannot be combined with a free second pass.
            _record_login_failure(request, student.email)
            # No email and no password here: only the id when the
            # account exists, so a log line never becomes a second copy
            # of personal data or a credential oracle.
            log_event(
                "login_failed",
                reason="bad_credentials",
                user_id=user.id if user else None,
                client_ip=_client_ip(request),
            )
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not user.email_verified:
            # Supervised pilot policy: a pilot account may sign in
            # only while the pilot is explicitly enabled. When the
            # pilot ends (flag off) it is treated like any other
            # unverified account until the normal email-verification
            # flow completes for that mailbox.
            if user.pilot_account and pilot_onboarding_enabled():
                pass
            elif user.pilot_account:
                log_event(
                    "login_denied",
                    reason="pilot_ended",
                    user_id=user.id,
                )
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Pilot sign-in has ended. Complete email "
                        "verification to keep using FYP Finder."
                    )
                )
            else:
                log_event(
                    "login_denied",
                    reason="unverified",
                    user_id=user.id,
                )
                raise HTTPException(
                    status_code=403,
                    detail="Please verify your email before logging in"
                )

        token = create_access_token(user.id)

        log_event("login_succeeded", user_id=user.id,
                  client_ip=_client_ip(request))

        return {
            "access_token": token,
            "token_type": "bearer",
            "student_id": user.id
        }
    finally:
        db.close()


@app.post("/forgot-password")
def forgot_password(request: schemas.PasswordResetRequest):
    db = database.SessionLocal()

    try:
        student = db.query(models.Student).filter(
            models.Student.email == request.email.lower(),
            models.Student.email_verified.is_(True),
        ).first()

        if student:
            # Invalidate any previous reset links for this account.
            db.query(models.PasswordResetToken).filter(
                models.PasswordResetToken.student_id == student.id
            ).delete()

            token = secrets.token_urlsafe(32)
            db.add(models.PasswordResetToken(
                token_hash=_token_hash(token),
                student_id=student.id,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            ))
            db.commit()

            try:
                send_password_reset_email(student.email, token)
            except Exception:
                # Delivery failed. Discard the token and answer with
                # the same generic message used for every request:
                # a delivery-specific error (e.g. 503) would only
                # be reachable for registered accounts and would
                # reveal that the email exists. The student can
                # simply request a new link.
                db.query(models.PasswordResetToken).filter(
                    models.PasswordResetToken.student_id == student.id
                ).delete()
                db.commit()
    finally:
        db.close()

    # Always return the same generic message so account existence is not
    # revealed.
    return {
        "message": "If that email is registered, a password reset link has been sent."
    }


@app.post("/reset-password")
def reset_password(request: schemas.PasswordReset):
    db = database.SessionLocal()

    try:
        row = db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.token_hash == _token_hash(request.token)
        ).first()

        if not row:
            raise HTTPException(
                status_code=400, detail="Invalid or expired reset link"
            )

        expires_at = row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) >= expires_at:
            db.delete(row)
            db.commit()
            raise HTTPException(
                status_code=400, detail="Invalid or expired reset link"
            )

        student = db.query(models.Student).filter(
            models.Student.id == row.student_id
        ).first()

        if not student:
            raise HTTPException(
                status_code=400, detail="Invalid or expired reset link"
            )

        student.password = hash_password(request.password)
        db.delete(row)
        db.commit()

        return {"message": "Password updated. You can now sign in."}
    finally:
        db.close()


# =========================
# STUDENTS
# =========================

def _clamp_spots_available(db, team) -> None:
    """Keep spots_available consistent with the actual member count."""
    db.flush()  # ensure pending add/delete of memberships is counted
    member_count = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team.id
    ).count()
    team.spots_available = max(
        0,
        min(team.spots_available, MAX_TEAM_MEMBERS - member_count)
    )


# The student directory: the only fields other students may see.
# Private columns (password hash, email, whatsapp, email_verified,
# verification_token, profile_completed) are never returned, and raw
# ORM rows are never serialized to responses.
DIRECTORY_FIELDS = (
    "id",
    "name",
    "university_id",
    "program",
    "profile_picture",
    "bio",
    "github",
    "linkedin",
    "skills",
    "interests",
    "fyp_status",
)


def _directory_entry(student: models.Student, include_picture: bool = True) -> dict:
    entry = {field: getattr(student, field) for field in DIRECTORY_FIELDS}
    if not include_picture:
        # SEC-08: a directory page would otherwise ship every avatar
        # inline (observed: 50 students x ~400 KB each). The picture is
        # still served by /students/{id}; the frontend's <Avatar>
        # component shows an initial badge when it is absent.
        picture = entry.get("profile_picture")
        if picture and len(picture) > DIRECTORY_PICTURE_INLINE_LIMIT:
            entry["profile_picture"] = None
    return entry


def _search_pattern(term: str) -> str:
    """Turn a typed term into a case-insensitive `LIKE` pattern.

    % and _ are LIKE's own wildcards, so a student searching for
    "BSCS_1" or "100%" must not silently match everything — they are
    escaped here and the backslash is declared as the escape character
    at the call site. The term is lowercased once so callers can use
    `func.lower(column).like(pattern)` and get the same case-folding
    on every database backend.
    """
    escaped = (
        term.lower()
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )
    return f"%{escaped}%"


def _contains(column, pattern: str):
    """One case-insensitive "contains" clause for `_search_pattern`.

    Written as a helper so every directory search folds case the same
    way and honours the same escape character.
    """
    return func.lower(column).like(pattern, escape="\\")


@app.get("/students")
def get_students(
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    program: str = "",
    status: str = "",
    current_student=Depends(get_current_student),
):
    """The student directory, filtered server-side.

    Filtering used to happen in the browser over whichever 50 rows had
    been fetched, so a classmate on page two was reported as "no
    students found". The filters now narrow the query itself and
    pagination walks the *filtered* set in a stable order.
    """

    limit = min(max(limit, 1), 100)
    skip = max(skip, 0)

    db = database.SessionLocal()

    try:
        query = db.query(models.Student)

        program = (program or "").strip()
        if program and program != "All":
            query = query.filter(models.Student.program == program)

        status = (status or "").strip()
        if status and status != "All":
            query = query.filter(models.Student.fyp_status == status)

        term = (search or "").strip()
        if term:
            pattern = _search_pattern(term)
            query = query.filter(
                or_(
                    _contains(models.Student.name, pattern),
                    _contains(models.Student.program, pattern),
                    _contains(models.Student.university_id, pattern),
                    _contains(models.Student.skills, pattern),
                    _contains(models.Student.interests, pattern),
                )
            )

        students = (
            query.order_by(models.Student.id).offset(skip).limit(limit).all()
        )
        return [
            _directory_entry(student, include_picture=False)
            for student in students
        ]
    finally:
        db.close()

@app.get("/students/{student_id}")
def get_student(
    student_id: int,
    current_student=Depends(get_current_student),
):

    db = database.SessionLocal()

    student = db.query(models.Student).filter(
        models.Student.id == student_id
    ).first()

    db.close()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    return _directory_entry(student)

def _may_view_contact(db: Session, requester_id: int, target_id: int) -> bool:
    """Contact details (email, whatsapp) require an explicit relationship.

    Allowed: the student themselves, a teammate (shared team), or a
    *live* team invitation in either direction. Being signed in is not
    enough on its own, and neither is an invitation that has expired —
    it is no longer a decision anyone can act on, so it must not keep
    leaking contact details forever.
    """
    if requester_id == target_id:
        return True

    requester_team_ids = {
        row.team_id
        for row in db.query(models.TeamMember).filter(
            models.TeamMember.student_id == requester_id
        )
    }
    if requester_team_ids and db.query(models.TeamMember).filter(
        models.TeamMember.student_id == target_id,
        models.TeamMember.team_id.in_(requester_team_ids),
    ).first():
        return True

    exchanged = db.query(models.TeamInvitation).filter(
        (
            (models.TeamInvitation.invited_by == requester_id)
            & (models.TeamInvitation.student_id == target_id)
        )
        | (
            (models.TeamInvitation.invited_by == target_id)
            & (models.TeamInvitation.student_id == requester_id)
        )
    ).all()
    now = utc_now()
    return any(not _invitation_expired(invitation, now) for invitation in exchanged)


@app.get("/students/{student_id}/contact")
def get_student_contact(
    student_id: int,
    current_student=Depends(get_current_student)
):

    db = database.SessionLocal()

    try:
        student = db.query(models.Student).filter(
            models.Student.id == student_id
        ).first()

        if not student:
            raise HTTPException(
                status_code=404,
                detail="Student not found"
            )

        if not _may_view_contact(db, current_student.id, student_id):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Contact details are only shared with teammates and "
                    "students who have exchanged team invitations."
                ),
            )

        return {
            "email": student.email,
            "whatsapp": student.whatsapp
        }
    finally:
        db.close()

@app.put("/my-profile")
def update_my_profile(
    student_data: StudentUpdate,
    current_student=Depends(get_current_student)
):
    db = database.SessionLocal()

    try:
        student = db.query(models.Student).filter(
            models.Student.id == current_student.id
        ).first()

        if not student:
            raise HTTPException(
                status_code=404,
                detail="Student not found"
            )

        if student_data.program not in PROGRAMS:
            raise HTTPException(
                status_code=400,
                detail="Invalid program"
            )

        if (
                student_data.fyp_status
                and student_data.fyp_status not in FYP_STATUSES
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid FYP status"
            )

        student.name = student_data.name
        student.program = student_data.program
        student.profile_picture = student_data.profile_picture
        student.bio = student_data.bio
        student.github = student_data.github
        student.linkedin = student_data.linkedin
        student.whatsapp = student_data.whatsapp
        student.skills = student_data.skills
        student.interests = student_data.interests
        student.fyp_status = student_data.fyp_status

        # One-way: flip to TRUE once the required fields are present.
        # Never downgrade so grandfathered users are not locked out.
        if (
            not student.profile_completed
            and student.skills
            and student.skills.strip()
            and student.fyp_status
        ):
            student.profile_completed = True

        db.commit()

        profile = {
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "email": student.email,
            "program": student.program,
            "profile_picture": student.profile_picture,
            "bio": student.bio,
            "github": student.github,
            "linkedin": student.linkedin,
            "whatsapp": student.whatsapp,
            "skills": student.skills,
            "interests": student.interests,
            "fyp_status": student.fyp_status,
            "profile_completed": student.profile_completed
        }

        return {
            "message": "Profile updated successfully",
            "profile": profile
        }
    finally:
        db.close()

@app.get("/my-profile")
def get_my_profile(
    current_student=Depends(get_current_student)
):
    return {
        "id": current_student.id,
        "name": current_student.name,
        "university_id": current_student.university_id,
        "email": current_student.email,
        "program": current_student.program,
        "profile_picture": current_student.profile_picture,
        "bio": current_student.bio,
        "github": current_student.github,
        "linkedin": current_student.linkedin,
        "whatsapp": current_student.whatsapp,
        "skills": current_student.skills,
        "interests": current_student.interests,
        "fyp_status": current_student.fyp_status,
        "profile_completed": current_student.profile_completed
    }



# =========================
# TEAMS
# =========================

@app.post("/teams")
def create_team(
    team: TeamCreate,
    current_student=Depends(get_current_student)
):
    db = database.SessionLocal()

    try:
        if not current_student.profile_completed:
            raise HTTPException(
                status_code=403,
                detail="Complete your profile before creating a team"
            )

        # Serialize every membership decision for this student. Two
        # concurrent requests (e.g. creating a team while accepting an
        # invitation to a different team) previously raced: each locked a
        # *different* team row, so both passed the check below and both
        # inserted. The student row is the one both paths share. The
        # unique_student_team constraint (migration 0002) remains the
        # final authority if this lock is ever bypassed.
        db.query(models.Student).filter(
            models.Student.id == current_student.id
        ).with_for_update().first()

        # Student can only belong to one team
        existing_membership = db.query(models.TeamMember).filter(
            models.TeamMember.student_id == current_student.id
        ).first()

        if existing_membership:
            raise HTTPException(
                status_code=400,
                detail="You are already in a team"
            )

        # Validate department before creating anything
        if team.department_preference not in TEAM_DEPARTMENT_OPTIONS:
            raise HTTPException(
                status_code=400,
                detail="Invalid department preference"
            )

        # Validate spots (team total can never exceed MAX_TEAM_MEMBERS)
        if team.spots_available < 0:
            raise HTTPException(
                status_code=400,
                detail="Available spots cannot be negative"
            )
        if team.spots_available > MAX_TEAM_MEMBERS - 1:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"A team can have at most {MAX_TEAM_MEMBERS} members "
                    f"including the owner, so spots available cannot "
                    f"exceed {MAX_TEAM_MEMBERS - 1}."
                )
            )

        # Create team
        new_team = models.Team(
            name=team.name,
            project_title=team.project_title,
            description=team.description,
            department_preference=team.department_preference,
            spots_available=team.spots_available,
            skills_needed=team.skills_needed,
            roles_needed=team.roles_needed,
            contact=team.contact,
            created_by=current_student.id
        )

        db.add(new_team)
        db.flush()

        # Add creator as first member
        creator_member = models.TeamMember(
            team_id=new_team.id,
            student_id=current_student.id
        )

        db.add(creator_member)

        # Commit everything together
        db.commit()
        db.refresh(new_team)

        log_event("team_created", team_id=new_team.id,
                  owner_id=current_student.id)

        return {
            "message": "Team created successfully",
            "team_id": new_team.id
        }

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError as exc:
        # The unique_student_team constraint is the authority for
        # "one team per student". If two requests raced past the
        # pre-check, the loser gets a constraint violation here rather
        # than an inconsistent membership. Report it as the business
        # rule it is, not as a server fault.
        db.rollback()
        if "unique_student_team" in str(exc.orig):
            raise HTTPException(
                status_code=400,
                detail="You are already in a team"
            )
        raise HTTPException(
            status_code=500,
            detail="Could not create team"
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create team"
        )

    finally:
        db.close()

@app.put("/teams/{team_id}")
def update_team(
    team_id: int,
    team_data: schemas.TeamUpdate,
    current_student: models.Student = Depends(
        get_current_student
    )
):
    db: Session = SessionLocal()

    try:
        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).with_for_update().first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )

        if team.created_by != current_student.id:
            raise HTTPException(
                status_code=403,
                detail="Only the team owner can edit the team"
            )

        valid_departments = {
            "BSCS",
            "BSAI",
            "BSCB",
            "BSSE",
            "BESE",
            "Any",
        }

        if team_data.department_preference not in valid_departments:
            raise HTTPException(
                status_code=400,
                detail="Invalid department preference"
            )

        team.name = team_data.name
        team.project_title = team_data.project_title
        team.description = team_data.description
        team.department_preference = team_data.department_preference
        if team_data.spots_available > MAX_TEAM_MEMBERS - 1:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"A team can have at most {MAX_TEAM_MEMBERS} members "
                    f"including the owner, so spots available cannot "
                    f"exceed {MAX_TEAM_MEMBERS - 1}."
                )
            )
        team.spots_available = team_data.spots_available
        _clamp_spots_available(db, team)
        team.skills_needed = team_data.skills_needed
        team.roles_needed = team_data.roles_needed
        team.contact = team_data.contact

        db.commit()
        db.refresh(team)

        return {
            "message": "Team updated successfully",
            "team": {
                "id": team.id,
                "name": team.name,
                "project_title": team.project_title,
                "description": team.description,
                "department_preference": team.department_preference,
                "spots_available": team.spots_available,
                "skills_needed": team.skills_needed,
                "roles_needed": team.roles_needed,
                "contact": team.contact,
                "created_by": team.created_by,
            }
        }

    finally:
        db.close()

@app.delete("/teams/{team_id}")
def delete_team(
    team_id: int,
    current_student: models.Student = Depends(
        get_current_student
    )
):
    db: Session = SessionLocal()

    try:
        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).with_for_update().first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )

        # Only the team owner can delete the team
        if team.created_by != current_student.id:
            raise HTTPException(
                status_code=403,
                detail="Only the team owner can delete the team"
            )

        # Remove dependent records explicitly instead of relying on DB cascades.
        db.query(models.TeamInvitation).filter(
            models.TeamInvitation.team_id == team_id
        ).delete()
        db.query(models.TeamMember).filter(
            models.TeamMember.team_id == team_id
        ).delete()

        db.delete(team)
        db.commit()

        return {
            "message": "Team deleted successfully"
        }

    finally:
        db.close()


@app.delete("/teams/{team_id}/members/me")
def leave_team(
    team_id: int,
    current_student: models.Student = Depends(
        get_current_student
    )
):
    db: Session = SessionLocal()

    try:
        membership = db.query(models.TeamMember).filter(
            models.TeamMember.team_id == team_id,
            models.TeamMember.student_id == current_student.id
        ).first()

        if not membership:
            raise HTTPException(
                status_code=404,
                detail="You are not a member of this team"
            )

        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).with_for_update().first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )

        if team.created_by == current_student.id:
            # Owner leaving: hand leadership to the next member,
            # or dissolve the team if nobody else remains.
            db.delete(membership)
            db.flush()

            next_membership = db.query(models.TeamMember).filter(
                models.TeamMember.team_id == team_id
            ).order_by(models.TeamMember.id).first()

            if next_membership is None:
                db.query(models.TeamInvitation).filter(
                    models.TeamInvitation.team_id == team_id
                ).delete()
                db.delete(team)
                db.commit()
                return {
                    "message": "You left the team and it was removed"
                }

            db.query(models.TeamInvitation).filter(
                models.TeamInvitation.team_id == team_id
            ).delete()
            team.created_by = next_membership.student_id
            team.spots_available += 1
            _clamp_spots_available(db, team)
            db.commit()

            return {
                "message": "You left the team; leadership was transferred"
            }

        db.delete(membership)
        team.spots_available += 1
        _clamp_spots_available(db, team)

        db.commit()

        return {
            "message": "You left the team successfully"
        }

    finally:
        db.close()

@app.get("/teams")
def get_teams(
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    program: str = "",
):
    """The team directory, filtered the same way the students one is.

    Anonymous access is kept as it was: teams are public, their
    members' details are not (that comes from GET /teams/{id}).
    """

    limit = min(max(limit, 1), 100)
    skip = max(skip, 0)

    db = database.SessionLocal()

    try:
        query = db.query(models.Team)

        program = (program or "").strip()
        if program and program != "All":
            # "Any Department" means the team takes anyone, so choosing
            # a program must still show it — exactly what the client
            # side filter used to do, and easy to lose here.
            query = query.filter(
                or_(
                    models.Team.department_preference == program,
                    models.Team.department_preference == "Any",
                )
            )

        term = (search or "").strip()
        if term:
            pattern = _search_pattern(term)
            query = query.filter(
                or_(
                    _contains(models.Team.name, pattern),
                    _contains(models.Team.project_title, pattern),
                    _contains(models.Team.description, pattern),
                    _contains(models.Team.skills_needed, pattern),
                    _contains(models.Team.roles_needed, pattern),
                )
            )

        teams = (
            query.order_by(models.Team.id).offset(skip).limit(limit).all()
        )

        return [
            {
                "id": team.id,
                "name": team.name,
                "project_title": team.project_title,
                "description": team.description,
                "department_preference": team.department_preference,
                "spots_available": team.spots_available,
                "skills_needed": team.skills_needed,
                "roles_needed": team.roles_needed,
                "created_by": team.created_by,
            }
            for team in teams
        ]
    finally:
        db.close()

@app.get("/teams/{team_id}")
def get_team(
    team_id: int,
    current_student=Depends(get_current_student),
):
    # Member names, programs, university IDs and profile pictures
    # are student information: anonymous requests are rejected by
    # get_current_student before any data is read (401). Any signed
    # in student may browse team details, mirroring the student
    # directory; contact details stay protected separately.

    db = database.SessionLocal()

    team = db.query(models.Team).filter(
        models.Team.id == team_id
    ).first()

    if not team:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Team not found"
        )

    # Find the team creator
    members = (
        db.query(models.Student)
        .join(
            models.TeamMember,
            models.TeamMember.student_id == models.Student.id
        )
        .filter(
            models.TeamMember.team_id == team.id
        )
        .all()
    )

    member_list = []

    for student in members:
        member_list.append({
            "id": student.id,
            "name": student.name,
            "program": student.program,
            "university_id": student.university_id,
            "profile_picture": student.profile_picture
        })

    result = {
        "id": team.id,
        "name": team.name,
        "project_title": team.project_title,
        "description": team.description,
        "department_preference": team.department_preference,
        "spots_available": team.spots_available,
        "skills_needed": team.skills_needed,
        "roles_needed": team.roles_needed,
        "created_by": team.created_by,
        "members": member_list
    }

    db.close()

    return result

@app.get("/teams/{team_id}/members")
def get_team_members(
    team_id: int,
    current_student=Depends(get_current_student),
):
    # Same protection as GET /teams/{team_id}: the roster is
    # student information and requires a valid sign-in.

    db = database.SessionLocal()

    team = db.query(models.Team).filter(
        models.Team.id == team_id
    ).first()

    if not team:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Team not found"
        )

    members = (
        db.query(models.Student)
        .join(
            models.TeamMember,
            models.TeamMember.student_id == models.Student.id
        )
        .filter(
            models.TeamMember.team_id == team_id
        )
        .all()
    )

    result = []

    for student in members:
        result.append({
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "program": student.program,
            "profile_picture": student.profile_picture
        })

    db.close()

    return result

@app.get("/my-team")
def get_my_team(
    current_student=Depends(get_current_student)
):
    db = database.SessionLocal()

    membership = db.query(models.TeamMember).filter(
        models.TeamMember.student_id == current_student.id
    ).first()

    if not membership:
        db.close()
        return None

    team = db.query(models.Team).filter(
        models.Team.id == membership.team_id
    ).first()

    if not team:
        db.close()
        return None

    members = (
        db.query(models.Student)
        .join(
            models.TeamMember,
            models.TeamMember.student_id == models.Student.id
        )
        .filter(
            models.TeamMember.team_id == team.id
        )
        .all()
    )

    member_list = []

    for student in members:
        member_list.append({
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "program": student.program,
            "profile_picture": student.profile_picture
        })

    result = {
        "id": team.id,
        "name": team.name,
        "project_title": team.project_title,
        "description": team.description,
        "department_preference": team.department_preference,
        "spots_available": team.spots_available,
        "skills_needed": team.skills_needed,
        "roles_needed": team.roles_needed,
        "contact": team.contact,
        "created_by": team.created_by,
        "members": member_list
    }

    db.close()

    return result

def _may_view_team_contact(db: Session, team_id: int, requester_id: int) -> bool:
    """Team contact information requires an explicit relationship.

    Allowed: a current member of the team (the creator is always a
    member) or the student targeted by a *live* invitation to this
    team (so they can decide whether to accept). Being signed in is
    not enough on its own, and an expired invitation no longer counts.
    """
    if db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.student_id == requester_id,
    ).first():
        return True

    invitation = db.query(models.TeamInvitation).filter(
        models.TeamInvitation.team_id == team_id,
        models.TeamInvitation.student_id == requester_id,
    ).first()

    return invitation is not None and not _invitation_expired(invitation)


@app.get("/teams/{team_id}/contact")
def get_team_contact(
    team_id: int,
    current_student=Depends(get_current_student)
):
    db = database.SessionLocal()

    try:
        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).first()

        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )

        if not _may_view_team_contact(db, team_id, current_student.id):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Team contact information is only shared with team "
                    "members and invited students."
                ),
            )

        return {
            "contact": team.contact
        }
    finally:
        db.close()

# =========================
# TEAM INVITATIONS
# =========================
#
# An invitation is a proposal, not a reservation: the invitee decides,
# and the team keeps the spot until they say yes. That stays fair only
# if both sides can see and undo what the other side has done, so:
#
#   * the invitee gets a real inbox entry (who invited them, which
#     team, how big it is, when it expires) instead of a bare team
#     name with two buttons,
#   * the owner gets a "sent" list with revoke and resend, instead of
#     sending into a void and discovering the result only when the
#     student shows up as a member,
#   * an invitation expires, so neither side is left holding a
#     months-old maybe that can still change the team at any moment.


def _as_utc(value):
    """Normalize a stored timestamp for comparison with utc_now().

    SQLite returns naive datetimes even for timezone-aware columns, so
    `value > utc_now()` raises TypeError without this. Everything here
    is stored in UTC (models.utc_now), so attaching it back is correct.
    """
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _iso(value):
    """An ISO-8601 UTC string for the API, or None when unknown."""
    normalized = _as_utc(value)
    return normalized.isoformat() if normalized else None


def _invitation_expired(invitation, now=None) -> bool:
    """True once the invitation's deadline has passed.

    A NULL expiry (a row written before migration 0003 backfilled it)
    counts as "no deadline" rather than silently dropping a live
    invitation.
    """
    expires_at = _as_utc(invitation.expires_at)
    if expires_at is None:
        return False
    return (now or utc_now()) >= expires_at


def _invitation_days_remaining(invitation, now=None) -> int:
    """Whole days left, rounded up — "1 day" for the last 24 hours,
    0 once expired. None when the invitation has no deadline."""
    expires_at = _as_utc(invitation.expires_at)
    if expires_at is None:
        return None
    seconds = (expires_at - (now or utc_now())).total_seconds()
    if seconds <= 0:
        return 0
    return int(seconds // 86400) + (1 if seconds % 86400 else 0)


def _actionable_invitations(db, team):
    """The team's invitations that could still become memberships.

    Three things silently void an invitation, and each one has to stop
    holding a spot on the team:

      * the invitee joined another team (they can no longer accept),
      * the deadline passed,
      * the team changed owner (the invitation came from someone who
        no longer speaks for the team).

    Rows are kept rather than deleted — the audit trail and a later
    "leave the team" both want them — but they never count against the
    team's capacity from here on.
    """
    invitations = db.query(models.TeamInvitation).filter(
        models.TeamInvitation.team_id == team.id
    ).all()
    if not invitations:
        return []

    member_ids = {
        student_id for (student_id,) in db.query(
            models.TeamMember.student_id
        ).filter(
            models.TeamMember.student_id.in_(
                [invitation.student_id for invitation in invitations]
            )
        ).all()
    }

    now = utc_now()
    return [
        invitation
        for invitation in invitations
        if invitation.invited_by == team.created_by
        and invitation.student_id not in member_ids
        and not _invitation_expired(invitation, now)
    ]


def _member_count(db, team_id) -> int:
    return db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id
    ).count()


def _my_invitation_entry(db, invitation, team) -> dict:
    """An inbox entry: everything the invitee needs to decide."""
    inviter = db.query(models.Student).filter(
        models.Student.id == invitation.invited_by
    ).first()
    member_count = _member_count(db, team.id)

    return {
        "id": invitation.id,
        "team_id": team.id,
        "team_name": team.name,
        "project_title": team.project_title,
        "department_preference": team.department_preference,
        "member_count": member_count,
        "spots_available": team.spots_available,
        "inviter": (
            {
                "id": inviter.id,
                "name": inviter.name,
                "program": inviter.program,
            }
            if inviter
            else None
        ),
        "created_at": _iso(invitation.created_at),
        "expires_at": _iso(invitation.expires_at),
        "days_remaining": _invitation_days_remaining(invitation),
    }


def _sent_invitation_entry(db, invitation, student=None) -> dict:
    """A sent-invitation row for the owner's management list."""
    if student is None:
        student = db.query(models.Student).filter(
            models.Student.id == invitation.student_id
        ).first()
    expired = _invitation_expired(invitation)

    return {
        "id": invitation.id,
        "team_id": invitation.team_id,
        "student_id": invitation.student_id,
        "student": (
            {
                "id": student.id,
                "name": student.name,
                "program": student.program,
                "university_id": student.university_id,
                "profile_picture": student.profile_picture,
            }
            if student
            else None
        ),
        "status": "expired" if expired else "pending",
        "created_at": _iso(invitation.created_at),
        "expires_at": _iso(invitation.expires_at),
        "days_remaining": _invitation_days_remaining(invitation),
    }


def _ordered_by_sent_at(entries):
    """Newest invitation first — the one just sent is the one in view."""
    return sorted(
        entries,
        key=lambda entry: entry["created_at"] or "",
        reverse=True,
    )


def _purge_expired_invitations(db, team_id=None) -> None:
    """Delete invitations past their deadline.

    Expiry is enforced on read everywhere it matters, so this is
    housekeeping rather than a correctness requirement — but without it
    the table keeps rows nobody can act on, and the unique constraint
    would block a legitimate re-invite of the same student.
    """
    query = db.query(models.TeamInvitation).filter(
        models.TeamInvitation.expires_at.isnot(None),
        models.TeamInvitation.expires_at <= utc_now(),
    )
    if team_id is not None:
        query = query.filter(models.TeamInvitation.team_id == team_id)
    query.delete(synchronize_session=False)


@app.post("/teams/{team_id}/invitations/{student_id}")
def invite_team_member(
    team_id: int,
    student_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    db = database.SessionLocal()
    try:
        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).with_for_update().first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        if team.created_by != current_student.id:
            raise HTTPException(status_code=403, detail="Only the team owner can invite members")

        student = db.query(models.Student).filter(
            models.Student.id == student_id,
            models.Student.email_verified.is_(True)
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="That student could not be found")
        if db.query(models.TeamMember).filter(
            models.TeamMember.student_id == student_id
        ).first():
            raise HTTPException(
                status_code=400,
                detail=f"{student.name} is already in a team"
            )

        # Lapsed invitations for this team are cleared out under the
        # team lock, so re-inviting someone whose invitation expired is
        # a plain new invitation instead of a unique-constraint error.
        _purge_expired_invitations(db, team_id)
        existing = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.team_id == team_id,
            models.TeamInvitation.student_id == student_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"{student.name} has already been invited to this team"
            )

        # Two capacity rules, in order of how surprising they are:
        # the spots the owner chose to advertise, then the hard team
        # size. Reserving a spot per pending invitation is what stops
        # six people being invited to a team with one place left, each
        # of whom would otherwise only discover the conflict after
        # accepting.
        pending = _actionable_invitations(db, team)
        if team.spots_available <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This team has no open spots. Edit the team to offer "
                    "more spots before inviting anyone."
                )
            )
        if len(pending) >= team.spots_available:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"All {team.spots_available} open "
                    f"{'spot is' if team.spots_available == 1 else 'spots are'} "
                    "already promised to invited students. Revoke an "
                    "invitation, or offer more spots, to invite someone else."
                )
            )
        if _member_count(db, team_id) + len(pending) >= MAX_TEAM_MEMBERS:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"All {MAX_TEAM_MEMBERS} spots are already taken or promised. "
                    "Revoke a pending invitation or remove a member first."
                )
            )

        db.add(models.TeamInvitation(
            team_id=team_id, student_id=student_id, invited_by=current_student.id
        ))
        message = (
            f"Invitation sent to {student.name}. They have to accept "
            "before joining."
        )

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=f"{student.name} has already been invited to this team"
            )

        log_event(
            "team_invitation_sent",
            student_id=current_student.id,
            team_id=team_id,
            invitee_id=student_id,
        )
        invitation = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.team_id == team_id,
            models.TeamInvitation.student_id == student_id
        ).first()
        return {
            "message": message,
            "invitation": _sent_invitation_entry(db, invitation, student),
        }
    finally:
        db.close()


@app.get("/teams/{team_id}/invitations")
def list_team_invitations(
    team_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    """The owner's side of the conversation: who has been invited,
    when, and whether it is still open.

    Only the owner sees it — who a team has invited is team business.
    Invitations to students who joined another team are dropped: they
    can never be accepted, so managing them would be theatre.
    """
    db = database.SessionLocal()
    try:
        team = db.query(models.Team).filter(models.Team.id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        if team.created_by != current_student.id:
            raise HTTPException(
                status_code=403,
                detail="Only the team owner can manage invitations"
            )

        # Expiry is already filtered out of the list below; expired rows
        # are physically removed when the owner next sends or re-sends
        # an invitation (see invite_team_member), where a write is part
        # of the transaction anyway.
        invitations = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.team_id == team_id
        ).all()
        # Same rule as the capacity count: an invitation to someone who
        # is already on a team can never be accepted, so it is not
        # offered back as something to manage.
        in_any_team_ids = {
            student_id for (student_id,) in db.query(
                models.TeamMember.student_id
            ).filter(
                models.TeamMember.student_id.in_(
                    [invitation.student_id for invitation in invitations]
                )
            ).all()
        } if invitations else set()

        entries = _ordered_by_sent_at([
            _sent_invitation_entry(db, invitation)
            for invitation in invitations
            if invitation.student_id not in in_any_team_ids
        ])
        member_count = _member_count(db, team_id)
        open_count = sum(1 for entry in entries if entry["status"] == "pending")

        # How many more invitations this team may actually send: bounded
        # by the hard team size AND by the spots the owner chose to
        # advertise (a team that closed its spots can promise nothing
        # new, however many places the arithmetic would allow).
        return {
            "invitations": entries,
            "member_count": member_count,
            "spots_available": team.spots_available,
            "open_invitations": open_count,
            "invitable_spots": max(0, min(
                team.spots_available,
                MAX_TEAM_MEMBERS - member_count - open_count,
            )),
        }
    finally:
        db.close()


@app.delete("/teams/{team_id}/invitations/{invitation_id}")
def revoke_team_invitation(
    team_id: int,
    invitation_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    """Withdraw an invitation the owner no longer stands behind."""
    db = database.SessionLocal()
    try:
        team = db.query(models.Team).filter(
            models.Team.id == team_id
        ).with_for_update().first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        if team.created_by != current_student.id:
            raise HTTPException(
                status_code=403,
                detail="Only the team owner can manage invitations"
            )

        invitation = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.id == invitation_id,
            models.TeamInvitation.team_id == team_id
        ).with_for_update().first()
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        invitee_id = invitation.student_id
        db.delete(invitation)
        db.commit()

        log_event(
            "team_invitation_revoked",
            student_id=current_student.id,
            team_id=team_id,
            invitee_id=invitee_id,
        )
        return {"message": "Invitation revoked"}
    finally:
        db.close()


@app.post("/invitations/{invitation_id}/resend")
def resend_team_invitation(
    invitation_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    """Give a lapsed (or about to lapse) invitation a fresh deadline."""
    db = database.SessionLocal()
    try:
        invitation_team = db.query(models.TeamInvitation.team_id).filter(
            models.TeamInvitation.id == invitation_id
        ).first()
        if not invitation_team:
            raise HTTPException(status_code=404, detail="Invitation not found")

        team = db.query(models.Team).filter(
            models.Team.id == invitation_team.team_id
        ).with_for_update().first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        invitation = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.id == invitation_id
        ).with_for_update().first()
        if not invitation or invitation.team_id != team.id:
            raise HTTPException(status_code=404, detail="Invitation not found")
        if team.created_by != current_student.id:
            raise HTTPException(
                status_code=403,
                detail="Only the team owner can manage invitations"
            )
        if invitation.invited_by != team.created_by:
            raise HTTPException(
                status_code=409,
                detail="This invitation is no longer valid. Send a new one instead."
            )

        student = db.query(models.Student).filter(
            models.Student.id == invitation.student_id
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="That student could not be found")
        if db.query(models.TeamMember).filter(
            models.TeamMember.student_id == invitation.student_id
        ).first():
            raise HTTPException(
                status_code=409,
                detail=f"{student.name} has already joined another team"
            )
        if _member_count(db, team.id) >= MAX_TEAM_MEMBERS:
            raise HTTPException(
                status_code=409,
                detail="This team is full, so the invitation cannot be re-sent"
            )
        # The spot must still be free for this student: counting the
        # other pending invitations only, not the one being renewed.
        promised_elsewhere = [
            pending for pending in _actionable_invitations(db, team)
            if pending.id != invitation.id
        ]
        if len(promised_elsewhere) >= team.spots_available:
            raise HTTPException(
                status_code=409,
                detail=(
                    "That spot has already been promised to another student. "
                    "Revoke that invitation first."
                )
            )

        invitation.created_at = utc_now()
        invitation.expires_at = utc_now() + INVITATION_TTL
        db.commit()

        log_event(
            "team_invitation_resent",
            student_id=current_student.id,
            team_id=team.id,
            invitee_id=invitation.student_id,
        )
        return {
            "message": f"Invitation re-sent to {student.name}",
            "invitation": _sent_invitation_entry(db, invitation, student),
        }
    finally:
        db.close()


@app.get("/teams/{team_id}/invitations/candidates")
def invitation_candidates(
    team_id: int,
    query: str = "",
    limit: int = 20,
    current_student: models.Student = Depends(get_current_student)
):
    """Students an owner could invite, searched rather than paginated.

    The old flow offered a dropdown over the first 50 rows of the
    directory, which on any real cohort is a random 50 people — most of
    them already in a team, none of them findable. This searches by
    name, program or university id and labels every result, so the
    owner sees *why* someone can or cannot be invited before clicking.
    """
    limit = min(max(limit, 1), 50)

    db = database.SessionLocal()
    try:
        team = db.query(models.Team).filter(models.Team.id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        if team.created_by != current_student.id:
            raise HTTPException(
                status_code=403,
                detail="Only the team owner can invite members"
            )

        search = query.strip()
        students = db.query(models.Student).filter(
            models.Student.email_verified.is_(True),
            models.Student.id != current_student.id,
        )
        if search:
            pattern = f"%{search.lower()}%"
            students = students.filter(
                func.lower(models.Student.name).like(pattern)
                | func.lower(models.Student.program).like(pattern)
                | func.lower(models.Student.university_id).like(pattern)
            )

        # Over-fetch, then rank: with a full cohort a plain LIMIT would
        # page past every invitable student into the "already in a team"
        # ones. Bounded so a broad search cannot pull the directory.
        matches = students.order_by(models.Student.name).limit(limit * 5).all()
        if not matches:
            return {"results": [], "query": search}

        team_invitations = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.team_id == team_id
        ).all()
        # A lapsed invitation holds nothing: its student is invitable
        # again, not "already invited".
        now = utc_now()
        invited_ids = {
            invitation.student_id for invitation in team_invitations
            if not _invitation_expired(invitation, now)
        }
        in_any_team_ids = {
            student_id for (student_id,) in db.query(
                models.TeamMember.student_id
            ).filter(
                models.TeamMember.student_id.in_([student.id for student in matches])
            ).all()
        }

        entries = []
        for student in matches:
            if student.id in in_any_team_ids:
                status = "in-team"
            elif student.id in invited_ids:
                status = "invited"
            else:
                status = "invitable"
            entries.append({
                **_directory_entry(student, include_picture=False),
                "status": status,
            })

        # Invitable first, then already-invited, then unavailable —
        # the top of the list is always the action that can succeed.
        rank = {"invitable": 0, "invited": 1, "in-team": 2}
        entries.sort(key=lambda entry: (rank[entry["status"]], entry["name"]))
        return {"results": entries[:limit], "query": search}
    finally:
        db.close()


@app.get("/my-invitations")
def get_my_invitations(current_student: models.Student = Depends(get_current_student)):
    db = database.SessionLocal()
    try:
        # A student already on a team can never accept another
        # invitation (accept_invitation returns 409), so hiding the
        # pending list here keeps the UI from offering a dead-end
        # "Accept" button. Stale invitations left over from before they
        # joined a team are simply not surfaced.
        if db.query(models.TeamMember).filter(
            models.TeamMember.student_id == current_student.id
        ).first():
            return []

        rows = db.query(models.TeamInvitation, models.Team).join(
            models.Team, models.Team.id == models.TeamInvitation.team_id
        ).filter(models.TeamInvitation.student_id == current_student.id).all()

        entries = []
        now = utc_now()
        for invitation, team in rows:
            # An invitation from a previous owner no longer speaks for
            # the team, and an expired one is no longer a choice — both
            # are dropped rather than offered as buttons that can only
            # fail.
            if invitation.invited_by != team.created_by:
                continue
            if _invitation_expired(invitation, now):
                continue
            entries.append(_my_invitation_entry(db, invitation, team))

        return _ordered_by_sent_at(entries)
    finally:
        db.close()


@app.post("/invitations/{invitation_id}/accept")
def accept_invitation(
    invitation_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    db = database.SessionLocal()
    try:
        # Lock the student row FIRST: it is the one resource shared by
        # every concurrent "join a team" attempt from this student.
        # Locking only the team (as before) left a cross-team race open,
        # because two accepts for two different teams locked two
        # different rows and both passed the membership check below.
        # The unique_student_team constraint (migration 0002) is the
        # final authority if this lock is bypassed.
        db.query(models.Student).filter(
            models.Student.id == current_student.id
        ).with_for_update().first()

        # Lock the team before the invitation so member-count and spot updates
        # are serialized with other team mutations.
        invitation_team = db.query(models.TeamInvitation.team_id).filter(
            models.TeamInvitation.id == invitation_id,
            models.TeamInvitation.student_id == current_student.id
        ).first()
        if not invitation_team:
            raise HTTPException(status_code=404, detail="Invitation not found")
        team = db.query(models.Team).filter(
            models.Team.id == invitation_team.team_id
        ).with_for_update().first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        invitation = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.id == invitation_id,
            models.TeamInvitation.student_id == current_student.id
        ).with_for_update().first()
        if not invitation or invitation.team_id != team.id:
            raise HTTPException(status_code=404, detail="Invitation not found")
        if invitation.invited_by != team.created_by:
            raise HTTPException(status_code=409, detail="Invitation is no longer valid")
        if _invitation_expired(invitation):
            raise HTTPException(
                status_code=409,
                detail="This invitation has expired. Ask the team owner to send a new one."
            )
        if db.query(models.TeamMember).filter(
            models.TeamMember.student_id == current_student.id
        ).first():
            raise HTTPException(status_code=409, detail="You are already in a team")
        if team.spots_available <= 0 or db.query(models.TeamMember).filter(
            models.TeamMember.team_id == team.id
        ).count() >= MAX_TEAM_MEMBERS:
            raise HTTPException(status_code=409, detail="This team has no available spots")

        db.add(models.TeamMember(team_id=team.id, student_id=current_student.id))
        db.delete(invitation)
        team.spots_available -= 1
        _clamp_spots_available(db, team)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            # unique_student_team fired: this student reached another
            # team between our check and our insert. Surface the real
            # business rule instead of a generic failure.
            if "unique_student_team" in str(exc.orig):
                log_event(
                    "team_join_rejected",
                    reason="already_in_a_team",
                    student_id=current_student.id,
                    team_id=invitation.team_id,
                )
                raise HTTPException(
                    status_code=409, detail="You are already in a team"
                )
            raise HTTPException(status_code=409, detail="Could not join the team")

        log_event("team_joined", student_id=current_student.id,
                  team_id=invitation.team_id, invitation_id=invitation_id)
        return {"message": f"You joined {team.name}"}
    finally:
        db.close()


@app.delete("/invitations/{invitation_id}")
def decline_invitation(
    invitation_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    db = database.SessionLocal()
    try:
        invitation = db.query(models.TeamInvitation).filter(
            models.TeamInvitation.id == invitation_id,
            models.TeamInvitation.student_id == current_student.id
        ).first()
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")
        db.delete(invitation)
        db.commit()
        return {"message": "Invitation declined"}
    finally:
        db.close()

@app.delete("/teams/{team_id}/members/{student_id}")
def remove_team_member(
    team_id: int,
    student_id: int,
    current_student: models.Student = Depends(get_current_student)
):
    db = database.SessionLocal()

    team = db.query(models.Team).filter(
        models.Team.id == team_id
    ).with_for_update().first()

    if not team:
        db.close()
        raise HTTPException(status_code=404, detail="Team not found")

    # Only the team owner can remove members
    if team.created_by != current_student.id:
        db.close()
        raise HTTPException(
            status_code=403,
            detail="Only the team owner can remove members"
        )

    # Owner cannot remove themselves
    if student_id == team.created_by:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Team owner cannot be removed"
        )

    membership = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.student_id == student_id
    ).first()

    if not membership:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Student is not a member of this team"
        )

    db.delete(membership)

    # One spot becomes available again
    team.spots_available += 1
    _clamp_spots_available(db, team)

    db.commit()
    db.close()

    return {
        "message": "Student removed from team",
        "spots_available": team.spots_available
    }