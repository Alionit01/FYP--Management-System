/* Pure presentation helpers for the invitation system.

   Kept free of imports so they can be unit-tested with Node's test
   runner (no Vite, no DOM) — see frontend/tests/invitations.test.js.
   Everything here answers a question a person actually asks when they
   look at an invitation: "who sent this?", "is it still open?", "how
   long have I got?". */

/* Mirror of INVITATION_TTL_DAYS in backend/app/models.py. The test
   suite reads that file and compares, so the two cannot drift apart
   without `npm test` failing. */
export const INVITATION_TTL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/* A timestamp the API sent, as milliseconds. Returns null when the
   value is missing or unparseable — a display detail must never throw
   and blank the page. */
function toMillis(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/* Whole days left, rounded up, so the last day of a 14-day window
   reads "1 day" rather than "0 days". Null when there is no deadline. */
export function daysRemaining(expiresAt, now = Date.now()) {
  const expires = toMillis(expiresAt);
  if (expires === null) return null;
  return Math.max(0, Math.ceil((expires - now) / DAY_MS));
}

/* How long ago something happened, in the words a person would use. */
export function describeElapsed(iso, now = Date.now()) {
  const then = toMillis(iso);
  if (then === null) return null;

  const elapsed = now - then;
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) {
    const minutes = Math.round(elapsed / MINUTE_MS);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (elapsed < DAY_MS) {
    const hours = Math.round(elapsed / HOUR_MS);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.round(elapsed / DAY_MS);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/* The deadline, phrased for a human and coloured by urgency.

   `tone` picks the badge: danger means the offer is over or closing
   today, warning means days, neutral means plenty of time. */
export function describeExpiry(invitation, now = Date.now()) {
  const expires = toMillis(invitation?.expires_at);
  if (expires === null) {
    return { tone: "neutral", label: "No expiry", expired: false, urgent: false };
  }

  if (expires <= now) {
    return {
      tone: "danger",
      label: `Expired ${describeElapsed(invitation.expires_at, now)}`,
      expired: true,
      urgent: true,
    };
  }

  // A future deadline always has at least one day left (daysRemaining
  // rounds up), so there is no "0 days" case to phrase.
  const days = daysRemaining(invitation.expires_at, now);
  if (days === 1) {
    return { tone: "warning", label: "Expires tomorrow", expired: false, urgent: true };
  }
  if (days <= 3) {
    return { tone: "warning", label: `Expires in ${days} days`, expired: false, urgent: true };
  }
  return { tone: "neutral", label: `Expires in ${days} days`, expired: false, urgent: false };
}

/* Whether an invitation is still worth showing as actionable. Used by
   the inbox so a stale row is never rendered as a live "Accept". */
export function isActionable(invitation, now = Date.now()) {
  const expires = toMillis(invitation?.expires_at);
  return expires === null || expires > now;
}

/* The owner's search results are optimistic: sending an invitation
   flips the row to "invited" and revoking it flips the row back to
   "invitable", so the list under the cursor never lies about what a
   click will do. Returns a new array; never mutates. */
export function withCandidateStatus(results, studentId, status) {
  if (!results) return results;
  return results.map((row) =>
    row.id === studentId ? { ...row, status } : row
  );
}

/* Labels for the states a candidate can be in. `canInvite` is the
   single source of truth for whether the Invite button is enabled, so
   the button and its explanation can never disagree. */
export function candidateStatus(status) {
  switch (status) {
    case "invitable":
      return { label: "Available", canInvite: true, hint: null };
    case "invited":
      return { label: "Invited", canInvite: false, hint: "Waiting for a reply" };
    case "in-team":
      return { label: "In a team", canInvite: false, hint: "Already belongs to a team" };
    default:
      return { label: "Unavailable", canInvite: false, hint: null };
  }
}

/* "2 of 4 members" — the phrasing used in headers and summaries. The
   noun agrees with the *maximum* ("1 of 1 member"), since that is the
   number the word belongs to. */
export function memberCountLabel(count, maximum) {
  return `${count} of ${maximum} member${maximum === 1 ? "" : "s"}`;
}

/* "1 spot open" / "no spots open" — never "0 spots available". */
export function spotsLabel(spots) {
  if (spots <= 0) return "No spots open";
  return `${spots} spot${spots === 1 ? "" : "s"} open`;
}
