import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_URL from "../api";

function Teams() {
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/teams`)
      .then((response) => response.json())
      .then((data) => {
        setTeams(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filteredTeams = teams.filter((team) => {
    const searchText = `
      ${team.name}
      ${team.project_title || ""}
      ${team.description || ""}
      ${team.skills_needed || ""}
      ${team.roles_needed || ""}
    `.toLowerCase();

    const matchesSearch = searchText.includes(search.toLowerCase());

    const matchesProgram =
      program === "All" ||
      team.department_preference === program ||
      team.department_preference === "Any";

    return matchesSearch && matchesProgram;
  });

  return (
    <main className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
        <div>
          <p className="eyebrow">
            Directory
          </p>

          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            Find a Team
          </h1>

          <p className="mt-3 text-zinc-600 max-w-2xl leading-relaxed">
            Explore FYP teams, see what they are building, and find out which
            skills and roles they need.
          </p>
        </div>

        <Link
          to="/teams/create"
          className="primary-button shrink-0"
        >
          Create Team
        </Link>
      </div>

      {/* Filters */}
      <section className="card p-4 sm:p-5 mb-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Search
            </label>

            <input
              type="text"
              placeholder="Team name, project, skills, roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Department
            </label>

            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="input-field"
            >
              <option value="All">All Departments</option>
              <option value="BSCS">BSCS</option>
              <option value="BSAI">BSAI</option>
              <option value="BSCB">BSCB</option>
              <option value="BSSE">BSSE</option>
              <option value="BESE">BESE</option>
            </select>
          </div>
        </div>
      </section>

      {/* Result count */}
      <div className="mb-4">
        <p className="text-sm font-medium text-zinc-500">
          {filteredTeams.length}{" "}
          {filteredTeams.length === 1 ? "team" : "teams"}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card py-12 text-center text-zinc-500">
          Loading teams...
        </div>
      )}

      {/* Empty */}
      {!loading && filteredTeams.length === 0 && (
        <div className="border border-dashed border-zinc-300 rounded-2xl p-10 text-center">
          <h2 className="font-semibold text-lg text-zinc-900">No teams found</h2>

          <p className="mt-2 text-zinc-500">
            Try changing your search or department filter.
          </p>
        </div>
      )}

      {/* Teams */}
      {!loading && filteredTeams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {filteredTeams.map((team) => (
            <article
              key={team.id}
              className="card p-5 sm:p-6 flex flex-col h-full transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">
                    Team
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-zinc-900 truncate">
                    {team.name}
                  </h2>

                  <p className="text-xs font-medium text-zinc-500 mt-1">
                    {team.department_preference === "Any"
                      ? "Open to all departments"
                      : team.department_preference}
                  </p>
                </div>

                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    team.spots_available > 0
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {team.spots_available > 0
                    ? `${team.spots_available} spot${
                        team.spots_available === 1 ? "" : "s"
                      }`
                    : "Full"}
                </span>
              </div>

              {team.project_title && (
                <h3 className="mt-5 text-base font-semibold text-zinc-900 leading-snug">
                  {team.project_title}
                </h3>
              )}

              {team.description && (
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed line-clamp-3">
                  {team.description}
                </p>
              )}

              {team.skills_needed && (
  <div className="mt-5">
    <p className="eyebrow">
      Skills needed
    </p>

    <div className="flex flex-wrap gap-1.5 mt-2">
      {team.skills_needed.split(",").map((skill, index) => (
        <span
          key={index}
          className="tag"
        >
          {skill.trim()}
        </span>
      ))}
    </div>
  </div>
)}

              {team.roles_needed && (
  <div className="mt-4">
    <p className="eyebrow">
      Roles needed
    </p>

    <div className="flex flex-wrap gap-1.5 mt-2">
      {team.roles_needed.split(",").map((role, index) => (
        <span
          key={index}
          className="tag"
        >
          {role.trim()}
        </span>
      ))}
    </div>
  </div>
)}

              {/* View Team */}
              <Link
                to={`/teams/${team.id}`}
                className="secondary-button w-full mt-auto pt-2.5"
              >
                View Team
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default Teams;