import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, RefreshCw, Users } from "lucide-react";
import {
  fetchMyInvitationsOrThrow,
  respondToInvitation,
} from "../api/invitations";
import { MAX_TEAM_MEMBERS } from "../api/errors";
import {
  describeElapsed,
  describeExpiry,
  isActionable,
  memberCountLabel,
  spotsLabel,
} from "../lib/invitations";
import Alert from "./Alert";
import Avatar from "./Avatar";

/* Pending team invitations for the signed-in student.

   It fetches /my-invitations itself, so any page can drop it in — My
   Team and My Profile both do. Renders nothing when there is nothing
   to act on, so it never leaves empty space behind.

   Each invitation shows who sent it, what the team is, how big it is
   and when the offer lapses, because "Team name + Accept + Decline"
   is a decision made with almost no information. After any
   accept/decline the navbar bell is told to refresh (see
   api/invitations.js), and `onAccepted(invitation)` lets the host page
   refetch its own data — My Team uses it to switch from the "you are
   not in a team" view to the team you just joined. */
function InvitationsSection({ onAccepted, className = "" }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchMyInvitationsOrThrow();
      // An invitation that has already lapsed is not a choice any
      // more; the server hides those too, this is belt and braces for
      // a tab left open across a deadline.
      setInvitations(data.filter((invitation) => isActionable(invitation)));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (invitation, accept) => {
    setNotice("");
    setRowError((current) => ({ ...current, [invitation.id]: "" }));
    setBusyId(invitation.id);

    try {
      await respondToInvitation(invitation.id, accept);

      if (accept) {
        // Joining a team makes every other pending invitation
        // unactionable — the API hides them all — so clearing the list
        // stops a second "Accept" that could only ever fail.
        setInvitations([]);
        onAccepted?.(invitation);
      } else {
        setInvitations((current) =>
          current.filter((item) => item.id !== invitation.id)
        );
        setNotice(`Declined the invitation from ${invitation.team_name}.`);
      }
    } catch (err) {
      // Keep the row so the student can retry, and say what went wrong
      // next to the buttons that caused it.
      setRowError((current) => ({ ...current, [invitation.id]: err.message }));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <section aria-label="Team invitations" className={`card p-5 sm:p-7 ${className}`}>
        <p role="status" className="sr-only">
          Loading your team invitations…
        </p>

        <div className="flex items-center gap-2">
          <Bell size={18} aria-hidden="true" className="text-forest-700" />
          <h2 className="display text-xl text-forest-900">Team invitations</h2>
        </div>

        <div className="mt-5 space-y-3" aria-hidden="true">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      </section>
    );
  }

  if (loadError && invitations.length === 0) {
    return (
      <section aria-label="Team invitations" className={`card p-5 sm:p-7 ${className}`}>
        <Alert kind="error">
          {loadError}
          <button
            type="button"
            onClick={load}
            className="mt-2 block font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </Alert>
      </section>
    );
  }

  if (invitations.length === 0) return null;

  return (
    <section aria-label="Team invitations" className={`card p-5 sm:p-7 ${className}`}>
      <div className="flex items-center gap-2">
        <Bell size={18} aria-hidden="true" className="text-forest-700" />

        <h2 className="display text-xl text-forest-900">Team invitations</h2>

        <span className="badge badge-open ml-auto shrink-0">
          {invitations.length} pending
        </span>

        <button
          type="button"
          onClick={load}
          className="p-2 -mr-2 rounded-full text-ink-muted hover:bg-cream-100 hover:text-forest-800 transition-colors shrink-0"
          title="Refresh invitations"
          aria-label="Refresh invitations"
        >
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </div>

      {notice && (
        <div className="mt-4">
          <Alert kind="success">{notice}</Alert>
        </div>
      )}

      <ul className="mt-5 space-y-3">
        {invitations.map((invitation) => {
          const expiry = describeExpiry(invitation);
          const busy = busyId === invitation.id;
          const error = rowError[invitation.id];
          const inviter = invitation.inviter;
          // Spelled out rather than built as `badge-${tone}` so the
          // class names stay visible to the CSS scanner.
          const expiryClass = {
            neutral: "badge",
            warning: "badge badge-warning",
            danger: "badge badge-danger",
          }[expiry.tone] || "badge";

          return (
            <li
              key={invitation.id}
              className="rounded-xl border border-forest-900/12 bg-cream-50 p-4"
            >
              <div className="flex items-start gap-3">
                <Avatar name={invitation.team_name} size="sm" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Link
                        to={`/teams/${invitation.team_id}`}
                        className="font-semibold text-forest-900 break-words underline-offset-4 hover:underline"
                      >
                        {invitation.team_name}
                      </Link>

                      {invitation.project_title && (
                        <p className="text-sm text-ink-soft mt-0.5 leading-snug">
                          {invitation.project_title}
                        </p>
                      )}
                    </div>

                    <span className={`${expiryClass} shrink-0`}>
                      {expiry.label}
                    </span>
                  </div>

                  {inviter && (
                    <p className="mt-1.5 text-sm text-ink-soft">
                      Invited by{" "}
                      <span className="font-medium text-forest-900">
                        {inviter.name}
                      </span>
                      {inviter.program ? ` · ${inviter.program}` : ""}
                    </p>
                  )}

                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} aria-hidden="true" />
                      {memberCountLabel(
                        invitation.member_count ?? 1,
                        MAX_TEAM_MEMBERS
                      )}
                    </span>

                    <span>{spotsLabel(invitation.spots_available ?? 0)}</span>

                    {invitation.department_preference && (
                      <span>{invitation.department_preference}</span>
                    )}

                    {invitation.created_at && (
                      <span>
                        Sent {describeElapsed(invitation.created_at) || "earlier"}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-3">
                  <Alert kind="error">{error}</Alert>
                </div>
              )}

              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  className="secondary-button !py-2"
                  disabled={busy}
                  onClick={() => respond(invitation, false)}
                >
                  Decline
                </button>

                <button
                  type="button"
                  className="primary-button !py-2"
                  disabled={busy}
                  onClick={() => respond(invitation, true)}
                >
                  {busy ? "Joining…" : "Accept invitation"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-ink-muted">
        Accepting puts you on this team. A student can only belong to one
        team at a time, so the other invitations stop applying.
      </p>
    </section>
  );
}

export default InvitationsSection;
