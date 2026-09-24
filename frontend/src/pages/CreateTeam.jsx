import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../api";

function CreateTeam() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    project_title: "",
    description: "",
    department_preference: "Any",
    spots_available: 1,
    skills_needed: "",
    roles_needed: "",
    contact: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch("${API_URL}/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          spots_available: Number(form.spots_available),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Could not create team.");
        return;
      }

      navigate(`/teams/${data.id}`);
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container max-w-3xl">
      <div className="mb-8">
        <button
          onClick={() => navigate("/teams")}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          ← Back to Teams
        </button>

        <p className="eyebrow mt-7">
          Team Setup
        </p>

        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          Create a Team
        </h1>

        <p className="mt-3 text-zinc-600 leading-relaxed">
          Create your FYP team and let other students know what
          you're looking for.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card p-5 sm:p-8"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Team Name *
            </label>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Team Alpha"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Project Title
            </label>

            <input
              type="text"
              name="project_title"
              value={form.project_title}
              onChange={handleChange}
              placeholder="Leave empty if not decided yet"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              About the Project
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              placeholder="Briefly describe your project or idea..."
              className="input-field resize-none"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Department Preference *
              </label>

              <select
                name="department_preference"
                value={form.department_preference}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="Any">Any Department</option>
                <option value="BSCS">BSCS</option>
                <option value="BSAI">BSAI</option>
                <option value="BSCB">BSCB</option>
                <option value="BSSE">BSSE</option>
                <option value="BESE">BESE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Available Spots *
              </label>

              <input
                type="number"
                name="spots_available"
                value={form.spots_available}
                onChange={handleChange}
                min="0"
                required
                className="input-field"
              />

              <p className="text-xs text-zinc-400 mt-2">
                Number of additional members you need.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Skills Needed
            </label>

            <input
              type="text"
              name="skills_needed"
              value={form.skills_needed}
              onChange={handleChange}
              placeholder="e.g. React, Python, UI/UX, Machine Learning"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Roles Needed
            </label>

            <input
              type="text"
              name="roles_needed"
              value={form.roles_needed}
              onChange={handleChange}
              placeholder="e.g. Frontend Developer, ML Developer"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Contact
            </label>

            <input
              type="text"
              name="contact"
              value={form.contact}
              onChange={handleChange}
              placeholder="WhatsApp number or other contact"
              className="input-field"
            />

            <p className="text-xs text-zinc-400 mt-2">
              This will only be shown to logged-in students.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/teams")}
            className="secondary-button"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
          >
            {loading ? "Creating..." : "Create Team"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default CreateTeam;