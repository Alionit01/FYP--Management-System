import os
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlencode


def send_verification_email(address: str, token: str) -> None:
    required = (
        "SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD",
        "SMTP_FROM", "FRONTEND_URL",
    )
    config = {key: os.getenv(key) for key in required}
    if not all(config.values()):
        raise RuntimeError("Email delivery is not configured")

    frontend_url = config["FRONTEND_URL"].rstrip("/")
    if not frontend_url.startswith("https://") and not frontend_url.startswith(
        "http://localhost:"
    ):
        raise RuntimeError("FRONTEND_URL must use HTTPS (or localhost for development)")

    # Fragments are not sent to the frontend host in HTTP requests or access logs.
    url = f"{frontend_url}/verify-email#{urlencode({'token': token})}"
    message = EmailMessage()
    message["Subject"] = "Verify your FYP Finder email"
    message["From"] = config["SMTP_FROM"]
    message["To"] = address
    message.set_content(
        f"Confirm your FYP Finder registration and set your password. "
        f"This link expires in one hour:\n\n{url}\n\n"
        "If you did not register, you can ignore this message."
    )

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


def send_password_reset_email(address: str, token: str) -> None:
    required = (
        "SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD",
        "SMTP_FROM", "FRONTEND_URL",
    )
    config = {key: os.getenv(key) for key in required}
    if not all(config.values()):
        raise RuntimeError("Email delivery is not configured")

    frontend_url = config["FRONTEND_URL"].rstrip("/")
    if not frontend_url.startswith("https://") and not frontend_url.startswith(
        "http://localhost:"
    ):
        raise RuntimeError("FRONTEND_URL must use HTTPS (or localhost for development)")

    url = f"{frontend_url}/reset-password#{urlencode({'token': token})}"
    message = EmailMessage()
    message["Subject"] = "Reset your FYP Finder password"
    message["From"] = config["SMTP_FROM"]
    message["To"] = address
    message.set_content(
        f"We received a request to reset your FYP Finder password. "
        f"This link expires in one hour:\n\n{url}\n\n"
        "If you did not make this request, you can ignore this message."
    )

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
