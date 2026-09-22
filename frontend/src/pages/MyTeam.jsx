import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, UserMinus } from "lucide-react";
import API_URL from "../api";

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading your team...</p>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="min-h-screen px-4 py-8">
        <button
          onClick={() => navigate("/teams")}
          className="flex items-center gap-2 text-gray-600 mb-6"
        >
          <ArrowLeft size={18} />
          Back to Teams
        </button>

        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen px-4 py-8">
        <button
          onClick={() => navigate("/teams")}
          className="flex items-center gap-2 text-gray-600 mb-6"
        >
          <ArrowLeft size={18} />
          Back to Teams
        </button>

        <div className="bg-white rounded-xl border p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            You are not in a team
          </h2>

          <p className="text-gray-500 mt-2">
            Join or create a team to get started.
          </p>

          <button
            onClick={() => navigate("/teams")}
            className="mt-5 px-4 py-2 bg-gray-900 text-white rounded-lg"
          >
            Browse Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Back */}
        <button
          onClick={() => navigate("/teams")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={18} />
          Back to Teams
        </button>

        {/* Team Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {team.name}
              </h1>

              {team.project_title && (
                <p className="text-gray-600 mt-1">
                  {team.project_title}
                </p>
              )}
            </div>

            {/* Owner actions + spots */}
            <div className="flex items-center gap-2">

              {isOwner && (
                <button
                  type="button"
                  onClick={() => navigate(`/teams/${team.id}/edit`)}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
                >
                  Edit Team
                </button>
              )}

              <div className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                {team.spots_available} spots available
              </div>

            </div>
          </div>

          {team.description && (
            <p className="text-gray-600 mt-5 leading-relaxed">
              {team.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Department Preference
              </p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {team.department_preference}
              </p>
            </div>

            {team.skills_needed && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Skills Needed
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {team.skills_needed}
                </p>
              </div>
            )}

            {team.roles_needed && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Roles Needed
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {team.roles_needed}
                </p>
              </div>
            )}

            {team.contact && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Contact
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {team.contact}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-4">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Members */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 mt-6">

          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Team Members
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {members.length} member
                {members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {members.map((member) => {
              const memberIsOwner =
                String(member.id) === String(team.created_by);

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.name}
                    </p>

                    {member.email && (
                      <p className="text-sm text-gray-500">
                        {member.email}
                      </p>
                    )}

                    {memberIsOwner && (
                      <span className="inline-block mt-1 text-xs font-medium text-gray-600">
                        Team Owner
                      </span>
                    )}
                  </div>

                  {isOwner && !memberIsOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                      title="Remove member"
                    >
                      <UserMinus size={18} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Member */}
          {isOwner && (
            <div className="mt-6 pt-6 border-t border-gray-100">

              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Add Team Member
              </h3>

              <div className="flex flex-col sm:flex-row gap-3">

                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
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
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus size={17} />
                  Add Member
                </button>

              </div>
            </div>
          )}
        </div>

        {/* Leave Team */}
        {!isOwner && (
          <div className="mt-6">
            <button
              onClick={handleLeaveTeam}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"
            >
              Leave Team
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default MyTeam;