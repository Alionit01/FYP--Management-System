/* Shared API error handling.

   FastAPI reports failures as {"detail": ...}, but the shape of
   "detail" varies:

     * a plain string for errors we raise ourselves
       ({"detail": "You are already in a team"}),

     * an array of validation objects for Pydantic request validation
       ({"detail": [{"loc": ["body", "email"], "msg": "value is not a
         valid email address", ...}]}),

     * occasionally something else entirely if a proxy or middleware
       answered instead of our app.

   Passing `data.detail` straight into setError() therefore renders a
   raw object as a React child, which React refuses to render: the
   component tree throws and the page shows a blank error state instead
   of the message. Every call site should go through
   extractErrorMessage() so the worst case is a readable fallback. */

export const MAX_TEAM_MEMBERS = 4;

/* Dispatched when the server rejects a request that carried a token.
   AuthContext listens for it and clears the stale signed-in state, so a
   long-open tab stops showing a navbar and protected pages as if the
   student were still authenticated. */
export const SESSION_EXPIRED_EVENT = "fyp:session-expired";

/* Tell the app the session is no longer usable.

   Only fires when a token is actually present, so the 401 from a failed
   sign-in attempt cannot dispatch it, and it never touches the token
   itself — AuthContext owns that. */
export function reportUnauthorized(response) {
  if (!response || response.status !== 401) return;
  if (typeof window === "undefined") return;
  if (!localStorage.getItem("access_token")) return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/* The most open spots a team may advertise. Matches
   TeamCreate/TeamUpdate in backend/app/schemas.py, where
   spots_available is Field(ge=0, le=MAX_TEAM_MEMBERS - 1). Keeping the
   two in step is what stops the form offering a value the server will
   reject. */
export const MAX_AVAILABLE_SPOTS = MAX_TEAM_MEMBERS - 1;

/* Classify an unsuccessful response so a page can tell apart the cases
   that need different treatment. Team details require an account, so
   "you need to sign in" and "this does not exist" must not look
   identical to the student (audit FE-04). */
export function classifyFailure(status) {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  return "server";
}

/* Turn any API failure into a short, safe, human-readable string.

   Never returns an object, array, or undefined — it is always a string
   suitable for rendering directly as a React child. */
export function extractErrorMessage(response, data, fallback = "Something went wrong. Please try again.") {
  const detail = data && data.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    // Pydantic validation errors: surface the first message, which is
    // the one tied to the first invalid field.
    const first = detail.find(
      (item) => item && typeof item.msg === "string" && item.msg.trim()
    );
    if (first) return first.msg.trim();
  }

  // An object we don't recognise: do not render it, fall through.
  if (!response) return fallback;

  if (response.status === 401) {
    // The token we sent is no longer accepted. Clear the stale
    // signed-in state rather than leaving the page looking logged in
    // (audit FE-03).
    reportUnauthorized(response);
    return "Your session has expired. Please sign in again.";
  }
  if (response.status === 403) return "You do not have permission to do that.";
  if (response.status === 404) return "Not found.";
  if (response.status === 409) return "That conflicts with something that already exists.";
  if (response.status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (response.status >= 500) return "The server had a problem. Please try again.";

  return fallback;
}
