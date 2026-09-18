import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filteredStudents = students.filter((student) => {
    const searchText = `
      ${student.name}
      ${student.skills || ""}
      ${student.interests || ""}
      ${student.program}
    `.toLowerCase();

    const matchesSearch = searchText.includes(
      search.toLowerCase()
    );

    const matchesProgram =
      program === "All" || student.program === program;

    const matchesStatus =
      status === "All" || student.fyp_status === status;

    return matchesSearch && matchesProgram && matchesStatus;
  });

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Directory
        </p>

        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          Find Students
        </h1>

        <p className="mt-3 text-gray-600 max-w-2xl">
          Browse students by program, skills, interests, and
          FYP status.
        </p>
      </div>

      {/* Filters */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 mb-8">

        <div className="grid gap-4 md:grid-cols-3">

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-2">
              Search
            </label>

            <input
              type="text"
              placeholder="Name, skills, interests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Program
            </label>

            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-gray-900"
            >
              <option value="All">All Programs</option>
              <option value="BS(CS)">BS(CS)</option>
              <option value="BS(AI)">BS(AI)</option>
              <option value="BS(CB)">BS(CB)</option>
              <option value="BS(SE)">BS(SE)</option>
              <option value="BE(SE)">BE(SE)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              FYP Status
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-gray-900"
            >
              <option value="All">All Statuses</option>
              <option value="Looking for a team">
                Looking for a team
              </option>
              <option value="Already in a team">
                Already in a team
              </option>
            </select>
          </div>

        </div>
      </section>

      {/* Results header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filteredStudents.length}{" "}
          {filteredStudents.length === 1
            ? "student"
            : "students"}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center text-gray-500">
          Loading students...
        </div>
      )}

      {/* Empty */}
      {!loading && filteredStudents.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <h2 className="font-semibold text-lg">
            No students found
          </h2>

          <p className="mt-2 text-gray-500">
            Try changing your search or filters.
          </p>
        </div>
      )}

      {/* Students */}
      {!loading && filteredStudents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {filteredStudents.map((student) => (
            <article
              key={student.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition"
            >

              <div className="flex items-start gap-4">

                {/* Avatar */}
                {student.profile_picture ? (
                  <img
                    src={student.profile_picture}
                    alt={student.name}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-700 shrink-0">
                    {student.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="font-semibold text-lg truncate">
                    {student.name}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {student.program}
                  </p>
                </div>

              </div>

              {student.fyp_status && (
                <span className="inline-block mt-4 text-xs font-medium border border-gray-200 rounded-full px-3 py-1">
                  {student.fyp_status}
                </span>
              )}

              {student.skills && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
                    Skills
                  </p>

                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {student.skills}
                  </p>
                </div>
              )}

              {student.interests && (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide font-semibold text-gray-400">
                    Interests
                  </p>

                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {student.interests}
                  </p>
                </div>
              )}

              <Link
                to={`/students/${student.id}`}
                className="block mt-5 text-center border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
              >
                View Profile
              </Link>

            </article>
          ))}

        </div>
      )}

    </main>
  );
}

export default Students;