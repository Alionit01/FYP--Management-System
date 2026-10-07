# Registration and team invitations

Configure `DATABASE_URL`, `SECRET_KEY`, and `UNIVERSITY_EMAIL_DOMAIN` as before. Registration also requires `FRONTEND_URL` and the SMTP settings shown in `.env.example`. Use an HTTPS frontend URL outside local development. SMTP connects with TLS: port 587 uses STARTTLS; port 465 uses implicit TLS. If email delivery fails, signup returns 503 and does not create a student account.

University IDs must match the local part of the university email address (case-insensitively). Signup sends a one-hour link to that address. Following the link opens the frontend verification form, where the mailbox holder sets a password. New student accounts are created only when that form is submitted successfully. Never use the placeholder SMTP credentials from `.env.example` in a deployment.

Unverified accounts created by older versions can be reclaimed when a verified mailbox owner completes registration, provided only one legacy row conflicts. If **multiple** legacy unverified rows conflict with the same email/ID, verification returns 409 and an operator must review the conflicting records; the app does not delete multiple accounts automatically. Previously logged verification links are no longer accepted.

Owners now send invitations rather than directly adding students. Invitees see pending invitations on **My Team** when they are not in a team, and must accept one before membership is created. Invitations are removed when a team is deleted or leadership changes.

Run the focused backend tests from `backend/` with:

```sh
.venv/bin/python -m unittest discover -s tests -v
```
