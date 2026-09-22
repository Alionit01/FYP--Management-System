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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Directory
          </p>

          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            Find a Team
          </h1>

          <p className="mt-3 text-gray-600 max-w-2xl">
            Explore FYP teams, see what they are building, and find out which
            skills and roles they need.
          </p>
        </div>

        <Link
          to="/teams/create"
          className="inline-flex items-center !text-white justify-center bg-gray-900 text-white px-5 py-3 rounded-lg font-medium text-sm hover:bg-gray-800 transition shrink-0"
        >
          Create Team
        </Link>
      </div>

      {/* Filters */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 mb-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Search
            </label>

            <input
              type="text"
              placeholder="Team name, project, skills, roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Department
            </label>

            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-gray-900"
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
        <p className="text-sm text-gray-500">
          {filteredTeams.length}{" "}
          {filteredTeams.length === 1 ? "team" : "teams"}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center text-gray-500">
          Loading teams...
        </div>
      )}

      {/* Empty */}
      {!loading && filteredTeams.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <h2 className="font-semibold text-lg">No teams found</h2>

          <p className="mt-2 text-gray-500">
            Try changing your search or department filter.
          </p>
        </div>
      )}

      {/* Teams */}
      {!loading && filteredTeams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {filteredTeams.map((team) => (
            <article
              key={team.id}
              className="bg-white border border-gray-300 rounded-xl p-5 flex flex-col h-full hover:border-gray-400 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {team.name}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    {team.department_preference === "Any"
                      ? "Open to all departments"
                      : team.department_preference}
                  </p>
                </div>

                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${
                    team.spots_available > 0
                      ? "border-gray-200 text-gray-600"
                      : "border-gray-300 text-gray-400"
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
                <h3 className="mt-5 font-medium">{team.project_title}</h3>
              )}

              {team.description && (
                <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
                  {team.description}
                </p>
              )}

              {team.skills_needed && (
  <div className="mt-5">
    <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
      Skills needed
    </p>

    <div className="flex flex-wrap gap-2 mt-2">
      {team.skills_needed.split(",").map((skill, index) => (
        <span
          key={index}
          className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
        >
          {skill.trim()}
        </span>
      ))}
    </div>
  </div>
)}

              {team.roles_needed && (
  <div className="mt-4">
    <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
      Roles needed
    </p>

    <div className="flex flex-wrap gap-2 mt-2">
      {team.roles_needed.split(",").map((role, index) => (
        <span
          key={index}
          className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
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
                className="block mt-auto pt-5 text-center border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
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