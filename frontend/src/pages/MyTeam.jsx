import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, UserMinus } from "lucide-react";
import API_URL from "../api";
import ConfirmDialog from "../components/ConfirmDialog";

const MAX_TEAM_MEMBERS = 4;

function MyTeam() {
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [students, setStudents] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const token = localStorage.getItem("access_token");
  const studentId = localStorage.getItem("student_id");

  const fetchTeam = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/my-team`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to fetch team."
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    fetch(`${API_URL}/my-invitations`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    })
      .then((response) => response.ok ? response.json() : [])
      .then(setInvitations)
      .catch(() => setInvitations([]));
  }, []);

  const respondToInvitation = async (invitationId, accept) => {
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/invitations/${invitationId}${accept ? "/accept" : ""}`,
        {
          method: accept ? "POST" : "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Could not respond to invitation.");
      }
      setInvitations((current) => current.filter((item) => item.id !== invitationId));
      if (accept) await fetchTeam();
    } catch (err) {
      setError(err.message);
    }
  };

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
        throw new Error(data.detail || "Unable to leave team.");
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
        throw new Error(data.detail || "Unable to delete team.");
      }

      navigate("/teams");
    } catch (err) {
      setError(err.message);
    }
  };

  const isOwner =
    team &&
    String(team.created_by) === String(studentId);

  // Only students not already on this team can be invited.
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

  const inviteStudents = students.filter(
    (student) =>
      !members.some(
        (member) => String(member.id) === String(student.id)
      )
  );

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to fetch students.");
      }

      setStudents(data.students || data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMember = async () => {
    if (!selectedStudent) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/teams/${team.id}/invitations/${selectedStudent}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to add member."
        );
      }

      setSelectedStudent("");
      setMessage("Invitation sent. The student must accept before joining.");
    } catch (err) {
      setError(err.message);
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
        throw new Error(data.detail || "Unable to remove member.");
      }

      setMessage("Member removed successfully.");
      await fetchTeam();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchStudents();
    }
  }, [isOwner]);

  // Pending invitations are actionable whether or not you already have a
  // team, so this block is rendered in both branches below.
  const invitationsSection =
    invitations.length > 0 ? (
      <div className="card p-6 mt-6">
        <h2 className="text-lg font-semibold">Team invitations</h2>

        {error && (
          <p role="alert" className="text-red-700 mt-3">
            {error}
          </p>
        )}

        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between gap-3 mt-4 flex-wrap"
          >
            <span>{invitation.team_name}</span>

            <div className="flex gap-2">
              <button
                className="primary-button"
                onClick={() => respondToInvitation(invitation.id, true)}
              >
                Accept
              </button>

              <button
                className="secondary-button"
                onClick={() => respondToInvitation(invitation.id, false)}
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : null;

  if (loading) {
    return (
      <main className="page-container max-w-4xl">
        <div className="card py-12 text-center text-zinc-500">
          Loading your team...
        </div>
      </main>
    );
  }

  if (error && !team && invitations.length === 0) {
    return (
      <div className="page-container max-w-4xl">
        <button
          onClick={() => navigate("/teams")}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Teams
        </button>

        <div role="alert" className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4">
          {error}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page-container max-w-4xl">
        <button
          onClick={() => navigate("/teams")}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Teams
        </button>

        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            You are not in a team
          </h2>

          <p className="text-zinc-500 mt-2">
            Join or create a team to get started.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => navigate("/teams")}
              className="secondary-button"
            >
              Browse Teams
            </button>

            <button
              onClick={() => navigate("/teams/create")}
              className="primary-button"
            >
              Create a Team
            </button>
          </div>
        </div>

        {invitationsSection}
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate("/teams")}
        className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Teams
      </button>

      {/* Team Header */}
      <div className="card p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

          <div className="min-w-0">
            <p className="eyebrow">
              My Team
            </p>

            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-900 break-words">
              {team.name}
            </h1>

            {team.project_title && (
              <p className="text-zinc-600 mt-1 leading-snug">
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

            <div className="badge !bg-zinc-900 !text-white !border-transparent !px-3 !py-1.5">
              {team.spots_available > 0
                ? `${team.spots_available} spot${team.spots_available === 1 ? "" : "s"} available`
                : "Full"}
            </div>

          </div>
        </div>

        {team.description && (
          <p className="text-zinc-600 mt-5 leading-relaxed">
            {team.description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-100">

          <div>
            <p className="eyebrow">
              Department Preference
            </p>
            <p className="text-sm font-medium text-zinc-900 mt-1.5">
              {team.department_preference}
            </p>
          </div>

          {team.skills_needed && (
            <div>
              <p className="eyebrow">
                Skills Needed
              </p>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {team.skills_needed
                  .split(",")
                  .map((skill) => skill.trim())
                  .filter(Boolean)
                  .map((skill, index) => (
                    <span key={index} className="tag">
                      {skill}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {team.roles_needed && (
            <div>
              <p className="eyebrow">
                Roles Needed
              </p>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {team.roles_needed
                  .split(",")
                  .map((role) => role.trim())
                  .filter(Boolean)
                  .map((role, index) => (
                    <span key={index} className="tag">
                      {role}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {team.contact && (
            <div>
              <p className="eyebrow">
                Contact
              </p>

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
                    className="text-sm font-medium text-zinc-900 mt-1.5 break-all hover:underline inline-block"
                  >
                    {team.contact}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-zinc-900 mt-1.5 break-all">
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
        <div role="status" className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {invitationsSection}

      {/* Members */}
      <div className="card p-5 sm:p-7 mt-6">

        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Team Members
            </h2>

            <p className="text-sm text-zinc-500 mt-0.5">
              {members.length} member
              {members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {members.map((member) => {
            const memberIsOwner =
              String(member.id) === String(team.created_by);

            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 border border-zinc-200 rounded-xl p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold text-zinc-700 shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 truncate">
                      {member.name}
                    </p>

                    {member.email && (
                      <p className="text-sm text-zinc-500 truncate">
                        {member.email}
                      </p>
                    )}

                    {memberIsOwner && (
                      <span className="badge mt-1.5">
                        Team Owner
                      </span>
                    )}
                  </div>
                </div>

                {isOwner && !memberIsOwner && (
                  <button
                    type="button"
                    onClick={() => requestRemoveConfirm(member)}
                    className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    title="Remove member"
                    aria-label={`Remove ${member.name} from the team`}
                  >
                    <UserMinus size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Member */}
        {isOwner && members.length < MAX_TEAM_MEMBERS && (
          <div className="mt-6 pt-6 border-t border-zinc-100">

            <h3 className="text-sm font-semibold text-zinc-900 mb-3">
              Invite Team Member
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">

              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="input-field flex-1 !py-2.5"
                aria-label="Select a student to invite"
              >
                <option value="">Select a student</option>

                {inviteStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.program
                      ? `${student.name} — ${student.program}`
                      : student.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedStudent}
                className="primary-button !py-2.5 shrink-0"
              >
                <UserPlus size={17} />
                Send Invitation
              </button>

            </div>
          </div>
        )}

        {/* Team full */}
        {isOwner && members.length >= MAX_TEAM_MEMBERS && (
          <div className="mt-6 pt-6 border-t border-zinc-100">
            <p className="text-sm text-zinc-500">
              This team is full ({MAX_TEAM_MEMBERS} members maximum).
              Remove a member to add someone else.
            </p>
          </div>
        )}
      </div>

      {/* Leave / Delete Team */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">

        <button
          onClick={requestLeaveConfirm}
          className="danger-button w-full sm:w-auto"
        >
          Leave Team
        </button>

        {isOwner && (
          <button
            onClick={requestDeleteConfirm}
            className="danger-button w-full sm:w-auto"
          >
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