import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);

  const showContact = async () => {
  const token = localStorage.getItem("access_token");

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

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/students/${id}`)
      .then((response) => response.json())
      .then((data) => {
        setStudent(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <main className="p-6">Loading...</main>;
  }

  if (!student) {
    return <main className="p-6">Student not found.</main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <Link to="/students" className="text-sm text-gray-500">
        ← Back to Students
      </Link>

      <div className="mt-6 border rounded-2xl p-6 bg-white">
        <div className="flex flex-col items-center text-center">
          {student.profile_picture ? (
            <img
              src={student.profile_picture}
              alt={student.name}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-3xl font-bold">
              {student.name.charAt(0)}
            </div>
          )}

          <h1 className="text-2xl font-bold mt-4">
            {student.name}
          </h1>

          <p className="text-gray-500 mt-1">
            {student.program} · {student.university_id}
          </p>

          {student.fyp_status && (
            <span className="mt-3 border rounded-full px-3 py-1 text-sm">
              {student.fyp_status}
            </span>
          )}
        </div>

        {student.bio && (
          <section className="mt-8">
            <h2 className="font-semibold">About</h2>
            <p className="mt-2 text-gray-600">{student.bio}</p>
          </section>
        )}

        {student.skills && (
          <section className="mt-6">
            <h2 className="font-semibold">Skills</h2>
            <p className="mt-2 text-gray-600">{student.skills}</p>
          </section>
        )}

        {student.interests && (
          <section className="mt-6">
            <h2 className="font-semibold">Interests</h2>
            <p className="mt-2 text-gray-600">{student.interests}</p>
          </section>
        )}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {student.github && (
            <a
              href={student.github}
              target="_blank"
              rel="noreferrer"
              className="border rounded-xl py-3 text-center"
            >
              GitHub
            </a>
          )}

          {student.linkedin && (
            <a
              href={student.linkedin}
              target="_blank"
              rel="noreferrer"
              className="border rounded-xl py-3 text-center"
            >
              LinkedIn
            </a>
          )}
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
      </div>
    </main>
  );
}

export default StudentProfile;