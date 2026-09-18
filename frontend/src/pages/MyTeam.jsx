import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function MyTeam() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState(null);

  const [memberId, setMemberId] = useState("");
  const [memberLoading, setMemberLoading] = useState(false);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/my-team", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data === null) {
          setTeam(null);
        } else {
          setTeam(data);
        }

        setLoading(false);
      })
      .catch(() => {
        setError("Could not load your team.");
        setLoading(false);
      });
  }, [token]);

  const addMember = async () => {
    if (!memberId.trim()) {
      return;
    }

    setMemberLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/teams/${team.id}/members/${memberId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Could not add student.");
        return;
      }

      setStudent(data);
      setMemberId("");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setMemberLoading(false);
    }
  };

  const removeMember = async (id) => {
    setError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/teams/${team.id}/members/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Could not remove student.");
        return;
      }

      setTeam((currentTeam) => ({
        ...currentTeam,
        members: currentTeam.members.filter(
          (member) => member.id !== id
        ),
        spots_available: currentTeam.spots_available + 1,
      }));
    } catch {
      setError("Could not connect to the server.");
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <p className="text-gray-500">Loading your team...</p>
      </main>
    );
  }

  if (error && !team) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <div className="border border-red-200 bg-red-50 rounded-xl p-6">
          <p className="text-red-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24 md:pb-10">
        <div className="border border-gray-200 rounded-2xl p-8 sm:p-10 text-center bg-white">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            My Team
          </p>

          <h1 className="mt-3 text-2xl sm:text-3xl font-bold">
            You are not in a team yet
          </h1>

          <p className="mt-3 text-gray-500 max-w-md mx-auto">
            Browse existing teams or create your own FYP team.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/teams"
              className="bg-gray-900 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              Browse Teams
            </Link>

            <Link
              to="/teams/create"
              className="border border-gray-300 px-5 py-3 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Create a Team
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isOwner =
    String(team.created_by) ===
    String(localStorage.getItem("student_id"));

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
      <div className="mb-8">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          My Team
        </p>

        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          {team.name}
        </h1>

        <p className="mt-2 text-gray-500">
          {team.department_preference === "Any"
            ? "Open to all departments"
            : team.department_preference}
        </p>
      </div>

      <div className="space-y-5">
        {/* Team overview */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              Team Overview
            </h2>

            <span className="text-sm border border-gray-200 rounded-full px-3 py-1">
              {team.spots_available > 0
                ? `${team.spots_available} spot${
                    team.spots_available === 1 ? "" : "s"
                  } available`
                : "Full"}
            </span>
          </div>

          {team.project_title && (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
                Project
              </p>
              <p className="mt-1 font-semibold text-lg">
                {team.project_title}
              </p>
            </div>
          )}

          {team.description && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
                Description
              </p>
              <p className="mt-1 text-gray-600 leading-relaxed">
                {team.description}
              </p>
            </div>
          )}

          {team.skills_needed && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
                Skills Needed
              </p>
              <p className="mt-1 text-gray-600">
                {team.skills_needed}
              </p>
            </div>
          )}

          {team.roles_needed && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
                Roles Needed
              </p>
              <p className="mt-1 text-gray-600">
                {team.roles_needed}
              </p>
            </div>
          )}
        </section>

        {/* Members */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-xl font-semibold">
              Members
            </h2>

            <span className="text-sm text-gray-500">
              {team.members?.length || 0} member
              {(team.members?.length || 0) !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {team.members?.map((member) => (
              <div
                key={member.id}
                className="border border-gray-200 rounded-xl p-4 flex items-center gap-4"
              >
                {member.profile_picture ? (
                  <img
                    src={member.profile_picture}
                    alt={member.name}
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center font-semibold shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <Link
                  to={`/students/${member.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="font-medium hover:underline">
                    {member.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {member.program}
                  </p>
                </Link>

                {String(member.id) === String(team.created_by) && (
                  <span className="text-xs border border-gray-200 rounded-full px-2.5 py-1 text-gray-500">
                    Owner
                  </span>
                )}

                {isOwner &&
                  String(member.id) !== String(team.created_by) && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-sm text-gray-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
              </div>
            ))}
          </div>

          {/* Add member */}
          {isOwner && team.spots_available > 0 && (
            <div className="mt-7 pt-6 border-t border-gray-200">
              <h3 className="font-semibold">
                Add a Member
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Enter the student's database ID.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="Student ID"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
                />

                <button
                  onClick={addMember}
                  disabled={memberLoading}
                  className="bg-gray-900 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {memberLoading ? "Adding..." : "Add Member"}
                </button>
              </div>
            </div>
          )}

          {isOwner && team.spots_available === 0 && (
            <div className="mt-7 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Your team is currently full.
              </p>
            </div>
          )}
        </section>

        {/* Contact */}
        {team.contact && (
          <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold">
              Team Contact
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              This information is visible only to logged-in students.
            </p>

            <div className="mt-5 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400">
                Contact
              </p>

              <p className="text-sm font-medium mt-1">
                {team.contact}
              </p>
            </div>
          </section>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

export default MyTeam;