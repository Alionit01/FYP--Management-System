import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search, UserMinus, Users } from "lucide-react";
import {
  fetchTeamInvitations,
  resendInvitation,
  revokeInvitation,
  searchCandidates,
  sendInvitation,
} from "../api/invitations";
import { MAX_TEAM_MEMBERS } from "../api/errors";
import {
  candidateStatus,
  describeElapsed,
  describeExpiry,
  memberCountLabel,
  withCandidateStatus,
  INVITATION_TTL_DAYS,
} from "../lib/invitations";
import Alert from "./Alert";
import Avatar from "./Avatar";
import ConfirmDialog from "./ConfirmDialog";

const SEARCH_DEBOUNCE_MS = 250;

/* Everything the team owner does with invitations, in one place.

   Before this existed the owner picked a name from a dropdown of the
   first 50 students in the directory (no search, no way to tell who
   was already taken), clicked Send, and then heard nothing at all
   until that person turned up as a member — there was no list of sent
   invitations and no way to take one back.

   This panel replaces both halves of that: a search that labels every
   result, and a live list of what is outstanding, with revoke and
   resend. `onChanged` lets the host page refresh anything that depends
   on the team changing (My Team re-reads the team). */
function TeamInvitationsPanel({ team, onChanged, className = "" }) {
  const [sent, setSent] = useState({
    loading: true,
    error: "",
    invitations: [],
    summary: null,
  });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [invitingId, setInvitingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const loadSent = useCallback(async () => {
    setSent((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await fetchTeamInvitations(team.id);
      setSent({
        loading: false,
        error: "",
        invitations: data.invitations || [],
        summary: data,
      });
    } catch (err) {
      setSent((current) => ({ ...current, loading: false, error: err.message }));
    }
  }, [team.id]);

  useEffect(() => {
    loadSent();
  }, [loadSent]);

  /* Debounced search. Typing does not fire a request per keystroke, and
     a slow response from an earlier query can never overwrite the
     results of a newer one. */
  useEffect(() => {
    const search = query.trim();

    if (!search) {
      setResults(null);
      setSearchError("");
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchCandidates(team.id, search);
        if (cancelled) return;
        setResults(data.results || []);
        setSearchError("");
      } catch (err) {
        if (cancelled) return;
        setResults([]);
        setSearchError(err.message);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, team.id]);

  const invite = async (student) => {
    setError("");
    setMessage("");
    setInvitingId(student.id);

    try {
      const data = await sendInvitation(team.id, student.id);
      setMessage(data.message || `Invitation sent to ${student.name}.`);
      // Flip this row to "Invited" straight away: the search result the
      // owner is looking at is now stale, and re-running the query
      // would just flash the list.
      setResults((current) => withCandidateStatus(current, student.id, "invited"));
      await loadSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setInvitingId(null);
    }
  };

  const revoke = async (invitation) => {
    setError("");
    setMessage("");
    setBusyId(invitation.id);

    try {
      await revokeInvitation(team.id, invitation.id);
      const name = invitation.student?.name || "The student";
      setMessage(`Invitation to ${name} revoked.`);
      // The invite button flipped to "Invited" when the invitation went
      // out; put it back, or the owner sees a student they can no longer
      // act on. Re-running the query would just flash the list.
      if (invitation.student?.id) {
        setResults((current) =>
          withCandidateStatus(current, invitation.student.id, "invitable")
        );
      }
      await loadSent();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const resend = async (invitation) => {
    setError("");
    setMessage("");
    setBusyId(invitation.id);

    try {
      const data = await resendInvitation(invitation.id);
      setMessage(
        data.message || `Invitation re-sent to ${invitation.student?.name}.`
      );
      // A re-send revives an invitation the owner may have given up on,
      // so the row the search is showing has to catch up: the spot is
      // spoken for again.
      if (invitation.student?.id) {
        setResults((current) =>
          withCandidateStatus(current, invitation.student.id, "invited")
        );
      }
      await loadSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const requestRevokeConfirm = (invitation) => {
    const name = invitation.student?.name || "this student";
    setConfirmState({
      title: "Revoke invitation",
      message: `${name} will no longer see the invitation, and the spot opens up for someone else. You can always invite them again later.`,
      confirmLabel: "Revoke invitation",
      invitation,
    });
  };

  const handleConfirm = () => {
    const current = confirmState;
    setConfirmState(null);
    if (current) revoke(current.invitation);
  };

  const summary = sent.summary;
  const memberCount = summary?.member_count ?? team.members?.length ?? 1;
  const openSpots = summary?.invitable_spots ?? 0;
  const openInvitations = summary?.open_invitations ?? 0;
  const advertisedSpots = team.spots_available ?? 0;
  const teamIsFull = memberCount >= MAX_TEAM_MEMBERS;
  // An owner cannot promise a spot they do not have: the search stays
  // visible (so the layout does not jump) but says why it is closed.
  const searchDisabled = teamIsFull || advertisedSpots <= 0 || openSpots <= 0;
  const noRoomReason = teamIsFull ? (
    <>
      This team is full ({MAX_TEAM_MEMBERS} members maximum). Remove a member
      to invite someone else — outstanding invitations below can still be
      re-sent or revoked.
    </>
  ) : advertisedSpots <= 0 ? (
    <>
      This team has no open spots.{" "}
      <Link
        to={`/teams/${team.id}/edit`}
        className="font-semibold text-forest-800 underline underline-offset-4"
      >
        Edit the team
      </Link>{" "}
      to offer more spots.
    </>
  ) : (
    <>
      All of your open spots already have an invitation waiting on them.{" "}
      <Link
        to={`/teams/${team.id}/edit`}
        className="font-semibold text-forest-800 underline underline-offset-4"
      >
        Edit the team
      </Link>{" "}
      to offer more spots, or revoke an invitation below.
    </>
  );

  return (
    <section
      aria-label="Invite teammates"
      className={`card p-5 sm:p-7 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="display text-xl text-forest-900">Invite teammates</h2>

          <p className="text-sm text-ink-muted mt-1">
            {memberCountLabel(memberCount, MAX_TEAM_MEMBERS)}
            {openInvitations > 0 &&
              ` · ${openInvitations} invitation${openInvitations === 1 ? "" : "s"} waiting for a reply`}
          </p>
        </div>

        <button
          type="button"
          onClick={loadSent}
          className="p-2 -mr-2 rounded-full text-ink-muted hover:bg-cream-100 hover:text-forest-800 transition-colors shrink-0"
          title="Refresh invitations"
          aria-label="Refresh invitations"
        >
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </div>

      {message && (
        <div className="mt-4">
          <Alert kind="success">{message}</Alert>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {/* --- Find someone and send ------------------------------------- */}
      <div className="mt-5 rounded-xl border border-forest-900/12 bg-cream-50 p-4">
        <label htmlFor="invite-search" className="text-sm font-semibold text-forest-900">
          Find a student to invite
        </label>

        <div className="relative mt-2">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />

          <input
            id="invite-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, program or university ID"
            autoComplete="off"
            disabled={searchDisabled}
            className="input-field !pl-10"
          />
        </div>

        {searchDisabled && (
          <p className="mt-3 text-sm text-ink-soft">{noRoomReason}</p>
        )}

        {!searchDisabled && (
          <>
            {searching && (
              <p role="status" className="mt-3 text-sm text-ink-muted">
                Searching…
              </p>
            )}

            {searchError && (
              <div className="mt-3">
                <Alert kind="error">{searchError}</Alert>
              </div>
            )}

            {results && !searching && results.length === 0 && !searchError && (
              <p className="mt-3 text-sm text-ink-muted">
                No students match “{query.trim()}”.
              </p>
            )}

            {results && results.length > 0 && (
              <ul className="mt-3 space-y-2">
                {results.map((student) => {
                  const status = candidateStatus(student.status);
                  const busy = invitingId === student.id;

                  return (
                    <li
                      key={student.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-forest-900/10 bg-paper p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={student.name} size="sm" />

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-forest-900 truncate">
                            {student.name}
                          </p>

                          <p className="text-xs text-ink-muted truncate">
                            {[student.program, student.university_id]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </div>

                      {status.canInvite ? (
                        <button
                          type="button"
                          onClick={() => invite(student)}
                          disabled={busy}
                          className="primary-button !py-2 !px-4 shrink-0"
                        >
                          {busy ? "Sending…" : "Invite"}
                        </button>
                      ) : (
                        <span className="badge badge-full shrink-0">
                          {status.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {!query.trim() && (
              <p className="mt-3 text-xs text-ink-muted">
                Students already on a team, or already invited, are labelled so
                you never send an invitation that cannot be accepted.
              </p>
            )}
          </>
        )}
      </div>

      {/* --- Outstanding invitations ----------------------------------- */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-forest-900">
          Sent invitations
          {!sent.loading && (
            <span className="text-ink-muted font-normal">
              {" "}
              ({sent.invitations.length})
            </span>
          )}
        </h3>

        {sent.loading && (
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
          </div>
        )}

        {sent.loading && (
          <p role="status" className="sr-only">
            Loading sent invitations…
          </p>
        )}

        {!sent.loading && sent.error && (
          <div className="mt-3">
            <Alert kind="error">
              {sent.error}
              <button
                type="button"
                onClick={loadSent}
                className="mt-2 block font-semibold underline underline-offset-4"
              >
                Try again
              </button>
            </Alert>
          </div>
        )}

        {!sent.loading && !sent.error && sent.invitations.length === 0 && (
          <p className="mt-2 text-sm text-ink-muted">
            No invitations are outstanding. Everyone you invited has answered.
          </p>
        )}

        {!sent.loading && !sent.error && sent.invitations.length > 0 && (
          <ul className="mt-3 space-y-2">
            {sent.invitations.map((invitation) => {
              const expiry = describeExpiry(invitation);
              const busy = busyId === invitation.id;
              const student = invitation.student;
              const expiryClass = {
                neutral: "badge",
                warning: "badge badge-warning",
                danger: "badge badge-danger",
              }[expiry.tone] || "badge";

              return (
                <li
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-forest-900/12 bg-cream-50 p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      name={student?.name || "?"}
                      src={student?.profile_picture}
                      size="sm"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-forest-900 truncate">
                        {student?.name || "Unknown student"}
                      </p>

                      <p className="text-xs text-ink-muted mt-0.5">
                        {[student?.program, invitation.created_at
                          ? `sent ${describeElapsed(invitation.created_at)}`
                          : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={expiryClass}>{expiry.label}</span>

                    <button
                      type="button"
                      onClick={() => resend(invitation)}
                      disabled={busy}
                      className="secondary-button !py-2 !px-4"
                      title="Extend this invitation and let the student see it again"
                    >
                      {busy ? "Working…" : "Re-send"}
                    </button>

                    <button
                      type="button"
                      onClick={() => requestRevokeConfirm(invitation)}
                      disabled={busy}
                      className="danger-button !py-2 !px-4"
                      aria-label={`Revoke the invitation to ${student?.name || "this student"}`}
                    >
                      <UserMinus size={15} aria-hidden="true" />
                      Revoke
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* A quiet explanation of the rule that surprises people most:
          inviting does not hand the spot over, the student still has to
          accept — and the offer does not sit around forever. */}
      <p className="mt-4 text-xs text-ink-muted inline-flex items-start gap-1.5">
        <Users size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          An invitation holds its spot until the student accepts, declines, or
          it expires after {INVITATION_TTL_DAYS} days. Re-sending gives them
          another {INVITATION_TTL_DAYS} days to answer.
        </span>
      </p>

      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onCancel={() => setConfirmState(null)}
          onConfirm={handleConfirm}
        />
      )}
    </section>
  );
}

export default TeamInvitationsPanel;
