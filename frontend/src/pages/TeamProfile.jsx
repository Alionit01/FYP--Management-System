import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);

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

  const showContact = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setContactLoading(true);

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
        throw new Error(
          data.detail || "Failed to get contact"
        );
      }

      setContact(data);
    } catch (error) {
      console.error(error);
    } finally {
      setContactLoading(false);
    }
  };

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
        <section className="mt-8">
          <h2 className="font-semibold">
            Contact
          </h2>

          {!contact ? (
            <>
              <p className="mt-2 text-sm text-gray-500">
                Contact information is available to logged-in
                university students.
              </p>

              <button
                onClick={showContact}
                disabled={contactLoading}
                className="mt-3 w-full border rounded-xl py-3 font-medium"
              >
                {contactLoading
                  ? "Loading..."
                  : "Show Contact Information"}
              </button>
            </>
          ) : (
            <div className="mt-3 space-y-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="block border rounded-xl p-3"
                >
                  📧 {contact.email}
                </a>
              )}

              {contact.whatsapp && (
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(
                    /\D/g,
                    ""
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block border rounded-xl p-3"
                >
                  WhatsApp: {contact.whatsapp}
                </a>
              )}

              {!contact.email && !contact.whatsapp && (
                <p className="text-sm text-gray-500">
                  No contact information provided.
                </p>
              )}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

export default TeamProfile;