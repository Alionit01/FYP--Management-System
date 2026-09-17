import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function TeamProfile() {
  const { id } = useParams();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/teams/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Team not found");
        }

        return response.json();
      })
      .then((data) => {
        setTeam(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setTeam(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="p-6">
        Loading...
      </main>
    );
  }

  if (!team) {
    return (
      <main className="p-6">
        Team not found.
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24">

      <Link
        to="/teams"
        className="text-sm text-gray-500"
      >
        ← Back to Teams
      </Link>

      <div className="mt-6 border rounded-2xl p-6 bg-white">

        {/* Team Header */}
        <div>
          <div className="flex items-start justify-between gap-4">

            <div>
              <h1 className="text-2xl font-bold">
                {team.name}
              </h1>

              <p className="mt-1 text-gray-500">
                {team.project_title || "Project not decided yet"}
              </p>
            </div>

            <span className="shrink-0 border rounded-full px-3 py-1 text-sm">
              {team.spots_available} spots
            </span>

          </div>
        </div>

        {/* Description */}
        {team.description && (
          <section className="mt-8">
            <h2 className="font-semibold">
              About the Project
            </h2>

            <p className="mt-2 text-gray-600">
              {team.description}
            </p>
          </section>
        )}

        {/* Department */}
        <section className="mt-6">
          <h2 className="font-semibold">
            Department Preference
          </h2>

          <p className="mt-2 text-gray-600">
            {team.department_preference}
          </p>
        </section>

        {/* Skills */}
        {team.skills_needed && (
          <section className="mt-6">
            <h2 className="font-semibold">
              Skills Needed
            </h2>

            <p className="mt-2 text-gray-600">
              {team.skills_needed}
            </p>
          </section>
        )}

        {/* Roles */}
        {team.roles_needed && (
          <section className="mt-6">
            <h2 className="font-semibold">
              Roles Needed
            </h2>

            <p className="mt-2 text-gray-600">
              {team.roles_needed}
            </p>
          </section>
        )}

        {/* Members */}
        <section className="mt-8">

          <h2 className="font-semibold">
            Current Members
          </h2>

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
                    {member.program} · {member.university_id}
                  </p>
                </div>

              </Link>
            ))}

          </div>
        </section>

        {/* Contact */}
        {team.contact && (
          <section className="mt-8">

            <h2 className="font-semibold">
              Contact
            </h2>

            <p className="mt-2 text-gray-600">
              {team.contact}
            </p>

          </section>
        )}

      </div>
    </main>
  );
}

export default TeamProfile;