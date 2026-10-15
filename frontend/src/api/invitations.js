import API_URL from "../api";
import { extractErrorMessage, reportUnauthorized } from "./errors";

/* Team invitations: the client for every invitation endpoint.

   Two kinds of call live here and they behave differently on purpose:

     * fetchMyInvitations() NEVER throws. The navbar polls it on every
       route change to keep the bell count current, and a hiccup there
       must not take a page down with it — it resolves to [].

     * everything else throws an Error whose message is already
       human-readable (via extractErrorMessage), so the calling
       component can just setError(err.message) and render it.

   The INVITATIONS_CHANGED_EVENT bus is what keeps the navbar bell in
   step with a component that accepted or declined somewhere else on
   the page. */

export const INVITATIONS_CHANGED_EVENT = "fyp:invitations-changed";

/* Ask other parts of the app to re-read the invitation count. Called
   after any accept/decline so the navbar bell updates immediately
   instead of waiting for the next route change. */
export function announceInvitationsChanged() {
  window.dispatchEvent(new Event(INVITATIONS_CHANGED_EVENT));
}

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function readBody(response) {
  try {
    return await response.json();
  } catch {
    // A response with no JSON body (proxy error page, empty 204) is
    // still a response: extractErrorMessage falls back to the status.
    return null;
  }
}

async function request(path, { method = "GET", fallback } = {}) {
  const headers = authHeaders();
  if (!headers) {
    throw new Error("You need to sign in to do that.");
  }

  const response = await fetch(`${API_URL}${path}`, { method, headers });
  const data = await readBody(response);

  if (!response.ok) {
    throw new Error(extractErrorMessage(response, data, fallback));
  }

  return data;
}

/* The signed-in student's pending invitations, or [] when signed out,
   the request fails, or the response is malformed. Never throws — a
   missing count is a cosmetic problem, not a reason to break a page.

   A 401 is the exception that matters: it is reported to AuthContext
   (FE-03) before the empty list is returned, so a rejected token clears
   the signed-in state instead of leaving the bell quietly showing zero
   invitations while the navbar still looks authenticated. */
export async function fetchMyInvitations() {
  const headers = authHeaders();
  if (!headers) return [];

  try {
    const response = await fetch(`${API_URL}/my-invitations`, { headers });

    if (!response.ok) {
      reportUnauthorized(response);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/* Same list, but for a page that wants to show an error and a retry
   (the inbox itself). The navbar keeps using the never-throwing
   version above. */
export async function fetchMyInvitationsOrThrow() {
  return request("/my-invitations", {
    fallback: "Could not load your invitations.",
  });
}

/* Respond to an invitation. `accept` chooses the endpoint; both throw
   a readable error so the inbox can keep the row and offer a retry. */
export async function respondToInvitation(invitationId, accept) {
  const data = await request(
    `/invitations/${invitationId}${accept ? "/accept" : ""}`,
    {
      method: accept ? "POST" : "DELETE",
      fallback: accept
        ? "Could not join the team."
        : "Could not decline the invitation.",
    }
  );
  announceInvitationsChanged();
  return data;
}

/* --- the owner's side ------------------------------------------------ */

/* Everything the owner needs about their team's invitations: the sent
   list plus how many spots are still free to promise. */
export async function fetchTeamInvitations(teamId) {
  return request(`/teams/${teamId}/invitations`, {
    fallback: "Could not load your pending invitations.",
  });
}

export async function sendInvitation(teamId, studentId) {
  return request(`/teams/${teamId}/invitations/${studentId}`, {
    method: "POST",
    fallback: "Could not send the invitation.",
  });
}

export async function revokeInvitation(teamId, invitationId) {
  return request(`/teams/${teamId}/invitations/${invitationId}`, {
    method: "DELETE",
    fallback: "Could not revoke the invitation.",
  });
}

export async function resendInvitation(invitationId) {
  return request(`/invitations/${invitationId}/resend`, {
    method: "POST",
    fallback: "Could not re-send the invitation.",
  });
}

/* Search the student directory for someone to invite. */
export async function searchCandidates(teamId, query) {
  const search = encodeURIComponent(query.trim());
  return request(`/teams/${teamId}/invitations/candidates?query=${search}`, {
    fallback: "Could not search for students.",
  });
}
