import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import API_URL from "../api";
import { extractErrorMessage, MAX_TEAM_MEMBERS } from "../api/errors";
import { memberCountLabel } from "../lib/invitations";
import Alert from "../components/Alert";
import Avatar from "../components/Avatar";
import ConfirmDialog from "../components/ConfirmDialog";
import InvitationsSection from "../components/InvitationsSection";
import Tags from "../components/Tags";
import TeamInvitationsPanel from "../components/TeamInvitationsPanel";

function MyTeam() {
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const token = localStorage.getItem("access_token");
  const studentId = localStorage.getItem("student_id");

  /* `showSkeleton` drives the full-page placeholder: only the very
     first load (and joining a team) swaps the whole page out. Later
     refreshes — after removing a member or revoking an invitation —
     update in place, so the page does not flash back to skeletons. */
  const fetchTeam = async ({ showSkeleton = false } = {}) => {
    try {
      if (showSkeleton) setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/my-team`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(response, data, "Unable to fetch team.")
        );
      }

      setTeam(data);
      setMembers(data?.members || []);

      // One-time notice when leadership of your team changed hands
      if (data) {
        const ownerKey = `last_team_owner_${data.id}`;
        const previousOwner = localStorage.getItem(ownerKey);
        if (
          previousOwner &&
          String(previousOwner) !== String(data.created_by) &&
          String(data.created_by) === String(studentId)
        ) {
          setMessage(
            "You are now the Team Owner after the previous owner left."
          );
        }
        localStorage.setItem(ownerKey, String(data.created_by));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (showSkeleton) setLoading(false);
    }
  };

  // The initial data load for this page: setting the loading flag
  // synchronously before the first await is what drives the skeleton UI.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTeam({ showSkeleton: true });
  }, []);

  const handleLeaveTeam = async () => {
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/teams/${team.id}/members/me`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(response, data, "Unable to leave team.")
        );
      }

      navigate("/teams");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTeam = async () => {
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/teams/${team.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(response, data, "Unable to delete team.")
        );
      }

      navigate("/teams");
    } catch (err) {
      setError(err.message);
    }
  };

  const isOwner =
    team &&
    String(team.created_by) === String(studentId);

  const requestLeaveConfirm = () => {
    setConfirmState({
      title: "Leave team",
      message: isOwner
        ? members.length > 1
          ? "You are the team owner. Leaving will transfer leadership to another member. Continue?"
          : "You are the only member. Leaving will delete this team. Continue?"
        : "Are you sure you want to leave this team?",
      confirmLabel: "Leave Team",
      action: "leave",
    });
  };

  const requestDeleteConfirm = () => {
    setConfirmState({
      title: "Delete team",
      message:
        "Are you sure you want to permanently delete this team? This cannot be undone.",
      confirmLabel: "Delete Team",
      action: "delete",
    });
  };

  const requestRemoveConfirm = (member) => {
    setConfirmState({
      title: "Remove member",
      message: `Remove ${member.name} from the team? You can invite them again later.`,
      confirmLabel: "Remove",
      action: "remove",
      memberId: member.id,
    });
  };

  const handleConfirm = async () => {
    const current = confirmState;
    setConfirmState(null);

    if (!current) return;

    if (current.action === "leave") {
      await handleLeaveTeam();
    } else if (current.action === "delete") {
      await handleDeleteTeam();
    } else if (current.action === "remove") {
      await handleRemoveMember(current.memberId);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/teams/${team.id}/members/${memberId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(response, data, "Unable to remove member.")
        );
      }

      setMessage("Member removed successfully.");
      await fetchTeam();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <main className="page-container max-w-4xl">
        <p role="status" className="sr-only">
          Loading your team…
        </p>

        <div className="skeleton h-5 w-32" aria-hidden="true" />

        <div className="card mt-6 p-5 sm:p-7" aria-hidden="true">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton mt-3 h-8 w-64" />
          <div className="skeleton mt-6 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-4/5" />
          <div className="skeleton mt-8 h-24 w-full" />
        </div>
      </main>
    );
  }

  if (error && !team) {
    return (
      <div className="page-container max-w-4xl">
        <button
          type="button"
          onClick={() => navigate("/teams")}
          className="link-quiet inline-flex items-center gap-2 mb-6"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Teams
        </button>

        <Alert kind="error">{error}</Alert>

        {/* Accepting an invitation still lets you recover from a
            failed team fetch. */}
        <InvitationsSection
          onAccepted={() => fetchTeam({ showSkeleton: true })}
          className="mt-6"
        />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page-container max-w-4xl">
        <button
          type="button"
          onClick={() => navigate("/teams")}
          className="link-quiet inline-flex items-center gap-2 mb-6"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Teams
        </button>

        <div className="empty-state">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-800">
            <Users size={22} aria-hidden="true" />
          </div>

          <h1 className="display mt-4 text-2xl text-forest-900">
            You are not in a team
          </h1>

          <p className="mt-2 text-ink-soft">
            Join or create a team to get started.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/teams")}
              className="secondary-button"
            >
              Browse Teams
            </button>

            <button
              type="button"
              onClick={() => navigate("/teams/create")}
              className="primary-button"
            >
              <UserPlus size={16} aria-hidden="true" />
              Create a Team
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        <InvitationsSection
          onAccepted={() => fetchTeam({ showSkeleton: true })}
          className="mt-6"
        />
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/teams")}
        className="link-quiet inline-flex items-center gap-2 mb-6"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Teams
      </button>

      {/* Team Header */}
      <div className="card p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">My Team</p>

            <h1 className="display mt-2 text-3xl sm:text-4xl text-forest-900 break-words">
              {team.name}
            </h1>

            {team.project_title && (
              <p className="text-ink-soft mt-2 leading-snug">
                {team.project_title}
              </p>
            )}
          </div>

          {/* Owner actions + spots */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isOwner && (
              <button
                type="button"
                onClick={() => navigate(`/teams/${team.id}/edit`)}
                className="primary-button"
              >
                Edit Team
              </button>
            )}

            <span
              className={`badge ${
                team.spots_available > 0 ? "badge-open" : "badge-full"
              }`}
            >
              {team.spots_available > 0
                ? `${team.spots_available} spot${team.spots_available === 1 ? "" : "s"} available`
                : "Full"}
            </span>
          </div>
        </div>

        {team.description && (
          <p className="text-ink-soft mt-6 leading-relaxed whitespace-pre-line">
            {team.description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 pt-6 divider">
          <div>
            <p className="eyebrow">Department Preference</p>
            <p className="text-sm font-medium text-ink mt-2">
              {team.department_preference}
            </p>
          </div>

          {team.skills_needed && (
            <div>
              <p className="eyebrow">Skills Needed</p>

              <div className="mt-2.5">
                <Tags items={team.skills_needed} />
              </div>
            </div>
          )}

          {team.roles_needed && (
            <div>
              <p className="eyebrow">Roles Needed</p>

              <div className="mt-2.5">
                <Tags items={team.roles_needed} />
              </div>
            </div>
          )}

          {team.contact && (
            <div>
              <p className="eyebrow">Contact</p>

              {(() => {
                const contact = team.contact.trim();
                const href = /^https?:\/\//i.test(contact)
                  ? contact
                  : /^[+\d][\d\s()+-]{6,}$/.test(contact)
                    ? `https://wa.me/${contact.replace(/\D/g, "")}`
                    : null;

                return href ? (
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="text-sm font-medium text-ink mt-2 break-all underline-offset-4 hover:underline inline-block"
                  >
                    {team.contact}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-ink mt-2 break-all">
                    {team.contact}
                  </p>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="mt-5">
          <Alert kind="success">{message}</Alert>
        </div>
      )}

      {error && (
        <div className="mt-5">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {/* No invitations section here: you're already on a team, and the
          API hides pending invitations from students who can't act on
          them, so it would always render empty. The navbar bell and My
          Profile are where pending invitations surface. */}

      {/* Members */}
      <div className="card p-5 sm:p-7 mt-6">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="display text-xl text-forest-900">
              Team Members
            </h2>

            <p className="text-sm text-ink-muted mt-1">
              {memberCountLabel(members.length, MAX_TEAM_MEMBERS)}
            </p>
          </div>
        </div>

        <ul className="space-y-2.5">
          {members.map((member) => {
            const memberIsOwner =
              String(member.id) === String(team.created_by);

            return (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-forest-900/12 bg-cream-50 p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={member.name} size="sm" />

                  <div className="min-w-0">
                    <p className="font-medium text-forest-900 truncate">
                      {member.name}
                    </p>

                    {member.email && (
                      <p className="text-sm text-ink-muted truncate">
                        {member.email}
                      </p>
                    )}

                    {memberIsOwner && (
                      <span className="badge badge-open mt-1.5">
                        Team Owner
                      </span>
                    )}
                  </div>
                </div>

                {isOwner && !memberIsOwner && (
                  <button
                    type="button"
                    onClick={() => requestRemoveConfirm(member)}
                    className="p-2.5 rounded-full text-danger-700 hover:bg-danger-50 transition-colors shrink-0"
                    title="Remove member"
                    aria-label={`Remove ${member.name} from the team`}
                  >
                    <UserMinus size={18} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Owner-only: find someone to invite, send the invitation, and
          manage the ones already outstanding. Rendered even when the
          team is full — that is exactly when a stale invitation needs
          revoking — and the panel explains why no one new can be
          invited. */}
      {isOwner && (
        <TeamInvitationsPanel
          team={team}
          onChanged={fetchTeam}
          className="mt-6"
        />
      )}

      {/* Leave / Delete Team */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={requestLeaveConfirm}
          className="danger-button w-full sm:w-auto"
        >
          Leave Team
        </button>

        {isOwner && (
          <button
            type="button"
            onClick={requestDeleteConfirm}
            className="danger-button w-full sm:w-auto"
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete Team
          </button>
        )}
      </div>

      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onCancel={() => setConfirmState(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

export default MyTeam;
