import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RotateCw, Save, X } from "lucide-react";
import API_URL from "../api";
import {
  extractErrorMessage,
  MAX_AVAILABLE_SPOTS,
  MAX_TEAM_MEMBERS,
} from "../api/errors";
import Alert from "../components/Alert";

const programs = [
  "BSCS",
  "BSAI",
  "BSCB",
  "BSSE",
  "BESE",
  "Any",
];

function EditTeam() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    project_title: "",
    description: "",
    department_preference: "Any",
    spots_available: 0,
    skills_needed: "",
    roles_needed: "",
    contact: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  /* True when the team itself could not be read. The form must not be
     rendered in that case: it would appear with empty fields, look
     like editable state, and a save would send those empties to the
     server — wiping the team the student came here to edit. */
  const [loadFailed, setLoadFailed] = useState(false);
  const [contactWarning, setContactWarning] = useState("");

  const token = localStorage.getItem("access_token");

  /* GET /teams/{id} does not expose contact, so it arrives on a second
     request with the owner's token. It is allowed to fail without
     taking the page down — but the student is told, because saving
     with an empty contact box erases the saved value. */
  const loadContact = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/teams/${id}/contact`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("contact unavailable");

      const contactData = await response.json();
      setForm((current) => ({
        ...current,
        contact: contactData.contact || "",
      }));
      setContactWarning("");
    } catch {
      setContactWarning(
        "We could not load this team's contact details, so the box below is empty. Saving now would clear the saved value — load them again first."
      );
    }
  }, [id, token]);

  /* Reading the team is allowed to run from an effect, so nothing may
     be reset before the first await: React asks that effects not
     synchronously set state (it re-renders the page twice before the
     request is even out). The page starts in its loading state anyway;
     a *retry* clears the old failure in its own click handler. */
  const loadTeam = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/teams/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(response, data, "Could not load team.")
        );
      }

      // Reached only once a team was actually read, so a previous
      // failure can never outlive the request that repaired it.
      setError("");
      setLoadFailed(false);

      if (
        String(data.created_by) !==
        String(localStorage.getItem("student_id"))
      ) {
        navigate(`/teams/${id}`, { replace: true });
        return;
      }

      setForm({
        name: data.name || "",
        project_title: data.project_title || "",
        description: data.description || "",
        department_preference:
          data.department_preference || "Any",
        spots_available: data.spots_available ?? 0,
        skills_needed: data.skills_needed || "",
        roles_needed: data.roles_needed || "",
        contact: "",
      });

      await loadContact();
    } catch (err) {
      setError(err.message);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, token, loadContact]);

  useEffect(() => {
    // Every setState in loadTeam happens after an await (the reset is
    // in the retry button's click handler instead), so this cannot
    // cause the cascading renders the rule guards against — it just
    // cannot see that through the useCallback wrapper. Same call as in
    // MyTeam's initial load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTeam();
  }, [loadTeam]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "spots_available"
          ? Number(e.target.value)
          : e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/teams/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(response, data, "Could not update team.")
        );
      }

      // Confirmation travels with the navigation rather than being
      // shouted from this page's own state: the team page is where the
      // student lands, and it says what happened.
      navigate(`/teams/${id}`, {
        state: { flash: data.message || "Team updated." },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-container max-w-3xl">
        <p role="status" className="sr-only">
          Loading team…
        </p>

        <div className="skeleton h-5 w-32" aria-hidden="true" />

        <div className="card mt-6 p-5 sm:p-8" aria-hidden="true">
          <div className="skeleton h-9 w-56" />
          <div className="space-y-5 mt-8">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </main>
    );
  }

  // Nothing was read, so nothing may be edited: offer a retry instead
  // of a form full of empty fields waiting to be saved.
  if (loadFailed) {
    return (
      <main className="page-container max-w-3xl">
        <button
          type="button"
          onClick={() => navigate(`/teams/${id}`)}
          className="link-quiet inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Team</span>
        </button>

        <div className="mb-8 mt-6 max-w-2xl">
          <p className="eyebrow">Team</p>

          <h1 className="display mt-3 text-4xl sm:text-5xl">
            Edit <em className="accent-italic">team.</em>
          </h1>
        </div>

        <div className="card p-8 text-center">
          <h2 className="display text-2xl text-forest-900">
            Could not load this team
          </h2>

          <div className="mt-4 flex justify-center">
            <Alert kind="error">{error}</Alert>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                // Event handlers may reset state outright; loadTeam
                // itself cannot, because the effect also calls it.
                setLoading(true);
                setLoadFailed(false);
                setError("");
                loadTeam();
              }}
              className="primary-button !px-6 !py-3"
            >
              <RotateCw size={16} aria-hidden="true" />
              Try again
            </button>

            <button
              type="button"
              onClick={() => navigate(`/teams/${id}`)}
              className="secondary-button"
            >
              Back to Team
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container max-w-3xl">
      <button
        type="button"
        onClick={() => navigate(`/teams/${id}`)}
        className="link-quiet inline-flex items-center gap-2"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to Team</span>
      </button>

      <div className="mb-8 mt-6 max-w-2xl">
        <p className="eyebrow">Team</p>

        <h1 className="display mt-3 text-4xl sm:text-5xl">
          Edit <em className="accent-italic">team.</em>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 sm:p-8 space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-ink-soft mb-2"
          >
            Team Name
          </label>

          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. Team Alpha"
            className="input-field"
          />
        </div>

        <div>
          <label
            htmlFor="project_title"
            className="block text-sm font-medium text-ink-soft mb-2"
          >
            Project Title
          </label>

          <input
            id="project_title"
            name="project_title"
            value={form.project_title}
            onChange={handleChange}
            placeholder="Leave empty if not decided yet"
            className="input-field"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-ink-soft mb-2"
          >
            About Project
          </label>

          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            placeholder="Briefly describe your project or idea..."
            className="input-field resize-none"
          />
        </div>

        <div>
          <label
            htmlFor="department_preference"
            className="block text-sm font-medium text-ink-soft mb-2"
          >
            Department Preference
          </label>

          <select
            id="department_preference"
            name="department_preference"
            value={form.department_preference}
            onChange={handleChange}
            className="input-field"
          >
            {programs.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="spots_available"
            className="block text-sm font-medium text-ink-soft mb-2"
          >
            Additional Spots Available
          </label>

          <input
            id="spots_available"
            type="number"
            name="spots_available"
            min="0"
            max={MAX_AVAILABLE_SPOTS}
            value={form.spots_available}
            onChange={handleChange}
            className="input-field"
          />

          <p className="text-xs text-ink-muted mt-2">
            0–{MAX_AVAILABLE_SPOTS}. A team can never exceed{" "}
            {MAX_TEAM_MEMBERS} members in total.
          </p>
        </div>

        <div>
          <label
            htmlFor="skills_needed"
            className="block text-sm font-medium text-ink-soft mb-2"
          >
            Skills Needed
          </label>

          <input
            id="skills_needed"
            name="skills_needed"
            value={form.skills_needed}
            onChange={handleChange}
            placeholder="React, Python, UI/UX..."
            className="input-field"
          />
        </div>

        <div>
          <label
            htmlFor="roles_needed"
            className="block text-sm font-medium text-ink-soft mb-2"
          >
            Roles Needed
          </label>

          <input
            id="roles_needed"
            name="roles_needed"
            value={form.roles_needed}
            onChange={handleChange}
            placeholder="Frontend, Backend, ML..."
            className="input-field"
          />
        </div>

        <div>
          <label
            htmlFor="contact"
            className="block text-sm font-medium text-ink-soft mb-2"
          >
            Contact
          </label>

          {/* Sits with the field it is about: the box below is empty
              because the read failed, not because the team has no
              contact saved. */}
          {contactWarning && (
            <div className="mb-3">
              <Alert kind="warning">
                {contactWarning}
                <button
                  type="button"
                  onClick={loadContact}
                  className="mt-2 block font-semibold underline underline-offset-4"
                >
                  Load contact details again
                </button>
              </Alert>
            </div>
          )}

          <input
            id="contact"
            name="contact"
            value={form.contact}
            onChange={handleChange}
            placeholder="WhatsApp or other contact"
            className="input-field"
          />
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/teams/${id}`)}
            className="secondary-button"
          >
            <X size={16} aria-hidden="true" />
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="primary-button !px-6 !py-3"
          >
            <Save size={16} aria-hidden="true" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default EditTeam;
