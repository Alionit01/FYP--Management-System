import os
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlencode

# Resend's permitted test sender. It can ONLY deliver to the email
# address of the Resend account owner; real student mail requires a
# verified domain via EMAIL_FROM.
RESEND_TEST_SENDER = "onboarding@resend.dev"

_SMTP_REQUIRED = (
    "SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM",
)


def _frontend_url() -> str:
    frontend_url = (os.getenv("FRONTEND_URL") or "").rstrip("/")
    if not frontend_url:
        raise RuntimeError("FRONTEND_URL is not configured")
    if not frontend_url.startswith("https://") and not frontend_url.startswith(
        "http://localhost:"
    ):
        raise RuntimeError(
            "FRONTEND_URL must use HTTPS (or localhost for development)"
        )
    return frontend_url


def _email_from() -> str:
    # Configurable sender; defaults to Resend's test sender.
    return (os.getenv("EMAIL_FROM") or "").strip() or RESEND_TEST_SENDER


def _send_with_resend(address: str, subject: str, body: str) -> None:
    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not configured")

    import resend

    resend.api_key = api_key
    try:
        resend.Emails.send({
            "from": _email_from(),
            "to": [address],
            "subject": subject,
            "text": body,
        })
    except Exception:
        # The provider error may echo request details; never surface it
        # to callers (they turn it into a generic 503) and never log it
        # here. No keys, tokens, or message bodies are written anywhere.
        raise RuntimeError("Email provider rejected the message") from None


def _send_with_smtp(address: str, subject: str, body: str) -> None:
    config = {key: os.getenv(key) for key in _SMTP_REQUIRED}
    if not all(config.values()):
        # Development fallback: print the link to the backend console so
        # registration and password reset can continue without any email
        # provider. Only allowed when the frontend runs on localhost;
        # production (https FRONTEND_URL) still fails loudly instead of
        # leaking tokens to a console.
        frontend_url = _frontend_url()
        if frontend_url.startswith("http://localhost:"):
            print(
                f"[dev email fallback] {subject} -> {address}\n{body}",
                flush=True,
            )
            return
        raise RuntimeError("Email delivery is not configured")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = config["SMTP_FROM"]
    message["To"] = address
    message.set_content(body)

    port = int(config["SMTP_PORT"])
    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(config["SMTP_HOST"], port, timeout=10,
                              context=context) as smtp:
            smtp.login(config["SMTP_USERNAME"], config["SMTP_PASSWORD"])
            smtp.send_message(message)
    else:
        with smtplib.SMTP(config["SMTP_HOST"], port, timeout=10) as smtp:
            smtp.starttls(context=context)
            smtp.login(config["SMTP_USERNAME"], config["SMTP_PASSWORD"])
            smtp.send_message(message)


def _deliver(address: str, subject: str, body: str) -> None:
    # Transport order: Resend API (if RESEND_API_KEY is set), then the
    # legacy SMTP path, then the localhost console fallback.
    if (os.getenv("RESEND_API_KEY") or "").strip():
        _send_with_resend(address, subject, body)
        return
    _send_with_smtp(address, subject, body)


def send_verification_email(address: str, token: str) -> None:
    frontend_url = _frontend_url()
    # Fragments are not sent to the frontend host in HTTP requests or access logs.
    url = f"{frontend_url}/verify-email#{urlencode({'token': token})}"
    _deliver(
        address,
        "Verify your FYP Finder email",
        f"Confirm your FYP Finder registration and set your password. "
        f"This link expires in one hour:\n\n{url}\n\n"
        "If you did not register, you can ignore this message.",
    )


def send_password_reset_email(address: str, token: str) -> None:
    frontend_url = _frontend_url()
    # Fragments are not sent to the frontend host in HTTP requests or access logs.
    url = f"{frontend_url}/reset-password#{urlencode({'token': token})}"
    _deliver(
        address,
        "Reset your FYP Finder password",
        f"We received a request to reset your password. "
        f"This link expires in one hour:\n\n{url}\n\n"
        "If you did not make this request, you can ignore this message.",
    )
