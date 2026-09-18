import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Teams() {
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("All");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/teams")
      .then((response) => response.json())
      .then((data) => {
        setTeams(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  const filteredTeams = teams.filter((team) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      team.name.toLowerCase().includes(searchText) ||
      (team.project_title || "").toLowerCase().includes(searchText) ||
      (team.description || "").toLowerCase().includes(searchText) ||
      (team.skills_needed || "").toLowerCase().includes(searchText) ||
      (team.roles_needed || "").toLowerCase().includes(searchText);

    const matchesProgram =
      program === "All" ||
      team.department_preference === program ||
      team.department_preference === "Any";

    return matchesSearch && matchesProgram;
  });

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <p className="text-gray-500">Loading teams...</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
  <div>
    <h1 className="text-3xl font-bold">
      Find Teams
    </h1>

    <p className="mt-2 text-gray-600">
      Explore FYP teams looking for members.
    </p>
  </div>

  <button
    onClick={() => navigate("/teams/create")}
    className="w-full sm:w-auto bg-black text-white px-5 py-3 rounded-xl font-medium"
  >
    Create Team
  </button>
</div>

      {/* Search */}
      <div className="mt-6">
        <input
          type="text"
          placeholder="Search teams, projects, skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2"
        />
      </div>

      {/* Filter */}
      <div className="mt-3">
        <select
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className="w-full sm:w-auto border rounded-xl px-4 py-3 bg-white"
        >
          <option value="All">All Programs</option>
          <option value="BSCS">BSCS</option>
          <option value="BSAI">BSAI</option>
          <option value="BSCB">BSCB</option>
          <option value="BSSE">BSSE</option>
          <option value="BESE">BESE</option>
        </select>
      </div>

      {/* Teams */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            className="border rounded-2xl p-5 bg-white"
          >
            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0">
                <h2 className="text-lg font-semibold">
                  {team.name}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {team.project_title || "Project not decided yet"}
                </p>
              </div>

              <span className="shrink-0 text-xs border rounded-full px-3 py-1">
                {team.spots_available} spots
              </span>

            </div>

            {team.description && (
              <p className="mt-4 text-sm text-gray-600">
                {team.description}
              </p>
            )}

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">
                  Department:
                </span>{" "}
                {team.department_preference}
              </p>

              {team.skills_needed && (
                <p>
                  <span className="font-medium">
                    Skills:
                  </span>{" "}
                  {team.skills_needed}
                </p>
              )}

              {team.roles_needed && (
                <p>
                  <span className="font-medium">
                    Looking for:
                  </span>{" "}
                  {team.roles_needed}
                </p>
              )}
            </div>

            <button
              onClick={() => navigate(`/teams/${team.id}`)}
              className="mt-5 w-full border rounded-xl py-2.5 font-medium"
            >
              View Team
            </button>
          </div>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <p className="text-center text-gray-500 mt-12">
          No teams found.
        </p>
      )}

    </main>
  );
}

export default Teams;