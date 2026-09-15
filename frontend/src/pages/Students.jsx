import { useEffect, useState } from "react";

function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/students")
      .then((response) => response.json())
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching students:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <p className="text-gray-500">Loading students...</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <h1 className="text-3xl font-bold">Students</h1>

      <p className="mt-2 text-gray-600">
        Find students based on their skills and interests.
      </p>

      <div className="mt-6 space-y-4">
        {students.map((student) => (
          <div
            key={student.id}
            className="border rounded-xl p-5 bg-white"
          >
            <h2 className="text-xl font-semibold">
              {student.name}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {student.program} · {student.university_id}
            </p>

            {student.bio && (
              <p className="mt-3 text-gray-600">
                {student.bio}
              </p>
            )}

            {student.skills && (
              <p className="mt-3 text-sm">
                <span className="font-medium">Skills:</span>{" "}
                {student.skills}
              </p>
            )}

            {student.fyp_status && (
              <p className="mt-2 text-sm">
                <span className="font-medium">FYP:</span>{" "}
                {student.fyp_status}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

export default Students;