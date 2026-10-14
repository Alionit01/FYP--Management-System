/* Tests for session expiry and failure classification (audit FE-03/FE-04).

   Run with `npm test`. No extra dependency: these cover the pure logic
   extracted out of the React components precisely so it could be tested
   without a DOM. */

import test from "node:test";
import assert from "node:assert/strict";

import { isTokenExpired } from "../src/api/token.js";
import { classifyFailure } from "../src/api/errors.js";

/* A JWT's payload is the middle segment, base64url-encoded. Signing is
   irrelevant here — the app only ever reads `exp` client-side. btoa is
   used rather than Buffer so this file needs no Node-specific globals. */
function fakeToken(payload) {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${encoded}.signature`;
}

const NOW = 1_700_000_000_000; // fixed clock
const HOUR = 3600 * 1000;

/* --- FE-03: an open tab must notice its session ending --------------- */

test("a token that expires in the future is still good", () => {
  const token = fakeToken({ sub: "1", exp: (NOW + HOUR) / 1000 });
  assert.equal(isTokenExpired(token, NOW), false);
});

test("a token that has already expired is rejected", () => {
  const token = fakeToken({ sub: "1", exp: (NOW - HOUR) / 1000 });
  assert.equal(isTokenExpired(token, NOW), true);
});

test("expiry is exact at the boundary, not one tick late", () => {
  const token = fakeToken({ sub: "1", exp: NOW / 1000 });
  // `exp <= now` — a token is expired the moment its clock runs out.
  assert.equal(isTokenExpired(token, NOW), true);
});

test("a token with no exp claim is treated as unexpired", () => {
  // Preserves the behaviour the app was built with.
  const token = fakeToken({ sub: "1" });
  assert.equal(isTokenExpired(token, NOW), false);
});

test("fails closed on anything unparseable", () => {
  // A credential we cannot read must never be presented as valid.
  const cases = [
    null,
    undefined,
    42,
    "",
    "not-a-token",
    "one.segment",
    "a.!!!not-base64!!!.c",
  ];
  for (const token of cases) {
    assert.equal(
      isTokenExpired(token, NOW),
      true,
      `should fail closed for ${JSON.stringify(token)}`
    );
  }
});

test("a readable payload with no exp is still trusted as unexpired", () => {
  // Distinguishes "no exp claim" from "we could not read the token",
  // which are handled differently on purpose.
  assert.equal(isTokenExpired("header.eyJmb28iOiAiYmFyIn0.s", NOW), false);
});

test("the app's own 24-hour token stays valid for the whole window", () => {
  // backend/app/auth.py issues tokens with timedelta(hours=24).
  const issued = NOW;
  const token = fakeToken({ sub: "7", exp: (issued + 24 * HOUR) / 1000 });
  for (const offset of [0, HOUR, 12 * HOUR, 23 * HOUR]) {
    assert.equal(isTokenExpired(token, issued + offset), false);
  }
  assert.equal(isTokenExpired(token, issued + 24 * HOUR), true);
});

/* --- FE-04: a signed-out visitor is not told a team "does not exist" -- */

test("failures are told apart by cause", () => {
  assert.equal(classifyFailure(401), "unauthorized");
  assert.equal(classifyFailure(403), "forbidden");
  assert.equal(classifyFailure(404), "not-found");
  for (const status of [400, 409, 422, 429, 500, 502, 503]) {
    assert.equal(
      classifyFailure(status),
      "server",
      `status ${status} is not the student's fault`
    );
  }
});

test("401 is never classified as a missing team", () => {
  // The defect: a signed-out visitor was shown "Team not found — this
  // team may have been deleted" for a team that does exist.
  assert.notEqual(classifyFailure(401), "not-found");
});
