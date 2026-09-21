import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, UserMinus } from "lucide-react";

function MyTeam() {
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");
  const studentId = localStorage.getItem("student_id");

  const fetchTeam = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/my-team",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Unable to load team.");
      }

      const data = await response.json();

      setTeam(data);
    } catch (err) {
      console.error(err);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const isOwner =
    team &&
    String(team.created_by) === String(studentId);

  const skills = team?.skills_needed
    ? team.skills_needed
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];

  const roles = team?.roles_needed
    ? team.roles_needed
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean)
    : [];

  const handleAddMember = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!memberId.trim()) {
      setError("Please enter a Student ID.");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/teams/${team.id}/members/${memberId.trim()}`,
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
          data.detail || "Unable to add member."
        );
      }

      setMessage("Member added successfully.");
      setMemberId("");

      await fetchTeam();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (member) => {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      `Remove ${member.name} from the team?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/teams/${team.id}/members/${member.id}`,
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
          data.detail || "Unable to remove member."
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-gray-500">
          Loading your team...
        </p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
        <button
          type="button"
          onClick={() => navigate("/teams")}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Teams</span>
        </button>

        <div className="mt-8 border border-gray-300 rounded-xl p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">
            You are not in a team
          </h1>

          <p className="mt-2 text-gray-500">
            Find an existing team or create your own.
          </p>

          <button
            type="button"
            onClick={() => navigate("/teams")}
            className="mt-5 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Find a Team
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/teams")}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Back to Teams</span>
      </button>

      {/* Header */}
      <section className="mt-6">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          My Team
        </p>

        <div className="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {team.name}
            </h1>

            {team.project_title && (
              <p className="mt-2 text-lg font-semibold text-gray-800">
                {team.project_title}
              </p>
            )}

            <p className="mt-2 text-sm text-gray-500">
              {team.department_preference === "Any"
                ? "Open to all departments"
                : team.department_preference}
            </p>
          </div>

          <span
            className={`self-start text-sm font-medium px-3 py-1.5 rounded-full ${
              team.spots_available > 0
                ? "bg-gray-100 text-gray-700"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {team.spots_available > 0
              ? `${team.spots_available} spot${
                  team.spots_available === 1 ? "" : "s"
                } available`
              : "Full"}
          </span>
        </div>
      </section>

      {/* Team Overview */}
      <section className="mt-6 bg-white border border-gray-300 rounded-xl p-5 sm:p-6">
        {/* Description */}
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
            Description
          </p>

          <p className="mt-2 text-gray-600 leading-relaxed">
            {team.description || "No description provided."}
          </p>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
              Skills Needed
            </p>

            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Roles */}
        {roles.length > 0 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
              Roles Needed
            </p>

            <div className="flex flex-wrap gap-2 mt-2">
              {roles.map((role, index) => (
                <span
                  key={index}
                  className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {team.contact && (
          <div className="mt-6 pt-5 border-t border-gray-200">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
              Team Contact
            </p>

            <p className="mt-1 text-sm text-gray-700 break-all">
              {team.contact}
            </p>
          </div>
        )}
      </section>

      {/* Members */}
      <section className="mt-6 bg-white border border-gray-300 rounded-xl p-5 sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
            Team Members
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-900">
            {team.members?.length || 0} Members
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {team.members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {member.name}
                </p>

                <p className="text-sm text-gray-500">
                  {member.program}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/students/${member.id}`)
                  }
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                >
                  View
                </button>

                {isOwner &&
                  String(member.id) !== String(studentId) && (
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveMember(member)
                      }
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                    >
                      <UserMinus size={16} />
                      Remove
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Member */}
        {isOwner && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <UserPlus
                size={19}
                className="text-gray-700"
              />

              <h3 className="text-lg font-bold text-gray-900">
                Add a Member
              </h3>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Enter the student's Student ID. They can find it
              on their Profile page.
            </p>

            <form
              onSubmit={handleAddMember}
              className="mt-4 flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                value={memberId}
                onChange={(e) =>
                  setMemberId(e.target.value)
                }
                placeholder="e.g. AUTH002"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
              >
                <UserPlus size={17} />
                Add Member
              </button>
            </form>

            {message && (
              <p className="mt-3 text-sm text-gray-600">
                {message}
              </p>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default MyTeam;