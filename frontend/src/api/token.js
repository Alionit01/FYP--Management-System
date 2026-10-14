/* JWT expiry, kept out of the React tree so it can be reasoned about
   and tested on its own (audit FE-03).

   A JSON Web Token carries its own expiry in the `exp` claim, so an
   open tab can tell for itself whether its session is still good
   without asking the server. Nothing here validates the signature —
   that is the server's job and always will be. This only answers "has
   this token's own clock run out?", which is what stops a long-lived
   tab from presenting stale signed-in state. */

/* Decode just the payload. Returns null for anything unparseable. */
function decodePayload(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/* Has this token expired?

   Fails closed: a token we cannot read is treated as expired, because
   the only safe response to "I don't understand this credential" is to
   stop presenting it. A token with no `exp` claim is treated as not
   expired, which preserves the behaviour the app was built with. */
export function isTokenExpired(token, now = Date.now()) {
  const payload = decodePayload(token);
  if (!payload) return true;
  if (!payload.exp) return false;
  return payload.exp * 1000 <= now;
}
