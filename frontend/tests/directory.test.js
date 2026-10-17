/* Tests for the directory request/pagination helpers
   (src/lib/directory.js).

   The Students and Teams pages ask the server for each page of
   results, so these decide what query reaches it and what happens to
   the rows already on screen when another page arrives. The first is
   how a filter ever takes effect; the second is why a student can
   never see two identical cards (a duplicate React key) after the
   directory shifts under them.

   Run with `npm test` (Node's built-in runner, no extra dependency). */

import test from "node:test";
import assert from "node:assert/strict";

import {
  appendUniqueRows,
  directoryCountLabel,
  directoryQuery,
  filterAgreement,
} from "../src/lib/directory.js";

/* --- the query string ------------------------------------------------ */

test("paging is always in the query, whatever else is filtered", () => {
  assert.equal(directoryQuery({ skip: 0, limit: 50 }), "skip=0&limit=50");
  assert.equal(directoryQuery({ skip: 100, limit: 50 }), "skip=100&limit=50");
});

test("nothing selected means no filters at all", () => {
  assert.equal(
    directoryQuery({ search: "", program: "All", status: "All", limit: 50 }),
    "skip=0&limit=50"
  );
});

test("a search reaches the server trimmed, and only if non-empty", () => {
  assert.equal(
    directoryQuery({ search: "  machine learning  ", limit: 50 }),
    "skip=0&limit=50&search=machine+learning"
  );
  assert.equal(
    directoryQuery({ search: "   ", limit: 50 }),
    "skip=0&limit=50"
  );
});

test("every filter on the page has a matching parameter", () => {
  const query = directoryQuery({
    search: "figma",
    program: "BSCS",
    status: "Looking for a team",
    skip: 50,
    limit: 50,
  });

  assert.match(query, /search=figma/);
  assert.match(query, /program=BSCS/);
  assert.match(query, /status=Looking(\+|%20)for(\+|%20)a(\+|%20)team/);
  assert.match(query, /skip=50/);
});

test("the teams page filters without a status parameter", () => {
  const query = directoryQuery({ search: "nebula", program: "BSAI" });

  assert.match(query, /search=nebula/);
  assert.match(query, /program=BSAI/);
  assert.doesNotMatch(query, /status/);
});

test("characters that would break a query string are escaped", () => {
  const query = directoryQuery({ search: "a&b=c", limit: 50 });

  assert.equal(query, "skip=0&limit=50&search=a%26b%3Dc");
  assert.deepEqual(
    new URLSearchParams(query).get("search"),
    "a&b=c"
  );
});

test("a negative page number is not passed through to the API", () => {
  assert.equal(
    directoryQuery({ skip: -10, limit: 50 }),
    "skip=0&limit=50"
  );
});

/* --- appending a page ------------------------------------------------ */

const rows = (...ids) => ids.map((id) => ({ id, name: `Row ${id}` }));

test("a fetched page is appended to the rows already shown", () => {
  const merged = appendUniqueRows(rows(1, 2, 3), rows(4, 5));

  assert.deepEqual(merged.map((row) => row.id), [1, 2, 3, 4, 5]);
});

test("a row that shifted between pages is not rendered twice", () => {
  // Someone joined, so page two of the same directory starts one row
  // earlier: row 3 comes back again.
  const merged = appendUniqueRows(rows(1, 2, 3), rows(3, 4, 5));

  assert.deepEqual(merged.map((row) => row.id), [1, 2, 3, 4, 5]);
});

test("duplicate ids inside one response are collapsed too", () => {
  assert.deepEqual(
    appendUniqueRows(rows(1), rows(1, 1, 2)).map((row) => row.id),
    [1, 2]
  );
});

test("the earlier copy of a row wins, so cards do not jump", () => {
  const merged = appendUniqueRows(
    [{ id: 1, name: "Alice" }],
    [{ id: 1, name: "Alice (renamed)" }]
  );

  assert.deepEqual(merged, [{ id: 1, name: "Alice" }]);
});

test("the inputs are not mutated", () => {
  const current = rows(1);
  const incoming = rows(2);

  appendUniqueRows(current, incoming);

  assert.deepEqual(current, rows(1));
  assert.deepEqual(incoming, rows(2));
});

test("malformed responses produce nothing rather than a crash", () => {
  assert.deepEqual(appendUniqueRows(null, undefined), []);
  assert.deepEqual(appendUniqueRows(rows(1), null), rows(1));
  assert.deepEqual(appendUniqueRows(undefined, [null, rows(2)[0]]), rows(2));
});

test("appending always returns a new array, so React re-renders", () => {
  const current = rows(1);

  assert.notEqual(appendUniqueRows(current, rows(2)), current);
});

/* --- the count under the filters ------------------------------------- */

test("a count admits there is more to load", () => {
  assert.equal(directoryCountLabel(50, true, "student", "students"), "50+ students");
  assert.equal(directoryCountLabel(1, true, "team", "teams"), "1+ teams");
});

test("a complete count is exact and singular when it is one", () => {
  assert.equal(directoryCountLabel(1, false, "student", "students"), "1 student");
  assert.equal(directoryCountLabel(0, false, "student", "students"), "0 students");
  assert.equal(directoryCountLabel(27, false, "team", "teams"), "27 teams");
});

test("the filter sentence agrees with the count", () => {
  assert.equal(filterAgreement(1, false), "matches your filters");
  assert.equal(filterAgreement(0, false), "match your filters");
  assert.equal(filterAgreement(12, false), "match your filters");
  // "50+ teams" is plural whatever the loaded count reads
  assert.equal(filterAgreement(50, true), "match your filters");
});
