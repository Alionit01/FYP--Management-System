import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Compass, Plus, RotateCw, Search, SlidersHorizontal, Users } from "lucide-react";
import API_URL from "../api";
import { extractErrorMessage } from "../api/errors";
import { useAuth } from "../context/AuthContext";
import {
  appendUniqueRows,
  directoryCountLabel,
  directoryQuery,
  filterAgreement,
} from "../lib/directory";
import useDebouncedValue from "../lib/useDebouncedValue";
import Alert from "../components/Alert";
import Tags from "../components/Tags";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

function Teams() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [teams, setTeams] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(
    () => searchParams.get("search") || ""
  );
  const [program, setProgram] = useState(
    () => searchParams.get("program") || "All"
  );
  // `loading` is only for the first successful fetch; a filter change
  // refetches in the background with `refreshing` so the directory
  // does not collapse to placeholders under the student's cursor.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const hasLoadedRef = useRef(false);

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

      try {
        const query = directoryQuery({
          search: settledSearch,
          program,
          skip: 0,
          limit: PAGE_SIZE,
        });

        const response = await fetch(`${API_URL}/teams?${query}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(response, data, "Could not load teams.")
          );
        }

        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          hasLoadedRef.current = true;
          setTeams(list);
          setHasMore(list.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) {
          // Keep what is already on screen: a blip while changing a
          // filter must not empty a directory that was working.
          if (!hasLoadedRef.current) setTeams([]);
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
  }, [retryCount, settledSearch, program]);

  const loadMoreTeams = async () => {
    // A double tap used to fetch the same page twice and append
    // duplicate cards with duplicate React keys.
    if (loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const query = directoryQuery({
        search: settledSearch,
        program,
        skip: teams.length,
        limit: PAGE_SIZE,
      });

      const response = await fetch(`${API_URL}/teams?${query}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(response, data, "Could not load more teams.")
        );
      }

      const list = Array.isArray(data) ? data : [];
      setTeams((current) => appendUniqueRows(current, list));
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      // Separate from `error` so one failed page keeps the results the
      // student already has instead of resetting them to page one.
      setLoadMoreError(
        err instanceof TypeError
          ? "Could not connect to the server."
          : err.message
      );
    } finally {
      setLoadingMore(false);
    }
  };

  /* A confirmation sent by another page (leaving a team from My Team)
     is copied into local state and then dropped from the history entry,
     so pressing Back does not replay it. The set is batched with the
     navigate() right below, so it costs no extra render pass — which
     is what the rule guards against, and why it cannot see this
     through the router call. */
  const [flash, setFlash] = useState(location.state?.flash || "");
  useEffect(() => {
    const incoming = location.state?.flash;
    if (!incoming || incoming === flash) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlash(incoming);
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
    });
  }, [location.state, location.pathname, location.search, navigate, flash]);

  // Persist filters in the URL so results are shareable and Back works.
  useEffect(() => {
    const params = {};
    if (search !== "") params.search = search;
    if (program !== "All") params.program = program;
    setSearchParams(params, { replace: true });
  }, [search, program, setSearchParams]);

  const filtersActive = search !== "" || program !== "All";

  const clearFilters = () => {
    setSearch("");
    setProgram("All");
  };

  const showLoadError = !loading && error !== "" && teams.length === 0;
  const showRefreshError = !loading && error !== "" && teams.length > 0;
  const showSkeleton = loading || (refreshing && teams.length === 0);

  return (
    <main className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Directory</p>

          <h1 className="display mt-3 text-4xl sm:text-5xl">
            Find a <em className="accent-italic">team.</em>
          </h1>

          <p className="mt-4 text-ink-soft leading-relaxed">
            Explore FYP teams, see what they are building, and find
            out which skills and roles they need.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:shrink-0">
          <Link
            to={isLoggedIn ? "/my-team" : "/login"}
            state={
              isLoggedIn
                ? undefined
                : {
                    from: { pathname: "/my-team" },
                    message: "Sign in to view your team.",
                  }
            }
            className="secondary-button"
          >
            <Users size={17} aria-hidden="true" />
            My Team
          </Link>

          <Link
            to={isLoggedIn ? "/teams/create" : "/login"}
            state={
              isLoggedIn
                ? undefined
                : {
                    from: { pathname: "/teams/create" },
                    message: "Sign in to create a team.",
                  }
            }
            className="primary-button"
          >
            <Plus size={17} aria-hidden="true" />
            Create Team
          </Link>
        </div>
      </div>

      {/* A confirmation carried over from another page — e.g. "You
          left the team" — is shown where the student lands, not lost
          in the navigation. */}
      {flash && (
        <div className="mb-6">
          <Alert kind="success">{flash}</Alert>
        </div>
      )}

      {/* Filters */}
      <section aria-label="Filter teams" className="card p-5 sm:p-6 mb-8">
        <div className="mb-4 flex items-center gap-2 text-forest-800">
          <SlidersHorizontal size={16} aria-hidden="true" />

          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            Filters
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
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
                placeholder="Team name, project, skills, roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !pl-10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="department"
              className="block text-sm font-medium text-ink-soft mb-2"
            >
              Department
            </label>

            <select
              id="department"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="input-field"
            >
              <option value="All">All Departments</option>
              <option value="BSCS">BSCS</option>
              <option value="BSAI">BSAI</option>
              <option value="BSCB">BSCB</option>
              <option value="BSSE">BSSE</option>
              <option value="BESE">BESE</option>
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

      {/* A refresh that failed leaves the results it was replacing in
          place, with a notice instead of an apology-and-blank-page. */}
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

      {/* Result count */}
      {!showLoadError && teams.length > 0 && (
        <div className="mb-5 flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-sm font-medium text-ink-soft">
            {directoryCountLabel(teams.length, hasMore, "team", "teams")}
            {filtersActive && ` ${filterAgreement(teams.length, hasMore)}`}
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
            Loading teams…
          </p>

          <div
            className="grid gap-5 md:grid-cols-2"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-20" />
                    <div className="skeleton h-5 w-1/2" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>

                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>

                <div className="skeleton mt-6 h-4 w-3/4" />
                <div className="skeleton mt-4 h-4 w-full" />
                <div className="skeleton mt-2 h-4 w-5/6" />
                <div className="skeleton mt-6 h-6 w-2/3" />
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
            Could not load teams
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
      {!showSkeleton && !error && teams.length === 0 && (
        <div className="empty-state">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-100 text-sun-700">
            <Compass size={22} aria-hidden="true" />
          </div>

          <h2 className="display mt-4 text-2xl text-forest-900">
            No teams found
          </h2>

          <p className="mt-2 text-ink-soft">
            {filtersActive
              ? "Try changing your search or department filter."
              : "Be the first — create a team and invite your teammates."}
          </p>

          <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="secondary-button"
              >
                Clear filters
              </button>
            )}

            <Link
              to={isLoggedIn ? "/teams/create" : "/login"}
              state={
                isLoggedIn
                  ? undefined
                  : {
                      from: { pathname: "/teams/create" },
                      message: "Sign in to create a team.",
                    }
              }
              className="primary-button"
            >
              <Plus size={17} aria-hidden="true" />
              Create a team
            </Link>
          </div>
        </div>
      )}

      {/* Teams */}
      {teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {teams.map((team) => (
            <article
              key={team.id}
              className="card card-hover p-5 sm:p-6 flex flex-col h-full"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">Team</p>

                  <h2 className="display mt-1.5 text-xl text-forest-900 break-words">
                    <Link
                      to={`/teams/${team.id}`}
                      className="transition-colors hover:text-forest-600"
                    >
                      {team.name}
                    </Link>
                  </h2>

                  <p className="text-xs font-medium text-ink-muted mt-1.5">
                    {team.department_preference === "Any"
                      ? "Open to all departments"
                      : team.department_preference}
                  </p>
                </div>

                <span
                  className={`badge shrink-0 ${
                    team.spots_available > 0
                      ? "badge-open"
                      : "badge-full"
                  }`}
                >
                  {team.spots_available > 0
                    ? `${team.spots_available} spot${
                        team.spots_available === 1 ? "" : "s"
                      }`
                    : "Full"}
                </span>
              </div>

              {team.project_title && (
                <h3 className="mt-5 text-base font-semibold text-ink leading-snug">
                  {team.project_title}
                </h3>
              )}

              {team.description && (
                <p className="mt-2 text-sm text-ink-soft leading-relaxed line-clamp-3">
                  {team.description}
                </p>
              )}

              {team.skills_needed && (
                <div className="mt-5">
                  <p className="eyebrow">Skills needed</p>

                  <div className="mt-2.5">
                    <Tags items={team.skills_needed} />
                  </div>
                </div>
              )}

              {team.roles_needed && (
                <div className="mt-4">
                  <p className="eyebrow">Roles needed</p>

                  <div className="mt-2.5">
                    <Tags items={team.roles_needed} />
                  </div>
                </div>
              )}

              {/* View Team */}
              <Link
                to={`/teams/${team.id}`}
                className="secondary-button w-full mt-auto pt-2.5"
              >
                View team
              </Link>
            </article>
          ))}
        </div>
      )}

      {/* Load more — a failed page keeps everything already shown. */}
      {teams.length > 0 && (hasMore || loadMoreError) && (
        <div className="mt-8 flex flex-col items-center gap-4">
          {loadMoreError && (
            <div className="w-full max-w-md">
              <Alert kind="error">
                {loadMoreError}
                <button
                  type="button"
                  onClick={loadMoreTeams}
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
              onClick={loadMoreTeams}
              disabled={loadingMore}
              className="secondary-button"
            >
              {loadingMore ? "Loading…" : "Load more teams"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

export default Teams;
