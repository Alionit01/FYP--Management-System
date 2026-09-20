import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/teams/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load team");
        }

        return response.json();
      })
      .then((data) => {
        setTeam(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    fetch(`http://127.0.0.1:8000/teams/${id}/contact`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load contact");
        }

        return response.json();
      })
      .then((data) => {
        setContact(data.contact);
      })
      .catch(() => {
        setContact(null);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading team...</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-500">Team not found.</p>
      </main>
    );
  }

  const skills = team.skills_needed
    ? team.skills_needed
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];

  const roles = team.roles_needed
    ? team.roles_needed
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean)
    : [];

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

      {/* Team Header */}
      <section className="mt-6 bg-white border border-gray-300 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Team
            </p>

            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900">
              {team.name}
            </h1>

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

        {/* Project */}
        {team.project_title && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
              Project
            </p>

            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {team.project_title}
            </h2>
          </div>
        )}

        {/* Description */}
        {team.description && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
              Description
            </p>

            <p className="mt-2 text-gray-600 leading-relaxed">
              {team.description}
            </p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-5">
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
        {contact && (
          <div className="mt-6 pt-5 border-t border-gray-200">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
              Team Contact
            </p>

            <p className="mt-1 text-sm text-gray-700 break-all">
              {contact}
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
            Members
          </h2>
        </div>

        {team.members?.length > 0 ? (
          <div className="mt-5 space-y-3">
            {team.members.map((member) => (
              <Link
                key={member.id}
                to={`/students/${member.id}`}
                className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3 hover:border-gray-400 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {member.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {member.program}
                  </p>
                </div>

                <span className="text-sm text-gray-500 shrink-0">
                  View
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-gray-500">
            No members found.
          </p>
        )}
      </section>
    </main>
  );
}

export default TeamProfile;