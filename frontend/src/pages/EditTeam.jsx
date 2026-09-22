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
          contact: data.contact || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [id, navigate]);

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
      <main className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-gray-500">Loading team...</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24 md:pb-10">
      <button
        onClick={() => navigate(`/teams/${id}`)}
        className="text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        ← Back to Team
      </button>

      <div className="mb-8">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Team
        </p>

        <h1 className="text-3xl font-bold mt-2">
          Edit Team
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div>
          <label className="block text-sm font-medium mb-2">
            Team Name
          </label>

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Project Title
          </label>

          <input
            name="project_title"
            value={form.project_title}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            About Project
          </label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Department Preference
          </label>

          <select
            name="department_preference"
            value={form.department_preference}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
          >
            {programs.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Additional Spots Available
          </label>

          <input
            type="number"
            name="spots_available"
            min="0"
            max="20"
            value={form.spots_available}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Skills Needed
          </label>

          <input
            name="skills_needed"
            value={form.skills_needed}
            onChange={handleChange}
            placeholder="React, Python, UI/UX..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Roles Needed
          </label>

          <input
            name="roles_needed"
            value={form.roles_needed}
            onChange={handleChange}
            placeholder="Frontend, Backend, ML..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Contact
          </label>

          <input
            name="contact"
            value={form.contact}
            onChange={handleChange}
            placeholder="WhatsApp or other contact"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
          />
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </main>
  );
}

export default EditTeam;