import API_URL from "../api";

/* Pending team invitations for the signed-in student.

   Kept as plain functions (not a context) so any component can read
   the count or refresh it. Components that show the list
   (InvitationsSection) and components that only show a count
   (Navbar) both go through here, so they can't drift apart.

   The navbar refetches on every route change, which is what keeps the
   bell count current after a student accepts or declines somewhere
   else on the page. */

export const INVITATIONS_CHANGED_EVENT = "fyp:invitations-changed";

/* Ask other parts of the app to re-read the invitation count. Called
   after any accept/decline so the navbar bell updates immediately
   instead of waiting for the next route change. */
export function announceInvitationsChanged() {
  window.dispatchEvent(new Event(INVITATIONS_CHANGED_EVENT));
}

/* The signed-in student's pending invitations, or [] when signed out,
   the request fails, or the response is malformed. Never throws — a
   missing count is a cosmetic problem, not a reason to break a page. */
export async function fetchMyInvitations() {
  const token = localStorage.getItem("access_token");
  if (!token) return [];

  try {
    const response = await fetch(`${API_URL}/my-invitations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
