import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import API_URL from "../api";
import {
  announceInvitationsChanged,
  fetchMyInvitations,
} from "../api/invitations";
import Alert from "./Alert";

/* Pending team invitations for the signed-in student, with Accept and
   Decline. It fetches /my-invitations itself, so any page can drop it
   in — My Team and My Profile both do. Renders nothing when there is
   nothing to act on, so it never leaves empty space behind.

   After any accept/decline it announces the change so the navbar bell
   count updates immediately.

   `onAccepted(invitation)` lets the host page refresh its own data
   (My Team refetches the team you just joined). */
function InvitationsSection({ onAccepted, className = "" }) {
  const [invitations, setInvitations] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // A failed load just keeps the section hidden; the host page's
    // own data is unaffected.
    fetchMyInvitations().then(setInvitations);
  }, []);

  const respondToInvitation = async (invitation, accept) => {
    setError("");
    setBusyId(invitation.id);

    try {
      const response = await fetch(
        `${API_URL}/invitations/${invitation.id}${accept ? "/accept" : ""}`,
        {
          method: accept ? "POST" : "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Could not respond to invitation."
        );
      }

      if (accept) {
        // Accepting puts you on a team, which makes every other
        // pending invitation unactionable — the API hides them all.
        // Clearing the list here stops the UI from offering a second
        // "Accept" that would only ever 409.
        setInvitations([]);
      } else {
        // Declining leaves the rest actionable.
        setInvitations((current) =>
          current.filter((item) => item.id !== invitation.id)
        );
      }

      // Let the navbar bell re-read the count right away.
      announceInvitationsChanged();

      if (accept) onAccepted?.(invitation);
    } catch (err) {
      // Keep the invitation in the list so the student can retry.
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (invitations.length === 0 && !error) return null;

  return (
    <section
      aria-label="Team invitations"
      className={`card p-5 sm:p-7 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Bell size={18} aria-hidden="true" className="text-forest-700" />

        <h2 className="display text-xl text-forest-900">
          Team invitations
        </h2>

        {invitations.length > 0 && (
          <span className="badge badge-open ml-auto shrink-0">
            {invitations.length} pending
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <ul className="mt-5 space-y-3">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-forest-900/12 bg-cream-50 p-4"
          >
            <Link
              to={`/teams/${invitation.team_id}`}
              className="font-medium text-forest-900 break-words underline-offset-4 hover:underline"
            >
              {invitation.team_name}
            </Link>

            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                className="primary-button !py-2"
                disabled={busyId === invitation.id}
                onClick={() => respondToInvitation(invitation, true)}
              >
                {busyId === invitation.id ? "Working…" : "Accept"}
              </button>

              <button
                type="button"
                className="secondary-button !py-2"
                disabled={busyId === invitation.id}
                onClick={() => respondToInvitation(invitation, false)}
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default InvitationsSection;
