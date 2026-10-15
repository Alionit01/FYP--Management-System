/* Tests for the invitation presentation helpers (src/lib/invitations.js).

   These functions decide what the invitation surfaces *say*: how long
   an offer has left, how long ago it was sent, and whether a button may
   be pressed at all. The wording has to be right — "Expires tomorrow"
   on an offer that lapsed yesterday is the kind of small lie that makes
   people stop trusting an interface — so the boundaries are pinned
   here rather than left to be discovered in the browser.

   Run with `npm test` (Node's built-in runner, no extra dependency). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  INVITATION_TTL_DAYS,
  candidateStatus,
  daysRemaining,
  describeElapsed,
  describeExpiry,
  isActionable,
  memberCountLabel,
  spotsLabel,
  withCandidateStatus,
} from "../src/lib/invitations.js";

/* A fixed clock so nothing here depends on when the suite runs. */
const NOW = Date.parse("2026-10-15T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const at = (offsetMs) => new Date(NOW + offsetMs).toISOString();

/* --- the deadline ---------------------------------------------------- */

test("days left rounds up, so the last day reads as a day", () => {
  assert.equal(daysRemaining(at(3 * DAY), NOW), 3);
  assert.equal(daysRemaining(at(12 * HOUR), NOW), 1);
  assert.equal(daysRemaining(at(5 * 60 * 1000), NOW), 1);
});

test("a lapsed deadline has zero days left, never a negative count", () => {
  assert.equal(daysRemaining(at(-3 * DAY), NOW), 0);
  assert.equal(daysRemaining(at(-1), NOW), 0);
});

test("a missing or unparseable deadline is unknown, not a crash", () => {
  assert.equal(daysRemaining(undefined, NOW), null);
  assert.equal(daysRemaining(null, NOW), null);
  assert.equal(daysRemaining("not a date", NOW), null);
});

/* --- how long ago ---------------------------------------------------- */

test("elapsed time is phrased the way a person would say it", () => {
  assert.equal(describeElapsed(at(-10 * 1000), NOW), "just now");
  assert.equal(describeElapsed(at(-5 * 60 * 1000), NOW), "5 minutes ago");
  assert.equal(describeElapsed(at(-1 * 60 * 1000), NOW), "1 minute ago");
  assert.equal(describeElapsed(at(-3 * HOUR), NOW), "3 hours ago");
  assert.equal(describeElapsed(at(-25 * HOUR), NOW), "yesterday");
  assert.equal(describeElapsed(at(-4 * DAY), NOW), "4 days ago");
});

test("an unreadable timestamp renders as nothing rather than 'NaN ago'", () => {
  assert.equal(describeElapsed(undefined, NOW), null);
  assert.equal(describeElapsed("soon™", NOW), null);
});

/* --- the badge -------------------------------------------------------- */

test("a live deadline says how long is left and never shouts", () => {
  assert.deepEqual(describeExpiry({ expires_at: at(10 * DAY) }, NOW), {
    tone: "neutral",
    label: "Expires in 10 days",
    expired: false,
    urgent: false,
  });
  assert.deepEqual(describeExpiry({ expires_at: at(3 * DAY) }, NOW), {
    tone: "warning",
    label: "Expires in 3 days",
    expired: false,
    urgent: true,
  });
  assert.equal(
    describeExpiry({ expires_at: at(12 * HOUR) }, NOW).label,
    "Expires tomorrow"
  );
});

test("a lapsed deadline is labelled as history, not as a live offer", () => {
  const expired = describeExpiry({ expires_at: at(-2 * DAY) }, NOW);
  assert.equal(expired.expired, true);
  assert.equal(expired.tone, "danger");
  assert.equal(expired.label, "Expired 2 days ago");
});

test("a deadline landing minutes from now still counts as tomorrow", () => {
  // The rounding rule from daysRemaining, restated where it matters:
  // anything inside the next 24 hours is "tomorrow", never "0 days".
  const expiry = describeExpiry({ expires_at: at(60 * 1000) }, NOW);
  assert.equal(expiry.label, "Expires tomorrow");
  assert.doesNotMatch(expiry.label, /0 days/);
});

test("an invitation with no deadline is not presented as expiring", () => {
  assert.deepEqual(describeExpiry({ expires_at: null }, NOW), {
    tone: "neutral",
    label: "No expiry",
    expired: false,
    urgent: false,
  });
  assert.deepEqual(describeExpiry({}, NOW).label, "No expiry");
});

test("only a passed deadline stops an invitation being actionable", () => {
  assert.equal(isActionable({ expires_at: at(1) }, NOW), true);
  assert.equal(isActionable({ expires_at: at(-1) }, NOW), false);
  assert.equal(isActionable({ expires_at: null }, NOW), true);
  assert.equal(isActionable(undefined, NOW), true);
});

/* --- what may be pressed ---------------------------------------------- */

test("only a student who could actually join can be invited", () => {
  assert.equal(candidateStatus("invitable").canInvite, true);
  assert.equal(candidateStatus("invited").canInvite, false);
  assert.equal(candidateStatus("in-team").canInvite, false);
  // An unrecognised status fails closed: no button, no guessing.
  assert.equal(candidateStatus(undefined).canInvite, false);
  assert.equal(candidateStatus("who-knows").canInvite, false);
});

test("every unavailable status says why", () => {
  assert.equal(candidateStatus("invited").hint, "Waiting for a reply");
  assert.equal(candidateStatus("in-team").hint, "Already belongs to a team");
});

test("the optimistic row flip only touches the student it names", () => {
  const rows = [
    { id: 7, name: "Sara Ahmed", status: "invitable" },
    { id: 8, name: "Hamza Ali", status: "invitable" },
  ];

  // Sending an invitation marks that one row — and only that row — as
  // taken, so the owner's list never claims a click is still available
  // when it is not.
  const invited = withCandidateStatus(rows, 7, "invited");
  assert.equal(invited.find((row) => row.id === 7).status, "invited");
  assert.equal(invited.find((row) => row.id === 8).status, "invitable");
  // The source list is left alone, so React can tell the state changed.
  assert.equal(rows[0].status, "invitable");

  // Revoking puts the button back, which is the whole point: without it
  // the owner is left staring at "Invited" for a student nobody invited.
  const revoked = withCandidateStatus(invited, 7, "invitable");
  assert.equal(revoked.find((row) => row.id === 7).status, "invitable");

  // A student who is not in the list (or an empty result) is a no-op,
  // never a crash — revoking must work with the search cleared.
  assert.deepEqual(withCandidateStatus(rows, 999, "invited"), rows);
  assert.equal(withCandidateStatus(null, 7, "invited"), null);
  assert.equal(withCandidateStatus(undefined, 7, "invited"), undefined);
});

/* --- counts ------------------------------------------------------------ */

test("member and spot labels stay plural-correct", () => {
  assert.equal(memberCountLabel(1, 4), "1 of 4 members");
  assert.equal(memberCountLabel(4, 4), "4 of 4 members");
  assert.equal(spotsLabel(1), "1 spot open");
  assert.equal(spotsLabel(3), "3 spots open");
  assert.equal(spotsLabel(0), "No spots open");
  assert.equal(spotsLabel(-2), "No spots open");
});

/* --- FE/backend agreement --------------------------------------------- */

test("the frontend agrees with the backend about how long an invitation lasts", () => {
  // backend/app/models.py defines INVITATION_TTL_DAYS. If the two ever
  // drift, the inbox would promise a deadline the API does not honour.
  const source = readFileSync(
    new URL("../../backend/app/models.py", import.meta.url),
    "utf8"
  );
  const match = source.match(/^INVITATION_TTL_DAYS = (\d+)$/m);

  assert.ok(match, "INVITATION_TTL_DAYS not found in backend/app/models.py");
  assert.equal(Number(match[1]), INVITATION_TTL_DAYS);
});
