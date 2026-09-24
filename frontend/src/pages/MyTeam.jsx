import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, UserMinus } from "lucide-react";
import API_URL from "../api";

const MAX_TEAM_MEMBERS = 4;

function MyTeam() {
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleLeaveTeam = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to leave this team?"
    );

    if (!confirmed) return;

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

  const isOwner =
    team &&
    String(team.created_by) === String(studentId);

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
        `${API_URL}/teams/${team.id}/members/${selectedStudent}`,
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
      setMessage("Member added successfully.");
      await fetchTeam();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this member?"
    );

    if (!confirmed) return;

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

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <p className="text-zinc-500">Loading your team...</p>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="page-container max-w-4xl">
        <button
          onClick={() => navigate("/teams")}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Teams
        </button>

        <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4">
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
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-6 transition-colors"
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

          <button
            onClick={() => navigate("/teams")}
            className="primary-button mt-5"
          >
            Browse Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate("/teams")}
        className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-6 transition-colors"
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
              {team.spots_available} spots available
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
              <p className="text-sm font-medium text-zinc-900 mt-1.5">
                {team.skills_needed}
              </p>
            </div>
          )}

          {team.roles_needed && (
            <div>
              <p className="eyebrow">
                Roles Needed
              </p>
              <p className="text-sm font-medium text-zinc-900 mt-1.5">
                {team.roles_needed}
              </p>
            </div>
          )}

          {team.contact && (
            <div>
              <p className="eyebrow">
                Contact
              </p>
              <p className="text-sm font-medium text-zinc-900 mt-1.5 break-all">
                {team.contact}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

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
                    onClick={() => handleRemoveMember(member.id)}
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
              Add Team Member
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">

              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="input-field flex-1 !py-2.5"
              >
                <option value="">Select a student</option>

                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} — {student.program}
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
                Add Member
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

      {/* Leave Team */}
      {!isOwner && (
        <div className="mt-6">
          <button
            onClick={handleLeaveTeam}
            className="danger-button w-full sm:w-auto"
          >
            Leave Team
          </button>
        </div>
      )}

    </div>
  );
}

export default MyTeam;