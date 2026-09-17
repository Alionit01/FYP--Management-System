import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function MyTeam() {
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://127.0.0.1:8000/my-team", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Failed to load team"
          );
        }

        return data;
      })
      .then((data) => {
        setTeam(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setError(error.message);
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <p className="text-gray-500">
          Loading your team...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <div className="border rounded-2xl p-6 bg-white">
          <h1 className="text-2xl font-bold">
            You are not in a team yet
          </h1>

          <p className="mt-2 text-gray-600">
            Create your own team or explore existing teams.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/teams/create")}
              className="bg-black text-white px-5 py-3 rounded-xl font-medium"
            >
              Create Team
            </button>

            <button
              onClick={() => navigate("/teams")}
              className="border px-5 py-3 rounded-xl font-medium"
            >
              Explore Teams
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div>
        <p className="text-sm text-gray-500">
          My Team
        </p>

        <h1 className="text-3xl font-bold mt-1">
          {team.name}
        </h1>

        <p className="mt-2 text-gray-600">
          {team.project_title ||
            "Project not decided yet"}
        </p>
      </div>

      <div className="mt-8 border rounded-2xl p-6 bg-white">
        {team.description && (
          <section>
            <h2 className="font-semibold">
              About the Project
            </h2>

            <p className="mt-2 text-gray-600">
              {team.description}
            </p>
          </section>
        )}

        <section className="mt-6">
          <h2 className="font-semibold">
            Team Information
          </h2>

          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-900">
                Department:
              </span>{" "}
              {team.department_preference}
            </p>

            <p>
              <span className="font-medium text-gray-900">
                Available spots:
              </span>{" "}
              {team.spots_available}
            </p>

            {team.skills_needed && (
              <p>
                <span className="font-medium text-gray-900">
                  Skills needed:
                </span>{" "}
                {team.skills_needed}
              </p>
            )}

            {team.roles_needed && (
              <p>
                <span className="font-medium text-gray-900">
                  Roles needed:
                </span>{" "}
                {team.roles_needed}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Members
            </h2>

            <span className="text-sm text-gray-500">
              {team.members.length} member
              {team.members.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {team.members.map((member) => (
              <Link
                key={member.id}
                to={`/students/${member.id}`}
                className="flex items-center gap-3 border rounded-xl p-3"
              >
                {member.profile_picture ? (
                  <img
                    src={member.profile_picture}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-semibold">
                    {member.name.charAt(0)}
                  </div>
                )}

                <div>
                  <p className="font-medium">
                    {member.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {member.program} ·{" "}
                    {member.university_id}
                  </p>
                </div>

                {member.id === team.created_by && (
                  <span className="ml-auto text-xs border rounded-full px-2 py-1">
                    Owner
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <button
            onClick={() => navigate(`/teams/${team.id}`)}
            className="w-full border rounded-xl py-3 font-medium"
          >
            View Public Team Profile
          </button>
        </div>
      </div>
    </main>
  );
}

export default MyTeam;