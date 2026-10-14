"""SEC-08: bound profile-picture size, format, and content.

Audit finding SEC-08. ``_validate_picture`` accepted any string that
began with ``data:image/``. It was never length-checked and never
inspected, so a 3 MB payload passed validation, was stored, and then
travelled back out of every directory listing. The audit measured a
533,231-character value already sitting in the database.

The fix is applied where a picture enters the system — the Pydantic
validator shared by registration and profile updates:

* a size cap, checked against the *decoded* byte length (base64 expands
  a payload by a third, so the encoded form is rejected early too),
* an explicit format allow-list. SVG is excluded because it is markup,
  not an image,
* the payload must actually decode as base64,
* and the bytes must match the signature of the type the header claims,
  so the declared MIME type is never trusted on its own.

Separately, directory listings no longer inline every avatar, which is
what made the response size unbounded.

Existing oversized rows are reported, never rewritten or deleted.
"""

import base64
import os
import tempfile
import unittest

# Never connect tests to a configured development or production database.
_test_directory = tempfile.TemporaryDirectory(dir="/tmp/opencode")
os.environ["DATABASE_URL"] = (
    f"sqlite+pysqlite:///{_test_directory.name}/sec08.sqlite"
)
os.environ["SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["UNIVERSITY_EMAIL_DOMAIN"] = "iqra.edu.pk"
os.environ.setdefault("PILOT_ONBOARDING_ENABLED", "false")

from pydantic import ValidationError  # noqa: E402

from app import main, models, schemas  # noqa: E402
from app.auth import create_access_token, hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.migrations import run_migrations  # noqa: E402
from app.schemas import StudentCreate, StudentUpdate  # noqa: E402


# A real, decodable 1x1 PNG.
_PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
    "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)

_JPEG_HEADER = b"\xff\xd8\xff\xe0" + b"\x00" * 12
_GIF_HEADER = b"GIF89a" + b"\x00" * 12
_WEBP_HEADER = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 12


def data_url(mime: str, raw: bytes) -> str:
    return f"data:{mime};base64,{base64.b64encode(raw).decode()}"


def padded(raw: bytes, size: int) -> bytes:
    """A payload of at least ``size`` bytes that keeps valid magic bytes."""
    if len(raw) >= size:
        return raw
    return raw + b"\x00" * (size - len(raw))


class PictureValidatorTests(unittest.TestCase):
    """The validator is the single gate for registration and updates."""

    def test_accepts_a_real_png(self):
        value = data_url("image/png", _PNG_1PX)
        self.assertEqual(schemas._validate_picture(value), value)

    def test_accepts_jpeg_gif_and_webp_signatures(self):
        for mime, raw in (
            ("image/jpeg", _JPEG_HEADER),
            ("image/gif", _GIF_HEADER),
            ("image/webp", _WEBP_HEADER),
        ):
            value = data_url(mime, raw)
            self.assertEqual(schemas._validate_picture(value), value, mime)

    def test_accepts_an_https_url(self):
        url = "https://cdn.example.com/avatar.png"
        self.assertEqual(schemas._validate_picture(url), url)

    def test_blank_still_normalizes_to_empty_string(self):
        self.assertEqual(schemas._validate_picture("   "), "")

    def test_none_passes_through(self):
        self.assertIsNone(schemas._validate_picture(None))

    def test_rejects_a_malformed_data_url(self):
        with self.assertRaises(ValidationError):
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture="data:image/png;base64")

    def test_rejects_a_non_base64_data_url(self):
        # Percent-encoded raw bytes would bypass the size accounting.
        value = "data:image/png,not%20base64"
        with self.assertRaises(ValidationError):
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=value)

    def test_rejects_invalid_base64(self):
        value = data_url("image/png", _PNG_1PX)
        value = value[:-4] + "!!!!"
        with self.assertRaises(ValidationError):
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=value)

    def test_rejects_an_empty_picture(self):
        value = "data:image/png;base64,"
        with self.assertRaises(ValidationError):
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=value)

    def test_rejects_svg(self):
        # Markup, not an image. Rendered inline it is a stored-XSS vector.
        svg = b"<svg xmlns='http://www.w3.org/2000/svg'></svg>"
        with self.assertRaises(ValidationError):
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=data_url("image/svg+xml", svg))

    def test_rejects_an_unlisted_format(self):
        with self.assertRaises(ValidationError):
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=data_url("image/tiff", b"II*\x00"))

    def test_rejects_content_that_contradicts_the_declared_type(self):
        # Bytes are a PNG, the header claims JPEG. The declared type is
        # never trusted on its own.
        with self.assertRaises(ValidationError):
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=data_url("image/jpeg", _PNG_1PX))

    def test_rejects_an_oversized_payload(self):
        raw = padded(_PNG_1PX, schemas.MAX_PICTURE_DECODED_BYTES + 1)
        with self.assertRaises(ValidationError) as ctx:
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=data_url("image/png", raw))
        self.assertIn("too large", str(ctx.exception))

    def test_rejects_the_three_megabyte_payload_from_the_audit(self):
        raw = padded(_PNG_1PX, 3 * 1024 * 1024)
        with self.assertRaises(ValidationError):
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=data_url("image/png", raw))

    def test_accepts_a_picture_at_the_limit(self):
        raw = padded(_PNG_1PX, schemas.MAX_PICTURE_DECODED_BYTES)
        value = data_url("image/png", raw)
        self.assertEqual(schemas._validate_picture(value), value)

    def test_rejects_a_vast_string_before_decoding(self):
        # Past the absolute ceiling: refused without being split.
        huge = "data:image/png;base64," + "A" * (
            schemas.MAX_PICTURE_RAW_CHARS + 1000)
        with self.assertRaises(ValidationError) as ctx:
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=huge)
        self.assertIn("too large", str(ctx.exception))

    def test_rejects_an_oversized_payload_wrapped_in_whitespace(self):
        # Under the raw ceiling (so it is not refused on sight) but over
        # the real cap once the wrapping is stripped.
        payload = ("A" * 76 + "\n") * (
            schemas.MAX_PICTURE_ENCODED_CHARS // 76 + 20)
        value = "data:image/png;base64," + payload
        self.assertLess(len(value), schemas.MAX_PICTURE_RAW_CHARS)
        with self.assertRaises(ValidationError) as ctx:
            StudentCreate(name="Test Student", university_id="A1",
                          email="a1@iqra.edu.pk", program="BSCS",
                          profile_picture=value)
        self.assertIn("too large", str(ctx.exception))

    def test_applies_to_profile_updates_too(self):
        raw = padded(_PNG_1PX, schemas.MAX_PICTURE_DECODED_BYTES + 1)
        with self.assertRaises(ValidationError):
            StudentUpdate(profile_picture=data_url("image/png", raw))


class DirectoryListingTests(unittest.TestCase):
    """A directory page must not ship every avatar inline."""

    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        run_migrations(engine)

    def tearDown(self):
        Base.metadata.drop_all(engine)

    def _seed_student(self, *, uid, email, picture=None):
        db = SessionLocal()
        try:
            student = models.Student(
                name=f"Student {uid}", university_id=uid, email=email,
                password=hash_password("Password123"), program="BSCS",
                email_verified=True, role="student",
                profile_picture=picture,
            )
            db.add(student)
            db.commit()
            db.refresh(student)
            return student.id
        finally:
            db.close()

    def _token(self, student_id):
        return create_access_token(student_id)

    def _get(self, path, token):
        import asyncio

        scope = {
            "type": "http", "asgi": {"version": "3.0"},
            "http_version": "1.1", "method": "GET", "scheme": "http",
            "path": path, "raw_path": path.encode(), "query_string": b"",
            "root_path": "",
            "headers": [(b"host", b"testserver"),
                        (b"authorization", f"Bearer {token}".encode())],
            "client": ("127.0.0.1", 12345), "server": ("testserver", 80),
        }
        sent = []

        async def receive():
            return {"type": "http.disconnect"}

        async def send(message):
            sent.append(message)

        asyncio.run(main.app(scope, receive, send))
        raw = b"".join(m.get("body", b"")
                       for m in sent if m["type"] == "http.response.body")
        status = next((m["status"] for m in sent
                       if m["type"] == "http.response.start"), None)
        import json
        return status, json.loads(raw) if raw else None

    def test_list_omits_large_pictures_but_detail_keeps_them(self):
        big = data_url("image/png",
                       padded(_PNG_1PX, 200 * 1024))
        small = data_url("image/png", _PNG_1PX)
        viewer = self._seed_student(uid="V1", email="v1@iqra.edu.pk")
        big_id = self._seed_student(uid="B1", email="b1@iqra.edu.pk",
                                    picture=big)
        self._seed_student(uid="S1", email="s1@iqra.edu.pk", picture=small)
        token = self._token(viewer)

        status, listing = self._get("/students", token)
        self.assertEqual(status, 200)
        by_id = {entry["id"]: entry for entry in listing}

        self.assertIsNone(
            by_id[big_id]["profile_picture"],
            "an oversized avatar must not be inlined in the directory")
        small_id = next(s["id"] for s in listing
                        if s["university_id"] == "S1")
        self.assertEqual(
            by_id[small_id]["profile_picture"], small,
            "a small avatar still fits the inline budget")

        # The picture itself is untouched and still served in full by
        # the profile page.
        status, detail = self._get(f"/students/{big_id}", token)
        self.assertEqual(status, 200)
        self.assertEqual(detail["profile_picture"], big)

    def test_listing_size_is_bounded_by_the_inline_budget(self):
        for i in range(5):
            self._seed_student(
                uid=f"P{i}", email=f"p{i}@iqra.edu.pk",
                picture=data_url("image/png", padded(_PNG_1PX, 400 * 1024)))
        viewer = self._seed_student(uid="V1", email="v1@iqra.edu.pk")

        import json
        status, listing = self._get("/students", self._token(viewer))
        self.assertEqual(status, 200)
        size = len(json.dumps(listing))
        budget = (schemas.DIRECTORY_PICTURE_INLINE_LIMIT + 512) * 5
        self.assertLess(
            size, budget,
            f"directory payload of {size} bytes exceeds the inline budget")


if __name__ == "__main__":
    unittest.main()
