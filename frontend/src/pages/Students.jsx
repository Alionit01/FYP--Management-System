import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RotateCw, Search, SlidersHorizontal, UserSearch } from "lucide-react";
import API_URL from "../api";
import Alert from "../components/Alert";
import Avatar from "../components/Avatar";
import Tags from "../components/Tags";

const PAGE_SIZE = 50;

function Students() {
  const [students, setStudents] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(
    () => searchParams.get("search") || ""
  );
  const [program, setProgram] = useState(
    () => searchParams.get("program") || "All"
  );
  const [status, setStatus] = useState(
    () => searchParams.get("status") || "All"
  );
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

  // Persist filters in the URL so results are shareable and Back works.
  useEffect(() => {
    const params = {};
    if (search !== "") params.search = search;
    if (program !== "All") params.program = program;
    if (status !== "All") params.status = status;
    setSearchParams(params, { replace: true });
  }, [search, program, status, setSearchParams]);

  const filtersActive =
    search !== "" || program !== "All" || status !== "All";

  const clearFilters = () => {
    setSearch("");
    setProgram("All");
    setStatus("All");
  };

  return (
    <main className="page-container">
      {/* Header */}
      <div className="mb-8 max-w-2xl">
        <p className="eyebrow">Directory</p>

        <h1 className="display mt-3 text-4xl sm:text-5xl">
          Find <em className="accent-italic">students.</em>
        </h1>

        <p className="mt-4 text-ink-soft leading-relaxed">
          Browse students by program, skills, interests, and FYP
          status.
        </p>
      </div>

      {/* Filters */}
      <section
        aria-label="Filter students"
        className="card p-5 sm:p-6 mb-8"
      >
        <div className="mb-4 flex items-center gap-2 text-forest-800">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            Filters
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-ink-soft mb-2"
            >
              Search
            </label>

            <div className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />

              <input
                id="search"
                type="text"
                placeholder="Name, skills, interests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !pl-10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="program"
              className="block text-sm font-medium text-ink-soft mb-2"
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
              className="block text-sm font-medium text-ink-soft mb-2"
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

        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="link-quiet mt-4"
          >
            Clear filters
          </button>
        )}
      </section>

      {/* Results header */}
      {!loading && !error && (
        <div className="flex items-baseline justify-between mb-5">
          <p className="text-sm font-medium text-ink-soft">
            {filteredStudents.length}{" "}
            {filteredStudents.length === 1
              ? "student"
              : "students"}
            {filtersActive && " match your filters"}
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <>
          <p role="status" className="sr-only">
            Loading students…
          </p>

          <div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            aria-hidden="true"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="skeleton h-12 w-12 rounded-full" />

                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>

                <div className="skeleton mt-5 h-6 w-2/5" />
                <div className="skeleton mt-5 h-4 w-full" />
                <div className="skeleton mt-2 h-4 w-4/5" />
                <div className="skeleton mt-6 h-9 w-full rounded-full" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="card p-8 text-center">
          <h2 className="display text-2xl text-forest-900">
            Could not load students
          </h2>

          <div className="mt-4 flex justify-center">
            <Alert kind="error">{error}</Alert>
          </div>

          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="secondary-button mt-5"
          >
            <RotateCw size={16} aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredStudents.length === 0 && (
        <div className="empty-state">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-800">
            <UserSearch size={22} aria-hidden="true" />
          </div>

          <h2 className="display mt-4 text-2xl text-forest-900">
            No students found
          </h2>

          <p className="mt-2 text-ink-soft">
            {filtersActive
              ? "Try changing your search or filters."
              : "No students have joined yet."}
          </p>

          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="secondary-button mt-5"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Students */}
      {!loading && !error && filteredStudents.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
            <article
              key={student.id}
              className="card card-hover p-5 sm:p-6 flex flex-col h-full"
            >
              <div className="flex items-start gap-4">
                <Avatar
                  name={student.name}
                  src={student.profile_picture}
                />

                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-base text-forest-900 break-words">
                    <Link
                      to={`/students/${student.id}`}
                      className="transition-colors hover:text-forest-600"
                    >
                      {student.name}
                    </Link>
                  </h2>

                  <p className="text-xs font-medium text-ink-muted mt-0.5">
                    {student.program}
                  </p>
                </div>
              </div>

              {student.fyp_status && (
                <span
                  className={`badge mt-4 self-start ${
                    student.fyp_status === "Looking for a team"
                      ? "badge-open"
                      : "badge-full"
                  }`}
                >
                  {student.fyp_status}
                </span>
              )}

              {student.skills && (
                <div className="mt-5">
                  <p className="eyebrow">Skills</p>

                  <div className="mt-2.5">
                    <Tags items={student.skills} />
                  </div>
                </div>
              )}

              {student.interests && (
                <div className="mt-4">
                  <p className="eyebrow">Interests</p>

                  <p className="mt-2 text-sm text-ink-soft leading-relaxed line-clamp-2">
                    {student.interests}
                  </p>
                </div>
              )}

              {/* View Profile */}
              <Link
                to={`/students/${student.id}`}
                className="secondary-button w-full mt-auto pt-2.5"
              >
                View profile
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
