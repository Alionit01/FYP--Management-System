import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/students/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Student not found");
        }

        return response.json();
      })
      .then((data) => {
        setStudent(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Student could not be found.");
        setLoading(false);
      });
  }, [id]);

  const showContact = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    setContactLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/students/${id}/contact`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Could not load contact information.");
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
        <p className="text-gray-500">Loading profile...</p>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <div className="border border-gray-200 rounded-xl p-8 text-center">
          <h1 className="text-xl font-semibold">
            Student not found
          </h1>

          <p className="mt-2 text-gray-500">
            {error}
          </p>

          <Link
            to="/students"
            className="inline-block mt-5 bg-gray-900 text-white px-5 py-2.5 rounded-lg"
          >
            Back to Students
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">

      {/* Back */}
      <Link
        to="/students"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8"
      >
        ← Back to Students
      </Link>

      {/* Profile header */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">

        <div className="flex flex-col sm:flex-row sm:items-start gap-5">

          {student.profile_picture ? (
            <img
              src={student.profile_picture}
              alt={student.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-semibold">
              {student.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1">

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {student.name}
              </h1>

              {student.fyp_status && (
                <span className="w-fit text-xs font-medium border border-gray-200 rounded-full px-3 py-1">
                  {student.fyp_status}
                </span>
              )}
            </div>

            <p className="mt-2 text-gray-500">
              {student.program}
            </p>

            <p className="mt-1 text-sm text-gray-400">
              {student.university_id}
            </p>

          </div>

        </div>

        {/* Bio */}
        {student.bio && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              About
            </h2>

            <p className="mt-2 text-gray-600 leading-relaxed">
              {student.bio}
            </p>
          </div>
        )}

        {/* Skills */}
        {student.skills && (
          <div className="mt-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Skills
            </h2>

            <p className="mt-2 text-gray-700 leading-relaxed">
              {student.skills}
            </p>
          </div>
        )}

        {/* Interests */}
        {student.interests && (
          <div className="mt-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Interests
            </h2>

            <p className="mt-2 text-gray-700 leading-relaxed">
              {student.interests}
            </p>
          </div>
        )}

        {/* Links */}
        {(student.github || student.linkedin) && (
          <div className="mt-7 flex flex-wrap gap-3">

            {student.github && (
              <a
                href={student.github}
                target="_blank"
                rel="noreferrer"
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                GitHub
              </a>
            )}

            {student.linkedin && (
              <a
                href={student.linkedin}
                target="_blank"
                rel="noreferrer"
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                LinkedIn
              </a>
            )}

          </div>
        )}

        {/* Contact */}
        <div className="mt-8 pt-7 border-t border-gray-200">

          {!contact ? (
            <div>
              <h2 className="font-semibold">
                Want to contact {student.name.split(" ")[0]}?
              </h2>

              <p className="text-sm text-gray-500 mt-1 mb-4">
                Contact information is only available to logged-in students.
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
            </div>
          ) : (
            <div>
              <h2 className="font-semibold mb-4">
                Contact Information
              </h2>

              <div className="flex flex-col gap-3">

                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="text-xs text-gray-400 block">
                      Email
                    </span>
                    <span className="text-sm font-medium">
                      {contact.email}
                    </span>
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
                    className="border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="text-xs text-gray-400 block">
                      WhatsApp
                    </span>
                    <span className="text-sm font-medium">
                      {contact.whatsapp}
                    </span>
                  </a>
                )}

              </div>
            </div>
          )}

        </div>

      </section>

    </main>
  );
}

export default StudentProfile;