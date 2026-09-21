import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

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
    const controller = new AbortController();

    const fetchStudent = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://127.0.0.1:8000/students/${id}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Student not found");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setStudent(data);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (!controller.signal.aborted) {
          setStudent(null);
          setError("Student could not be found.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchStudent();

    return () => {
      controller.abort();
    };
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
        `http://127.0.0.1:8000/students/${id}/contact`,
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
        <p className="text-gray-500">Loading profile...</p>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
        <div className="border border-gray-300 rounded-xl p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Student not found
          </h1>

          <p className="mt-2 text-gray-500">
            {error}
          </p>

          <Link
            to="/students"
            className="inline-flex items-center justify-center mt-5 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Back to Students
          </Link>
        </div>
      </main>
    );
  }

  const skills = student.skills
    ? student.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];

  const interests = student.interests
    ? student.interests
        .split(",")
        .map((interest) => interest.trim())
        .filter(Boolean)
    : [];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/students")}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Back to Students</span>
      </button>

      {/* Profile */}
      <section className="mt-6 bg-white border border-gray-300 rounded-xl p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {student.profile_picture ? (
            <img
              src={student.profile_picture}
              alt={student.name}
              className="w-20 h-20 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-semibold text-gray-700 shrink-0">
              {student.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                {student.name}
              </h1>

              {student.fyp_status && (
                <span className="w-fit text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                  {student.fyp_status}
                </span>
              )}
            </div>

            <p className="mt-2 text-gray-600">
              {student.program}
            </p>

            <p className="mt-1 text-sm text-gray-400">
              {student.university_id}
            </p>
          </div>
        </div>

        {/* About */}
        {student.bio && (
          <div className="mt-7 pt-6 border-t border-gray-200">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
              About
            </p>

            <p className="mt-2 text-gray-600 leading-relaxed">
              {student.bio}
            </p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
              Skills
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

        {/* Interests */}
        {interests.length > 0 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
              Interests
            </p>

            <div className="flex flex-wrap gap-2 mt-2">
              {interests.map((interest, index) => (
                <span
                  key={index}
                  className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {(student.github || student.linkedin) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {student.github && (
              <a
                href={student.github}
                target="_blank"
                rel="noreferrer"
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition"
              >
                GitHub
              </a>
            )}

            {student.linkedin && (
              <a
                href={student.linkedin}
                target="_blank"
                rel="noreferrer"
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition"
              >
                LinkedIn
              </a>
            )}
          </div>
        )}

        {/* Contact */}
        <div className="mt-7 pt-6 border-t border-gray-200">
          {!contact ? (
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
                Contact
              </p>

              <h2 className="mt-1 text-lg font-bold text-gray-900">
                Want to contact{" "}
                {student.name.split(" ")[0]}?
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Contact information is only available to logged-in
                students.
              </p>

              <button
                type="button"
                onClick={showContact}
                disabled={contactLoading}
                className="mt-4 inline-flex items-center justify-center bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {contactLoading
                  ? "Loading..."
                  : "Show Contact Information"}
              </button>

              {error && (
                <p className="mt-3 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
                Contact Information
              </p>

              <div className="mt-4 space-y-3">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="block border border-gray-200 rounded-lg p-3 hover:border-gray-400 hover:bg-gray-50 transition"
                  >
                    <span className="text-xs text-gray-400 block">
                      Email
                    </span>

                    <span className="mt-1 block text-sm font-medium text-gray-900 break-all">
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
                    className="block border border-gray-200 rounded-lg p-3 hover:border-gray-400 hover:bg-gray-50 transition"
                  >
                    <span className="text-xs text-gray-400 block">
                      WhatsApp
                    </span>

                    <span className="mt-1 block text-sm font-medium text-gray-900">
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

