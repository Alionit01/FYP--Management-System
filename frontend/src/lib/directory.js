/* Helpers shared by the two directory pages (Students and Teams).

   Kept free of imports so Node's test runner can exercise them
   without a DOM or a bundler — see frontend/tests/directory.test.js. */

/* The query string for GET /students or GET /teams.

   The page's own URL carries `search` / `program` / `status` and the
   API takes the same words, so this is the one place that decides how
   a filter reaches the server. "All" (or nothing) means "do not
   filter", and the term is trimmed so a stray space at the end of a
   search does not turn into "no results". */
export function directoryQuery({
  search = "",
  program = "",
  status = "",
  skip = 0,
  limit,
} = {}) {
  const params = new URLSearchParams();

  params.set("skip", String(Math.max(0, skip)));
  if (limit) params.set("limit", String(limit));

  const term = search.trim();
  if (term) params.set("search", term);
  if (program && program !== "All") params.set("program", program);
  if (status && status !== "All") params.set("status", status);

  return params.toString();
}

/* Append a fetched page to what is already on screen, dropping rows we
   already have.

   Two rows can overlap when someone joins (or leaves) between one page
   and the next, and a duplicate id would render as a duplicate React
   key — a console error and a card that misbehaves. Returning a new
   array is also what lets React see the state change. */
export function appendUniqueRows(current, incoming) {
  const rows = Array.isArray(current) ? current : [];
  const extras = Array.isArray(incoming) ? incoming : [];

  const seen = new Set(rows.map((row) => row.id));
  const merged = rows.slice();

  for (const row of extras) {
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }

  return merged;
}

/* How many results the directory is showing. The `+` is how an honest
   count reads when more pages are still being fetched, because the
   number on screen is everything loaded so far, not everything that
   matches. */
export function directoryCountLabel(count, hasMore, singular, plural) {
  const shown = hasMore ? `${count}+` : String(count);
  const noun = hasMore || count !== 1 ? plural : singular;
  return `${shown} ${noun}`;
}

/* "...match your filters" / "...matches your filters" — the verb has
   to agree with the count, and one result described as several is the
   kind of small slip people notice even if they could not say why. */
export function filterAgreement(count, hasMore) {
  return hasMore || count !== 1 ? "match your filters" : "matches your filters";
}
