"""Structured application logging (audit REL-04).

Before this, the application emitted no application-level logging at
all: a failed sign-in, a rejected administrator action, or a team being
created left no trace anywhere, so "who did what, and did it work?" was
unanswerable after the fact. Uvicorn's own access log records HTTP
traffic, but not the decisions behind a response.

What this module provides
-------------------------
* A consistent ``key=value`` line format that a log aggregator (or a
  plain ``grep``) can read, emitted on the ``fyp`` logger.
* ``log_event(...)`` for the events worth recording, and
  ``log_exception(...)`` for failures that reach the handler.

What it deliberately does not do
--------------------------------
* It logs **no credentials and no personal data**. Not passwords, not
  tokens, not email addresses. Events carry numeric ids and enums, so a
  log line can be correlated with a database row without the log itself
  becoming a second copy of personal data.
* It is not monitoring. Nothing here ships these lines anywhere, and
  no alerting is configured. Writing a line is not the same as being
  able to see it; that needs a collector and a dashboard, which are
  deployment decisions and have not been made.
"""

from __future__ import annotations

import logging
import sys

APP_LOGGER_NAME = "fyp"

_configured = False


def _quote(value: str) -> str:
    """Render a value safely inside a key=value line."""
    text = str(value)
    if not text:
        return '""'
    if any(ch.isspace() for ch in text) or "=" in text or '"' in text:
        return '"' + text.replace('"', "'").replace("\n", " ") + '"'
    return text


class EventLogger(logging.LoggerAdapter):
    """Logger whose extra fields are rendered as key=value pairs."""

    def process(self, msg, kwargs):
        fields = kwargs.pop("extra", {}) or {}
        parts = [str(msg)]
        for key, value in fields.items():
            if value is None:
                continue
            parts.append(f"{key}={_quote(value)}")
        return " ".join(parts), kwargs


def get_event_logger(name: str = APP_LOGGER_NAME) -> EventLogger:
    """An event logger. Safe to call before or after configure()."""
    return EventLogger(logging.getLogger(name), {})


def configure(level: int = logging.INFO) -> None:
    """Install the one-line-per-event handler. Idempotent."""
    global _configured
    logger = logging.getLogger(APP_LOGGER_NAME)
    logger.setLevel(level)

    if _configured:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
    logger.addHandler(handler)
    # Do not double-emit through the root logger.
    logger.propagate = False
    _configured = True


def log_event(event: str, **fields) -> None:
    """Record a significant, successful-or-rejected action."""
    get_event_logger().info(event, extra=fields)


def log_warning(event: str, **fields) -> None:
    get_event_logger().warning(event, extra=fields)


def log_exception(event: str, **fields) -> None:
    """Record a failure with its traceback.

    Called from the catch-all exception handler, so an unexpected 500
    leaves a stack trace behind instead of only an opaque client
    message.
    """
    get_event_logger().exception(event, extra=fields)
