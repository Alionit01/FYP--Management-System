/* Tests for the shared API error handling (audit FE-01/FE-02).

   Run with `npm test`, which uses Node's built-in test runner — no
   extra dependency is required.

   The invariant that matters most here: extractErrorMessage always
   returns a *string*. FastAPI reports request-validation failures as
   {"detail": [{loc, msg, type}]}, and passing that array straight into
   setError() makes React throw "Objects are not valid as a React
   child", blanking the page instead of showing the message. */

import test from "node:test";
import assert from "node:assert/strict";

import {
  extractErrorMessage,
  MAX_AVAILABLE_SPOTS,
  MAX_TEAM_MEMBERS,
} from "../src/api/errors.js";

const FALLBACK = "Something went wrong. Please try again.";

function res(status) {
  return { ok: status >= 200 && status < 300, status };
}

/* --- the shape FastAPI actually sends ---------------------------------- */

test("a plain string detail is used as-is", () => {
  assert.equal(
    extractErrorMessage(res(400), { detail: "You are already in a team." }),
    "You are already in a team."
  );
});

test("a Pydantic validation array yields the first message", () => {
  const data = {
    detail: [
      {
        loc: ["body", "email"],
        msg: "value is not a valid email address",
        type: "value_error.email",
      },
      {
        loc: ["body", "program"],
        msg: "Field required",
        type: "missing",
      },
    ],
  };
  assert.equal(
    extractErrorMessage(res(422), data),
    "value is not a valid email address"
  );
});

test("a validation array with no usable messages falls back", () => {
  const data = { detail: [{ loc: ["body"] }, null, 42] };
  assert.equal(extractErrorMessage(res(422), data), FALLBACK);
});

/* --- the invariant that protects React -------------------------------- */

test("never returns an object or array, whatever the server sent", () => {
  const shapes = [
    { detail: { some: "object" } },
    { detail: [{ nested: { deep: true } }] },
    { detail: [1, 2, 3] },
    { detail: null },
    { detail: "" },
    {},
    null,
    undefined,
    { detail: { msg: { not: "a string" } } },
  ];
  for (const data of shapes) {
    for (const status of [400, 401, 403, 404, 422, 500]) {
      const message = extractErrorMessage(res(status), data, FALLBACK);
      assert.equal(
        typeof message,
        "string",
        `returned ${typeof message} for ${JSON.stringify(data)}`
      );
      assert.ok(message.length > 0, "must not return an empty string");
    }
  }
});

/* --- missing or malformed bodies -------------------------------------- */

test("a non-JSON body (e.g. a proxy's HTML page) still yields a string", () => {
  assert.equal(
    extractErrorMessage(res(502), null, FALLBACK),
    "The server had a problem. Please try again."
  );
});

test("an empty detail with no response uses the caller's fallback", () => {
  assert.equal(
    extractErrorMessage(null, { detail: "" }, "Could not create team."),
    "Could not create team."
  );
});

/* --- status-based mapping --------------------------------------------- */

test("statuses map to readable messages when detail is absent", () => {
  const cases = [
    [401, "Your session has expired. Please sign in again."],
    [403, "You do not have permission to do that."],
    [404, "Not found."],
    [409, "That conflicts with something that already exists."],
    [429, "Too many attempts. Please wait a moment and try again."],
    [500, "The server had a problem. Please try again."],
  ];
  for (const [status, expected] of cases) {
    assert.equal(extractErrorMessage(res(status), {}), expected);
  }
});

test("an explicit detail still wins over the status mapping", () => {
  // The rate limiter answers 429 with its own explanation; show that.
  assert.equal(
    extractErrorMessage(
      res(429),
      { detail: "Too many login attempts. Please try again later." }
    ),
    "Too many login attempts. Please try again later."
  );
});

test("whitespace-only detail is treated as absent", () => {
  assert.equal(
    extractErrorMessage(res(403), { detail: "   " }),
    "You do not have permission to do that."
  );
});

/* --- FE-02: the form must not offer what the server rejects ----------- */

test("the advertised spot limit matches the backend rule", () => {
  // backend/app/schemas.py: spots_available is
  // Field(ge=0, le=MAX_TEAM_MEMBERS - 1), i.e. 0..3.
  assert.equal(MAX_TEAM_MEMBERS, 4);
  assert.equal(MAX_AVAILABLE_SPOTS, 3);
});
