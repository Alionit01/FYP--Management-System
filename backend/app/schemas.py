from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

import base64
import binascii


def _validate_url(value: Optional[str]) -> Optional[str]:
    if value is None:
        return value
    if not value.strip():
        # Optional link fields: blank or whitespace-only means "empty".
        # Normalized to "" so it matches the omitted/empty-string path.
        return ""
    lowered = value.strip().lower()
    if not (lowered.startswith("https://") or lowered.startswith("http://")):
        raise ValueError(
            "URL must start with http:// or https://"
        )
    return value


# ---------------------------------------------------------------------------
# Profile pictures (audit SEC-08)
# ---------------------------------------------------------------------------
#
# Pictures are stored and served as inline ``data:`` URLs. Before this,
# any string beginning with ``data:image/`` was accepted verbatim and
# never inspected: a 3 MB payload passed validation, was stored, and
# then travelled back out of *every* directory listing. Limits are
# therefore applied here, at the single point where a picture enters
# the system, and they are checked before any decoding so a huge string
# cannot force a huge allocation.

# An avatar is a small, round image. The frontend's upload control has
# always documented "a file under 1 MB" (MyProfile.jsx), so 1 MB
# decoded is the authoritative product limit; the backend now enforces
# the same rule instead of nothing at all. Directory listings are
# bounded separately, below, so this cap does not translate into large
# list responses.
MAX_PICTURE_DECODED_BYTES = 1024 * 1024

# base64 expands 3 bytes into 4 characters, plus up to two '=' padding
# characters. Used as a cheap early rejection before decoding.
MAX_PICTURE_ENCODED_CHARS = ((MAX_PICTURE_DECODED_BYTES + 2) // 3) * 4 + 8

# Absolute ceiling on the incoming string, checked before anything else
# so an absurd value is refused without being split or decoded. It is
# deliberately looser than the encoded cap so that a payload wrapped in
# line breaks (legal base64) is judged on its bytes, not its wrapping.
MAX_PICTURE_RAW_CHARS = MAX_PICTURE_ENCODED_CHARS * 2

# Directory listings cap how much picture they inline. A student list of
# 50 fully-loaded avatars would otherwise be tens of megabytes; the
# frontend's <Avatar> component already falls back to an initial badge
# when no picture is supplied, so omitting it here is invisible to the
# user while the full-size image remains available on the profile page.
DIRECTORY_PICTURE_INLINE_LIMIT = 64 * 1024

# Raster formats only. SVG is deliberately excluded: it is markup rather
# than an image and is a stored-XSS vector wherever it is rendered
# inline. The declared type is never trusted on its own — the bytes are
# checked against the signature for that type below.
_PICTURE_SIGNATURES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/gif": (b"GIF87a", b"GIF89a"),
}


def _signature_matches(mime: str, raw: bytes) -> bool:
    """Does the payload actually begin with this format's magic bytes?"""
    if mime == "image/webp":
        # RIFF container: "RIFF" <size> "WEBP".
        return len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"
    return any(raw.startswith(sig) for sig in _PICTURE_SIGNATURES[mime])


def _validate_picture(value: Optional[str]) -> Optional[str]:
    """Accept a normal image URL, or a small verified raster data URL."""
    if value is None:
        return value
    if not value.strip():
        return ""
    candidate = value.strip()

    # Checked first, for both branches, so an absurd value is refused on
    # length alone and never split or decoded.
    if len(candidate) > MAX_PICTURE_RAW_CHARS:
        raise ValueError(
            "Profile picture is too large "
            f"(limit {MAX_PICTURE_DECODED_BYTES // 1024} KB)"
        )

    if not candidate.lower().startswith("data:"):
        return _validate_url(value)

    header, sep, payload = candidate.partition(",")
    if not sep:
        raise ValueError("Profile picture is not a valid data URL")

    parts = header[len("data:"):].split(";")
    if parts[-1].strip().lower() != "base64":
        raise ValueError("Profile picture must use base64 encoding")
    mime = parts[0].strip().lower()
    if mime not in _PICTURE_SIGNATURES and mime != "image/webp":
        raise ValueError(
            "Profile picture must be a JPEG, PNG, GIF, or WebP image"
        )

    # Encoders may wrap long payloads; whitespace carries no bytes, so
    # the real cap is applied to the payload on its own. This is still
    # before any decoding.
    encoded = "".join(payload.split())
    if len(encoded) > MAX_PICTURE_ENCODED_CHARS:
        raise ValueError(
            "Profile picture is too large "
            f"(limit {MAX_PICTURE_DECODED_BYTES // 1024} KB)"
        )

    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise ValueError(
            "Profile picture is not valid base64 data"
        ) from None

    if not raw:
        raise ValueError("Profile picture is empty")
    if len(raw) > MAX_PICTURE_DECODED_BYTES:
        raise ValueError(
            "Profile picture is too large "
            f"(limit {MAX_PICTURE_DECODED_BYTES // 1024} KB)"
        )
    if not _signature_matches(mime, raw):
        raise ValueError(
            "Profile picture content does not match its declared type"
        )

    return value




MAX_TEAM_MEMBERS = 4
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


class StudentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    university_id: str = Field(min_length=1, max_length=50)
    email: EmailStr
    program: str

    # Only used when the supervised pilot is enabled (see
    # pilot_onboarding_enabled in app/main.py). Ignored by the
    # normal email-verification flow, which sets the password at
    # verification time instead.
    password: Optional[str] = Field(default=None, max_length=72)

    # Rejected by length inside _validate_picture, before any decoding,
    # so an enormous string never reaches base64 (SEC-08).
    profile_picture: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=1000)
    github: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    skills: Optional[str] = Field(default=None, max_length=1000)
    interests: Optional[str] = Field(default=None, max_length=1000)
    fyp_status: Optional[str] = None


    @field_validator("github", "linkedin")
    @classmethod
    def _check_urls(cls, v):
        return _validate_url(v)

    @field_validator("profile_picture")
    @classmethod
    def _check_picture(cls, v):
        return _validate_picture(v)

    @field_validator("password")
    @classmethod
    def _check_password(cls, v):
        # Pilot-only field: same policy as VerificationRequest.
        if v is None:
            return v
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes (UTF-8)")
        return v


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    project_title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)

    department_preference: str

    spots_available: int = Field(
        ge=0,
        le=MAX_TEAM_MEMBERS - 1
    )

    skills_needed: Optional[str] = Field(default=None, max_length=1000)
    roles_needed: Optional[str] = Field(default=None, max_length=1000)
    contact: Optional[str] = Field(default=None, max_length=200)


class VerificationRequest(BaseModel):
    token: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=6, max_length=72)

    @field_validator("password")
    @classmethod
    def _check_password_bytes(cls, v):
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes (UTF-8)")
        return v


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=6, max_length=72)

    @field_validator("password")
    @classmethod
    def _check_password_bytes(cls, v):
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes (UTF-8)")
        return v


class StudentLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    @field_validator("password")
    @classmethod
    def _check_password_bytes(cls, v):
        if len(v.encode("utf-8")) > 72:
            raise ValueError(
                "Password must be at most 72 bytes (UTF-8)"
            )
        return v


class StudentUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    program: str

    # Rejected by length inside _validate_picture, before any decoding,
    # so an enormous string never reaches base64 (SEC-08).
    profile_picture: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=1000)
    github: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    skills: Optional[str] = Field(default=None, max_length=1000)
    interests: Optional[str] = Field(default=None, max_length=1000)
    fyp_status: Optional[str] = None


    @field_validator("github", "linkedin")
    @classmethod
    def _check_urls(cls, v):
        return _validate_url(v)

    @field_validator("profile_picture")
    @classmethod
    def _check_picture(cls, v):
        return _validate_picture(v)

class TeamUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    project_title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    department_preference: str
    spots_available: int = Field(ge=0, le=MAX_TEAM_MEMBERS - 1)
    skills_needed: Optional[str] = Field(default=None, max_length=1000)
    roles_needed: Optional[str] = Field(default=None, max_length=1000)
    contact: Optional[str] = Field(default=None, max_length=200)