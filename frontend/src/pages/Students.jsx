import { useEffect, useState } from "react";

function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("All");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/students")
      .then((response) => response.json())
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  const filteredStudents = students.filter((student) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      student.name.toLowerCase().includes(searchText) ||
      (student.skills || "").toLowerCase().includes(searchText) ||
      (student.interests || "").toLowerCase().includes(searchText);

    const matchesProgram =
      program === "All" || student.program === program;

    const matchesStatus =
      status === "All" || student.fyp_status === status;

    return matchesSearch && matchesProgram && matchesStatus;
  });

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <p className="text-gray-500">Loading students...</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Find Students</h1>

        <p className="mt-2 text-gray-600">
          Discover students by skills, interests, and program.
        </p>
      </div>

      {/* Search */}
      <div className="mt-6">
        <input
          type="text"
          placeholder="Search name, skill, or interest..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2"
        />
      </div>

      {/* Filters */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className="border rounded-xl px-4 py-3 bg-white"
        >
          <option value="All">All Programs</option>
          <option value="BSCS">BSCS</option>
          <option value="BSSE">BSSE</option>
          <option value="BSCY">BSCY</option>
          <option value="BSAI">BSAI</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-xl px-4 py-3 bg-white"
        >
          <option value="All">All FYP Status</option>
          <option value="Looking for a team">
            Looking for a team
          </option>
          <option value="Already in a team">
            Already in a team
          </option>
        </select>
      </div>

      {/* Results */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            className="border rounded-2xl p-5 bg-white"
          >
            <div className="flex items-start gap-4">
              {student.profile_picture ? (
                <img
                  src={student.profile_picture}
                  alt={student.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center font-semibold">
                  {student.name.charAt(0)}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="font-semibold text-lg">
                  {student.name}
                </h2>

                <p className="text-sm text-gray-500">
                  {student.program} · {student.university_id}
                </p>
              </div>
            </div>

            {student.skills && (
              <p className="mt-4 text-sm text-gray-700">
                <span className="font-medium">Skills:</span>{" "}
                {student.skills}
              </p>
            )}

            {student.interests && (
              <p className="mt-2 text-sm text-gray-700">
                <span className="font-medium">Interests:</span>{" "}
                {student.interests}
              </p>
            )}

            {student.fyp_status && (
              <div className="mt-4">
                <span className="text-xs border rounded-full px-3 py-1">
                  {student.fyp_status}
                </span>
              </div>
            )}

            <button
              className="mt-5 w-full border rounded-xl py-2.5 font-medium"
              onClick={() =>
                (window.location.href = `/students/${student.id}`)
              }
            >
              View Profile
            </button>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <p className="text-center text-gray-500 mt-12">
          No students found.
        </p>
      )}
    </main>
  );
}

export default Students;