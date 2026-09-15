import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

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
        </div>
      </div>
    </main>
  );
}

export default StudentProfile;