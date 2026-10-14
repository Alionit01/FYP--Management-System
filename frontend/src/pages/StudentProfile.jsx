import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, Code2, Mail, MessageCircle } from "lucide-react";
import API_URL from "../api";
import { extractErrorMessage } from "../api/errors";
import Alert from "../components/Alert";
import Avatar from "../components/Avatar";
import Tags from "../components/Tags";

function isSafeUrl(url) {
  if (!url) return false;
  const lowered = url.trim().toLowerCase();
  return lowered.startsWith("https://") || lowered.startsWith("http://");
}

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
      if (!token) {
        navigate("/login", {
          state: {
            from: { pathname: `/students/${id}` },
            message: "Sign in to view student profiles.",
          },
        });
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/students/${id}`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
  }, [id, token, navigate]);

  const showContact = async () => {
    if (!token) {
      navigate("/login", {
        state: {
          from: { pathname: `/students/${id}` },
          message: "Sign in to view this student's contact information.",
        },
      });
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
          extractErrorMessage(
            response, data, "Could not load contact information."
          )
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
        <p role="status" className="sr-only">
          Loading profile…
        </p>

        <div className="skeleton h-5 w-40" aria-hidden="true" />

        <div className="card mt-6 p-5 sm:p-7" aria-hidden="true">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="skeleton h-20 w-20 rounded-full" />

            <div className="flex-1 space-y-3">
              <div className="skeleton h-7 w-48" />
              <div className="skeleton h-4 w-32" />
            </div>
          </div>

          <div className="skeleton mt-8 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-5/6" />
          <div className="skeleton mt-8 h-20 w-full" />
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="page-container max-w-4xl">
        <div className="empty-state">
          <h1 className="display text-2xl text-forest-900">
            Student not found
          </h1>

          <p className="mt-2 text-ink-soft">{error}</p>

          <Link to="/students" className="primary-button mt-5">
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
        className="link-quiet inline-flex items-center gap-2"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to Students</span>
      </button>

      {/* Profile */}
      <section className="card mt-6 p-5 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <Avatar
            name={student.name}
            src={student.profile_picture}
            size="lg"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="display text-3xl sm:text-4xl text-forest-900 break-words">
                {student.name}
              </h1>

              {student.fyp_status && (
                <span
                  className={`badge w-fit ${
                    student.fyp_status === "Looking for a team"
                      ? "badge-open"
                      : "badge-full"
                  }`}
                >
                  {student.fyp_status}
                </span>
              )}
            </div>

            <p className="mt-3 text-sm font-medium text-ink-soft">
              {student.program}
            </p>

            <p className="mt-0.5 text-xs text-ink-muted">
              {student.university_id}
            </p>
          </div>
        </div>

        {/* About */}
        {student.bio && (
          <div className="mt-8 pt-6 divider">
            <p className="eyebrow">About</p>

            <p className="mt-3 text-ink-soft leading-relaxed">
              {student.bio}
            </p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-7">
            <p className="eyebrow">Skills</p>

            <div className="mt-3">
              <Tags items={skills} size="lg" />
            </div>
          </div>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow">Interests</p>

            <div className="mt-3">
              <Tags items={interests} size="lg" />
            </div>
          </div>
        )}

        {/* Links */}
        {(isSafeUrl(student.github) || isSafeUrl(student.linkedin)) && (
          <div className="mt-7 flex flex-wrap gap-3">
            {isSafeUrl(student.github) && (
              <a
                href={student.github}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                <Code2 size={16} aria-hidden="true" />
                GitHub
              </a>
            )}

            {isSafeUrl(student.linkedin) && (
              <a
                href={student.linkedin}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                <BriefcaseBusiness size={16} aria-hidden="true" />
                LinkedIn
              </a>
            )}
          </div>
        )}

        {/* Contact */}
        <div className="mt-8 pt-6 divider">
          {!contact ? (
            <div>
              <p className="eyebrow">Contact</p>

              <h2 className="display mt-3 text-xl text-forest-900">
                Want to contact{" "}
                {student.name.split(" ")[0]}?
              </h2>

              <p className="mt-2 text-sm text-ink-muted">
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
                  : "Show contact information"}
              </button>

              {error && (
                <div className="mt-4 max-w-md">
                  <Alert kind="error">{error}</Alert>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="eyebrow">Contact Information</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="card card-hover block p-4"
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">
                      <Mail size={14} aria-hidden="true" />
                      Email
                    </span>

                    <span className="mt-1.5 block text-sm font-medium text-ink break-all">
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
                    className="card card-hover block p-4"
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">
                      <MessageCircle size={14} aria-hidden="true" />
                      WhatsApp
                    </span>

                    <span className="mt-1.5 block text-sm font-medium text-ink">
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
