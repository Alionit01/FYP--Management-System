import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import API_URL from "../api";

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
          `${API_URL}/students/${id}`,
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
        `${API_URL}/students/${id}/contact`,
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
      <main className="page-container max-w-4xl">
        <p className="text-zinc-500">Loading profile...</p>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="page-container max-w-4xl">
        <div className="card p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900">
            Student not found
          </h1>

          <p className="mt-2 text-zinc-500">
            {error}
          </p>

          <Link
            to="/students"
            className="primary-button mt-5"
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
    <main className="page-container max-w-4xl">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/students")}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Back to Students</span>
      </button>

      {/* Profile */}
      <section className="card mt-6 p-5 sm:p-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {student.profile_picture ? (
            <img
              src={student.profile_picture}
              alt={student.name}
              className="w-20 h-20 rounded-full object-cover shrink-0 ring-2 ring-zinc-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-2xl font-semibold text-zinc-700 shrink-0 ring-2 ring-zinc-100">
              {student.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 break-words">
                {student.name}
              </h1>

              {student.fyp_status && (
                <span className="badge w-fit">
                  {student.fyp_status}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm font-medium text-zinc-700">
              {student.program}
            </p>

            <p className="mt-0.5 text-xs text-zinc-400">
              {student.university_id}
            </p>
          </div>
        </div>

        {/* About */}
        {student.bio && (
          <div className="mt-7 pt-6 border-t border-zinc-100">
            <p className="eyebrow">
              About
            </p>

            <p className="mt-2 text-zinc-600 leading-relaxed">
              {student.bio}
            </p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow">
              Skills
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

        {/* Interests */}
        {interests.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow">
              Interests
            </p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {interests.map((interest, index) => (
                <span
                  key={index}
                  className="tag !text-sm !px-3 !py-1.5"
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
                className="secondary-button"
              >
                GitHub
              </a>
            )}

            {student.linkedin && (
              <a
                href={student.linkedin}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                LinkedIn
              </a>
            )}
          </div>
        )}

        {/* Contact */}
        <div className="mt-7 pt-6 border-t border-zinc-100">
          {!contact ? (
            <div>
              <p className="eyebrow">
                Contact
              </p>

              <h2 className="mt-1.5 text-lg font-semibold text-zinc-900">
                Want to contact{" "}
                {student.name.split(" ")[0]}?
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Contact information is only available to logged-in
                students.
              </p>

              <button
                type="button"
                onClick={showContact}
                disabled={contactLoading}
                className="primary-button mt-4"
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
              <p className="eyebrow">
                Contact Information
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="block border border-zinc-200 rounded-xl p-3.5 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
                  >
                    <span className="text-xs font-medium text-zinc-400 block">
                      Email
                    </span>

                    <span className="mt-1 block text-sm font-medium text-zinc-900 break-all">
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
                    className="block border border-zinc-200 rounded-xl p-3.5 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
                  >
                    <span className="text-xs font-medium text-zinc-400 block">
                      WhatsApp
                    </span>

                    <span className="mt-1 block text-sm font-medium text-zinc-900">
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

