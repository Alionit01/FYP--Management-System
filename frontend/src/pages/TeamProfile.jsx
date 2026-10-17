import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Users } from "lucide-react";
import { useEffect, useState } from "react";
import API_URL from "../api";
import { classifyFailure } from "../api/errors";
import Alert from "../components/Alert";
import Avatar from "../components/Avatar";
import Tags from "../components/Tags";

function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [team, setTeam] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  /* Why the load failed. Team details require an account, so a
     signed-out visitor is the common case — and telling them "team not
     found" when the team exists is simply wrong (audit FE-04). */
  const [failure, setFailure] = useState(null);

  /* A confirmation handed over by the edit form (see EditTeam.jsx).
     It is copied into local state and then dropped from the history
     entry, so pressing Back does not replay a notice already read.
     The set is batched with the navigate() right below it, so it
     costs no extra render pass — which is what the rule is guarding
     against, and why it cannot see this through the router call. */
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

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    fetch(`${API_URL}/teams/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        if (!response.ok) {
          setFailure(classifyFailure(response.status));
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (data) {
          setTeam(data);
          setFailure(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setFailure("server");
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    fetch(`${API_URL}/teams/${id}/contact`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load contact");
        }

        return response.json();
      })
      .then((data) => {
        setContact(data.contact);
      })
      .catch(() => {
        setContact(null);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="page-container max-w-4xl">
        <p role="status" className="sr-only">
          Loading team…
        </p>

        <div className="skeleton h-5 w-32" aria-hidden="true" />

        <div className="card mt-6 p-5 sm:p-7" aria-hidden="true">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton mt-3 h-8 w-64" />
          <div className="skeleton mt-3 h-4 w-40" />
          <div className="skeleton mt-8 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-5/6" />
          <div className="skeleton mt-8 h-16 w-full" />
        </div>
      </main>
    );
  }

  if (!team) {
    /* The backend keeps team details behind authentication; the public
       /teams list is what a signed-out visitor can browse. Offer the
       sign-in path rather than a dead end, and keep the cases apart so
       a real missing team still says so. */
    if (failure === "unauthorized") {
      return (
        <main className="page-container max-w-4xl">
          <div className="empty-state">
            <h1 className="display text-2xl text-forest-900">
              Sign in to view this team
            </h1>

            <p className="mt-2 text-ink-soft">
              Team details are only visible to signed-in students. This
              team does exist — sign in to see its project, members and
              contact details.
            </p>

            <Link
              to="/login"
              state={{ from: location }}
              className="primary-button mt-5"
            >
              Sign in
            </Link>

            <Link to="/teams" className="secondary-button mt-3 ml-3">
              Back to Teams
            </Link>
          </div>
        </main>
      );
    }

    if (failure === "server") {
      return (
        <main className="page-container max-w-4xl">
          <div className="empty-state">
            <h1 className="display text-2xl text-forest-900">
              Could not load this team
            </h1>

            <p className="mt-2 text-ink-soft">
              Something went wrong on our side. Please try again.
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="primary-button mt-5"
            >
              Try again
            </button>

            <Link to="/teams" className="secondary-button mt-3 ml-3">
              Back to Teams
            </Link>
          </div>
        </main>
      );
    }

    return (
      <main className="page-container max-w-4xl">
        <div className="empty-state">
          <h1 className="display text-2xl text-forest-900">
            Team not found
          </h1>

          <p className="mt-2 text-ink-soft">
            This team may have been deleted, or the link is wrong.
          </p>

          <Link to="/teams" className="primary-button mt-5">
            Back to Teams
          </Link>
        </div>
      </main>
    );
  }

  const skills = team.skills_needed
    ? team.skills_needed
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];

  const roles = team.roles_needed
    ? team.roles_needed
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean)
    : [];

  const isOwner =
    String(team.created_by) === String(localStorage.getItem("student_id"));

  return (
    <main className="page-container max-w-4xl">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/teams")}
        className="link-quiet inline-flex items-center gap-2"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to Teams</span>
      </button>

      {/* "Team updated." travels here in navigation state from the edit
          form, and is dropped from the history entry immediately so
          pressing Back does not replay it over a page already read. */}
      {flash && (
        <div className="mt-5">
          <Alert kind="success">{flash}</Alert>
        </div>
      )}

      {/* Team Header */}
      <section className="card mt-6 p-5 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Team</p>

            <h1 className="display mt-2 text-3xl sm:text-4xl text-forest-900 break-words">
              {team.name}
            </h1>

            <p className="mt-3 text-sm font-medium text-ink-soft">
              {team.department_preference === "Any"
                ? "Open to all departments"
                : team.department_preference}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start shrink-0">
            <span
              className={`badge ${
                team.spots_available > 0 ? "badge-open" : "badge-full"
              }`}
            >
              {team.spots_available > 0
                ? `${team.spots_available} spot${
                    team.spots_available === 1 ? "" : "s"
                  } available`
                : "Full"}
            </span>

            {isOwner && (
              <button
                type="button"
                onClick={() => navigate(`/teams/${team.id}/edit`)}
                className="primary-button"
              >
                <Pencil size={15} aria-hidden="true" />
                Edit Team
              </button>
            )}
          </div>
        </div>

        {/* Project */}
        {team.project_title && (
          <div className="mt-8 pt-6 divider">
            <p className="eyebrow">Project</p>

            <h2 className="display mt-2 text-xl text-forest-900 leading-snug">
              {team.project_title}
            </h2>
          </div>
        )}

        {/* Description */}
        {team.description && (
          <div className={team.project_title ? "mt-6" : "mt-8 pt-6 divider"}>
            <p className="eyebrow">Description</p>

            <p className="mt-3 text-ink-soft leading-relaxed whitespace-pre-line">
              {team.description}
            </p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow">Skills Needed</p>

            <div className="mt-3">
              <Tags items={skills} size="lg" />
            </div>
          </div>
        )}

        {/* Roles */}
        {roles.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow">Roles Needed</p>

            <div className="mt-3">
              <Tags items={roles} size="lg" />
            </div>
          </div>
        )}

        {/* Contact */}
        {contact && (
          <div className="mt-8 pt-6 divider">
            <p className="eyebrow">Team Contact</p>

            <p className="mt-2 text-sm font-medium text-ink break-all">
              {contact}
            </p>
          </div>
        )}
      </section>

      {/* Members */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Users size={18} aria-hidden="true" className="text-forest-700" />

          <h2 className="display text-xl text-forest-900">Members</h2>

          <span className="ml-auto text-sm font-medium text-ink-soft">
            {team.members?.length || 0}{" "}
            {team.members?.length === 1 ? "member" : "members"}
          </span>
        </div>

        {team.members?.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {team.members.map((member) => (
              <Link
                key={member.id}
                to={`/students/${member.id}`}
                className="card card-hover flex items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={member.name} size="sm" />

                  <div className="min-w-0">
                    <p className="font-medium text-forest-900 truncate">
                      {member.name}
                    </p>

                    <p className="text-xs font-medium text-ink-muted">
                      {member.program}
                    </p>

                    {String(member.id) === String(team.created_by) && (
                      <span className="badge badge-open mt-1.5">
                        Team Owner
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-sm font-medium text-ink-muted shrink-0">
                  View
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state !p-8">
            <p className="text-sm text-ink-soft">
              No members found.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

export default TeamProfile;
