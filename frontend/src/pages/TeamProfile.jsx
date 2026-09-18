import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

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
      .catch(() => {
        setError("Team could not be found.");
        setLoading(false);
      });
  }, [id]);

  const showContact = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    setContactLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/teams/${id}/contact`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.detail || "Could not load contact information."
        );
        return;
      }

      setContact(data);
    } catch {
      setError("Could not load contact information.");
    } finally {
      setContactLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <p className="text-gray-500">Loading team...</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <div className="border border-gray-200 rounded-xl p-8 text-center">
          <h1 className="text-xl font-semibold">
            Team not found
          </h1>

          <p className="mt-2 text-gray-500">
            {error}
          </p>

          <Link
            to="/teams"
            className="inline-block mt-5 bg-gray-900 text-white px-5 py-2.5 rounded-lg"
          >
            Back to Teams
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">

      <Link
        to="/teams"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8"
      >
        ← Back to Teams
      </Link>

      {/* Team header */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {team.name}
              </h1>

              <span className="text-xs font-medium border border-gray-200 rounded-full px-3 py-1">
                {team.spots_available > 0
                  ? `${team.spots_available} spot${
                      team.spots_available === 1
                        ? ""
                        : "s"
                    } available`
                  : "Full"}
              </span>
            </div>

            <p className="mt-2 text-gray-500">
              {team.department_preference === "Any"
                ? "Open to all departments"
                : team.department_preference}
            </p>
          </div>

        </div>

        {/* Project */}
        {team.project_title && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Project
            </h2>

            <p className="mt-2 text-xl font-semibold">
              {team.project_title}
            </p>
          </div>
        )}

        {/* Description */}
        {team.description && (
          <div className="mt-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              About the project
            </h2>

            <p className="mt-2 text-gray-600 leading-relaxed">
              {team.description}
            </p>
          </div>
        )}

        {/* Skills */}
        {team.skills_needed && (
          <div className="mt-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Skills needed
            </h2>

            <p className="mt-2 text-gray-700 leading-relaxed">
              {team.skills_needed}
            </p>
          </div>
        )}

        {/* Roles */}
        {team.roles_needed && (
          <div className="mt-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Roles needed
            </h2>

            <p className="mt-2 text-gray-700 leading-relaxed">
              {team.roles_needed}
            </p>
          </div>
        )}

        {/* Members */}
        <div className="mt-8 pt-7 border-t border-gray-200">

          <h2 className="text-xl font-semibold mb-4">
            Team Members
          </h2>

          <div className="grid gap-3">

            {team.members?.map((member) => (
              <Link
                key={member.id}
                to={`/students/${member.id}`}
                className="border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-50 transition"
              >

                {member.profile_picture ? (
                  <img
                    src={member.profile_picture}
                    alt={member.name}
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center font-semibold shrink-0">
                    {member.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="font-medium">
                    {member.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {member.program}
                  </p>
                </div>

              </Link>
            ))}

          </div>
        </div>

        {/* Contact */}
        <div className="mt-8 pt-7 border-t border-gray-200">

          {!contact ? (
            <>
              <h2 className="font-semibold">
                Interested in joining?
              </h2>

              <p className="text-sm text-gray-500 mt-1 mb-4">
                Contact information is only available to
                logged-in students.
              </p>

              <button
                onClick={showContact}
                disabled={contactLoading}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {contactLoading
                  ? "Loading..."
                  : "Show Contact Information"}
              </button>
            </>
          ) : (
            <>
              <h2 className="font-semibold mb-4">
                Contact Information
              </h2>

              {contact.contact && (
                <div className="border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-400">
                    Contact
                  </p>

                  <p className="text-sm font-medium mt-1">
                    {contact.contact}
                  </p>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}

        </div>

      </section>

    </main>
  );
}

export default TeamProfile;