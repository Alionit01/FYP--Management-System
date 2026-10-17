import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { RotateCw, Search, SlidersHorizontal, UserSearch } from "lucide-react";
import API_URL from "../api";
import {
  extractErrorMessage,
  reportUnauthorized,
} from "../api/errors";
import {
  appendUniqueRows,
  directoryCountLabel,
  directoryQuery,
  filterAgreement,
} from "../lib/directory";
import useDebouncedValue from "../lib/useDebouncedValue";
import Alert from "../components/Alert";
import Avatar from "../components/Avatar";
import Tags from "../components/Tags";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

function Students() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
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
  // `loading` means nothing has been fetched successfully yet, so only
  // it earns the full-page skeleton. A filter change refetches with
  // `refreshing` instead: the old results stay on screen rather than
  // collapsing into a flash of placeholders.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const hasLoadedRef = useRef(false);

  // Search happens on the server now (the browser used to filter
  // whichever single page it had, and called "not found" for everyone
  // else), so typing has to be debounced before it reaches the API.
  const settledSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    let cancelled = false;

    const fetchFirstPage = async () => {
      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      setLoadMoreError("");

      if (!token) {
        navigate("/login", {
          state: {
            from: { pathname: "/students" },
            message: "Sign in to view the student directory.",
          },
        });
        return;
      }

      try {
        const query = directoryQuery({
          search: settledSearch,
          program,
          status,
          skip: 0,
          limit: PAGE_SIZE,
        });

        const response = await fetch(`${API_URL}/students?${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        // Dispatches the session-expired event on a 401 so the app
        // explains the sign-out instead of offering a Retry that can
        // never succeed.
        reportUnauthorized(response);

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(response, data, "Could not load students.")
          );
        }

        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          hasLoadedRef.current = true;
          setStudents(list);
          setHasMore(list.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) {
          // A failed *refresh* must not throw away results already on
          // screen — only a first load has nothing worth keeping.
          if (!hasLoadedRef.current) setStudents([]);
          setError(
            err instanceof TypeError
              ? "Could not connect to the server."
              : err.message
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchFirstPage();

    return () => {
      cancelled = true;
    };
  }, [retryCount, settledSearch, program, status, token, navigate]);

  const loadMoreStudents = async () => {
    // Guarded: a double tap on mobile used to fire the same page twice
    // and render duplicate cards.
    if (loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const query = directoryQuery({
        search: settledSearch,
        program,
        status,
        skip: students.length,
        limit: PAGE_SIZE,
      });

      const response = await fetch(`${API_URL}/students?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      reportUnauthorized(response);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(response, data, "Could not load more students.")
        );
      }

      const list = Array.isArray(data) ? data : [];
      setStudents((current) => appendUniqueRows(current, list));
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      // Kept apart from `error` on purpose: a page that fails to
      // append must not swap the whole directory for an error card and
      // reset the scroll back to page one.
      setLoadMoreError(
        err instanceof TypeError
          ? "Could not connect to the server."
          : err.message
      );
    } finally {
      setLoadingMore(false);
    }
  };

  // Persist filters in the URL so results are shareable and Back works.
  useEffect(() => {
    // Signed-out visitors are being sent to /login below; rewriting the
    // query string here would replace that navigation and strand them on
    // this page with the loading skeleton.
    if (!token) return;

    const params = {};
    if (search !== "") params.search = search;
    if (program !== "All") params.program = program;
    if (status !== "All") params.status = status;
    setSearchParams(params, { replace: true });
  }, [token, search, program, status, setSearchParams]);

  const filtersActive =
    search !== "" || program !== "All" || status !== "All";

  const clearFilters = () => {
    setSearch("");
    setProgram("All");
    setStatus("All");
  };

  // A first load that failed has nothing to show but the apology. A
  // *refresh* that failed leaves the previous results standing, with a
  // notice above them, because wiping a working page over a blip is
  // worse than leaving stale rows with an explanation.
  const showLoadError = !loading && error !== "" && students.length === 0;
  const showRefreshError = !loading && error !== "" && students.length > 0;
  // While a filter change re-runs, the rows already on screen stand in
  // for a progress indicator. The exception is a query with nothing to
  // show yet (an emptied result set, or a first visit to a filtered
  // URL), where there is nothing to hold the space — use the skeleton
  // rather than leaving a blank gap.
  const showSkeleton = loading || (refreshing && students.length === 0);

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

      {/* Refresh failed but earlier results are still valid: say so
          above them rather than replacing a working page. */}
      {showRefreshError && (
        <div className="mb-5">
          <Alert kind="error">
            {error}
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="mt-2 block font-semibold underline underline-offset-4"
            >
              Try again
            </button>
          </Alert>
        </div>
      )}

      {/* Results header */}
      {!showLoadError && students.length > 0 && (
        <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
          <p className="text-sm font-medium text-ink-soft">
            {directoryCountLabel(
              students.length,
              hasMore,
              "student",
              "students"
            )}
            {filtersActive && ` ${filterAgreement(students.length, hasMore)}`}
          </p>

          {refreshing && (
            <p role="status" className="text-sm text-ink-muted">
              Updating results…
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {showSkeleton && (
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

      {/* Error (nothing loaded yet) */}
      {showLoadError && (
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
      {!showSkeleton && !error && students.length === 0 && (
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
      {students.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
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

      {/* Load more — a failure here keeps every card already on screen
          and offers to retry just this page. */}
      {students.length > 0 && (hasMore || loadMoreError) && (
        <div className="mt-8 flex flex-col items-center gap-4">
          {loadMoreError && (
            <div className="w-full max-w-md">
              <Alert kind="error">
                {loadMoreError}
                <button
                  type="button"
                  onClick={loadMoreStudents}
                  className="mt-2 block font-semibold underline underline-offset-4"
                >
                  Try again
                </button>
              </Alert>
            </div>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={loadMoreStudents}
              disabled={loadingMore}
              className="secondary-button"
            >
              {loadingMore ? "Loading…" : "Load more students"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

export default Students;
