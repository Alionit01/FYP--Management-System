import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_URL from "../api";

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

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await fetch(`${API_URL}/teams/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not load team.");
        }

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

        // GET /teams/{id} does not expose contact — fetch it separately
        // with the owner's token so editing does not wipe the saved value.
        try {
          const contactResponse = await fetch(
            `${API_URL}/teams/${id}/contact`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (contactResponse.ok) {
            const contactData = await contactResponse.json();
            setForm((current) => ({
              ...current,
              contact: contactData.contact || "",
            }));
          }
        } catch {
          // Contact simply stays empty; never fail the whole page over it.
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [id, navigate, token]);

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
        throw new Error(data.detail || "Could not update team.");
      }

      navigate(`/teams/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-container max-w-3xl">
        <div className="card py-12 text-center text-zinc-500">
          Loading team...
        </div>
      </main>
    );
  }

  return (
    <main className="page-container max-w-3xl">
      <button
        onClick={() => navigate(`/teams/${id}`)}
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
      >
        ← Back to Team
      </button>

      <div className="mb-8">
        <p className="eyebrow">
          Team
        </p>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">
          Edit Team
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card p-6 sm:p-8 space-y-6"
      >
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-700 mb-2"
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
            className="block text-sm font-medium text-zinc-700 mb-2"
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
            className="block text-sm font-medium text-zinc-700 mb-2"
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
            className="block text-sm font-medium text-zinc-700 mb-2"
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
            className="block text-sm font-medium text-zinc-700 mb-2"
          >
            Additional Spots Available
          </label>

          <input
            id="spots_available"
            type="number"
            name="spots_available"
            min="0"
            max="20"
            value={form.spots_available}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div>
          <label
            htmlFor="skills_needed"
            className="block text-sm font-medium text-zinc-700 mb-2"
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
            className="block text-sm font-medium text-zinc-700 mb-2"
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
            className="block text-sm font-medium text-zinc-700 mb-2"
          >
            Contact
          </label>

          <input
            id="contact"
            name="contact"
            value={form.contact}
            onChange={handleChange}
            placeholder="WhatsApp or other contact"
            className="input-field"
          />
        </div>

        {error && (
          <div role="alert" className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/teams/${id}`)}
            className="secondary-button"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="primary-button !px-6 !py-3"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default EditTeam;