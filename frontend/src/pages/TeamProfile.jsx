import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import API_URL from "../api";

function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/teams/${id}`)
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

    fetch(`${API_URL}/teams/${id}/contact`, {
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
      <main className="page-container max-w-4xl">
        <p className="text-zinc-500">Loading team...</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="page-container max-w-4xl">
        <p className="text-zinc-500">Team not found.</p>
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
    <main className="page-container max-w-4xl">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/teams")}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Back to Teams</span>
      </button>

      {/* Team Header */}
      <section className="card mt-6 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">
              Team
            </p>

            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 break-words">
              {team.name}
            </h1>

            <p className="mt-2 text-sm font-medium text-zinc-600">
              {team.department_preference === "Any"
                ? "Open to all departments"
                : team.department_preference}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start shrink-0">
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                team.spots_available > 0
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {team.spots_available > 0
                ? `${team.spots_available} spot${
                    team.spots_available === 1 ? "" : "s"
                  } available`
                : "Full"}
            </span>

            {String(team.created_by) ===
              String(localStorage.getItem("student_id")) && (
              <button
                onClick={() => navigate(`/teams/${team.id}/edit`)}
                className="primary-button"
              >
                Edit Team
              </button>
            )}
          </div>
        </div>

        {/* Project */}
        {team.project_title && (
          <div className="mt-7 pt-6 border-t border-zinc-100">
            <p className="eyebrow">
              Project
            </p>

            <h2 className="mt-1.5 text-lg font-semibold text-zinc-900 leading-snug">
              {team.project_title}
            </h2>
          </div>
        )}

        {/* Description */}
        {team.description && (
          <div className="mt-6">
            <p className="eyebrow">
              Description
            </p>

            <p className="mt-2 text-zinc-600 leading-relaxed">
              {team.description}
            </p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow">
              Skills Needed
            </p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="tag !text-sm !px-3 !py-1.5"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Roles */}
        {roles.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow">
              Roles Needed
            </p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {roles.map((role, index) => (
                <span
                  key={index}
                  className="tag !text-sm !px-3 !py-1.5"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {contact && (
          <div className="mt-7 pt-6 border-t border-zinc-100">
            <p className="eyebrow">
              Team Contact
            </p>

            <p className="mt-1.5 text-sm font-medium text-zinc-800 break-all">
              {contact}
            </p>
          </div>
        )}
      </section>

      {/* Members */}
      <section className="mt-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Members
          </h2>

          <span className="text-sm font-medium text-zinc-500">
            {team.members?.length || 0}
          </span>
        </div>

        {team.members?.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {team.members.map((member) => (
              <Link
                key={member.id}
                to={`/students/${member.id}`}
                className="card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold text-zinc-700 shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 truncate">
                      {member.name}
                    </p>

                    <p className="text-xs font-medium text-zinc-500">
                      {member.program}
                    </p>
                  </div>
                </div>

                <span className="text-sm font-medium text-zinc-400 shrink-0">
                  View
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-zinc-500">
            No members found.
          </div>
        )}
      </section>
    </main>
  );
}

export default TeamProfile;