import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_URL from "../api";

const PAGE_SIZE = 50;

function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("All");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchFirstPage = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/students?skip=0&limit=${PAGE_SIZE}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.detail === "string"
              ? data.detail
              : "Could not load students."
          );
        }

        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setStudents(list);
          setHasMore(list.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) {
          setStudents([]);
          setError(
            err instanceof TypeError
              ? "Could not connect to the server."
              : err.message
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchFirstPage();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const loadMoreStudents = async () => {
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/students?skip=${students.length}&limit=${PAGE_SIZE}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Could not load more students."
        );
      }

      const list = Array.isArray(data) ? data : [];
      setStudents((current) => [...current, ...list]);
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Could not connect to the server."
          : err.message
      );
    }
  };

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
    <main className="page-container">

      {/* Header */}
      <div className="mb-8">
        <p className="eyebrow">
          Directory
        </p>

        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          Find Students
        </h1>

        <p className="mt-3 text-zinc-600 max-w-2xl leading-relaxed">
          Browse students by program, skills, interests, and
          FYP status.
        </p>
      </div>

      {/* Filters */}
      <section className="card p-4 sm:p-5 mb-8">

        <div className="grid gap-4 md:grid-cols-3">

          <div className="md:col-span-1">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-zinc-700 mb-2"
            >
              Search
            </label>

            <input
              id="search"
              type="text"
              placeholder="Name, skills, interests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label
              htmlFor="program"
              className="block text-sm font-medium text-zinc-700 mb-2"
            >
              Program
            </label>

            <select
              id="program"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="input-field"
            >
              <option value="All">All Programs</option>
              <option value="BSCS">BSCS</option>
              <option value="BSAI">BSAI</option>
              <option value="BSCB">BSCB</option>
              <option value="BSSE">BSSE</option>
              <option value="BESE">BESE</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-zinc-700 mb-2"
            >
              FYP Status
            </label>

            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field"
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
      {!loading && !error && (
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-sm font-medium text-zinc-600">
            {filteredStudents.length}{" "}
            {filteredStudents.length === 1
              ? "student"
              : "students"}
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card py-12 text-center text-zinc-500">
          Loading students...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div role="alert" className="border border-red-200 bg-red-50 text-red-700 rounded-2xl p-6 text-center">
          <h2 className="font-semibold text-lg">
            Could not load students
          </h2>

          <p className="mt-2 text-sm">{error}</p>

          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="secondary-button mt-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredStudents.length === 0 && (
        <div className="border border-dashed border-zinc-300 rounded-2xl p-10 text-center">
          <h2 className="font-semibold text-lg text-zinc-900">
            No students found
          </h2>

          <p className="mt-2 text-zinc-500">
            Try changing your search or filters.
          </p>
        </div>
      )}

      {/* Students */}
      {!loading && !error && filteredStudents.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

          {filteredStudents.map((student) => (
            <article
              key={student.id}
              className="card p-5 flex flex-col transition-shadow hover:shadow-md"
            >

              <div className="flex items-start gap-4">

                {/* Avatar */}
                {student.profile_picture ? (
                  <img
                    src={student.profile_picture}
                    alt={student.name}
                    className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-zinc-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center font-semibold text-zinc-700 shrink-0 ring-1 ring-zinc-200">
                    {student.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="font-semibold text-base text-zinc-900 truncate">
                    <Link
                      to={`/students/${student.id}`}
                      className="hover:underline"
                    >
                      {student.name}
                    </Link>
                  </h2>

                  <p className="text-xs font-medium text-zinc-500 mt-0.5">
                    {student.program}
                  </p>
                </div>

              </div>

              {student.fyp_status && (
                <span className="badge self-start mt-4">
                  {student.fyp_status}
                </span>
              )}

              {student.skills && (
  <div className="mt-5">
    <p className="eyebrow">
      Skills
    </p>

    <div className="flex flex-wrap gap-1.5 mt-2">
      {student.skills
        .split(",")
        .map((skill, index) => (
          <span
            key={index}
            className="tag"
          >
            {skill.trim()}
          </span>
        ))}
    </div>
  </div>
)}

              {student.interests && (
                <div className="mt-4">
                  <p className="eyebrow">
                    Interests
                  </p>

                  <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed line-clamp-2">
                    {student.interests}
                  </p>
                </div>
              )}

              {/* View Profile */}
              <Link
                to={`/students/${student.id}`}
                className="secondary-button w-full mt-auto pt-2.5"
              >
                View Profile
              </Link>

            </article>
          ))}

        </div>
      )}

      {/* Load more */}
      {!loading && !error && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMoreStudents}
            className="secondary-button"
          >
            Load more students
          </button>
        </div>
      )}

    </main>
  );
}

export default Students;