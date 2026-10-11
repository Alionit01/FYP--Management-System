# Registration and team invitations

Configure `DATABASE_URL`, `SECRET_KEY`, and `UNIVERSITY_EMAIL_DOMAIN` as before. Registration also requires `FRONTEND_URL` (an HTTPS URL outside local development). Email delivery prefers the Resend API when `RESEND_API_KEY` is set: point `EMAIL_FROM` at a sender on a verified domain — the default `onboarding@resend.dev` is Resend's test sender and only delivers to the Resend account owner's own address, so production student mail requires domain verification. Without a Resend key, the legacy SMTP settings in `.env.example` are used (port 587 uses STARTTLS; port 465 uses implicit TLS); with neither configured, a localhost-only development fallback prints the link to the backend console. If email delivery fails outside that fallback, signup returns 503 and does not create a student account. Never use the placeholder credentials from `.env.example` in a deployment.

University IDs must match the local part of the university email address case-insensitively — either the whole local part (`67267@iqra.edu.pk`) or after a dot (`ali.67267@iqra.edu.pk`). Signup sends a one-hour link to that address. Following the link opens the frontend verification form, where the mailbox holder sets a password. New student accounts are created only when that form is submitted successfully.

Unverified accounts created by older versions can be reclaimed when a verified mailbox owner completes registration, provided only one legacy row conflicts. If **multiple** legacy unverified rows conflict with the same email/ID, verification returns 409 and an operator must review the conflicting records; the app does not delete multiple accounts automatically. Previously logged verification links are no longer accepted.

Owners now send invitations rather than directly adding students. Invitees see pending invitations on **My Team** when they are not in a team, and must accept one before membership is created. Invitations are removed when a team is deleted or leadership changes.

Run the focused backend tests from `backend/` with:

```sh
.venv/bin/python -m unittest discover -s tests -v
```
