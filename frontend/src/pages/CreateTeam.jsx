import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      const response = await fetch("http://127.0.0.1:8000/teams", {
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
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
      <div className="mb-8">
        <button
          onClick={() => navigate("/teams")}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Teams
        </button>

        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-7">
          Team Setup
        </p>

        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          Create a Team
        </h1>

        <p className="mt-3 text-gray-600">
          Create your FYP team and let other students know what
          you're looking for.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Team Name *
            </label>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Team Alpha"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Project Title
            </label>

            <input
              type="text"
              name="project_title"
              value={form.project_title}
              onChange={handleChange}
              placeholder="Leave empty if not decided yet"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              About the Project
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              placeholder="Briefly describe your project or idea..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900 resize-none"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Department Preference *
              </label>

              <select
                name="department_preference"
                value={form.department_preference}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-gray-900"
              >
                <option value="Any">Any Department</option>
                <option value="BS(CS)">BS(CS)</option>
                <option value="BS(AI)">BS(AI)</option>
                <option value="BS(CB)">BS(CB)</option>
                <option value="BS(SE)">BS(SE)</option>
                <option value="BE(SE)">BE(SE)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Available Spots *
              </label>

              <input
                type="number"
                name="spots_available"
                value={form.spots_available}
                onChange={handleChange}
                min="0"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />

              <p className="text-xs text-gray-400 mt-2">
                Number of additional members you need.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Skills Needed
            </label>

            <input
              type="text"
              name="skills_needed"
              value={form.skills_needed}
              onChange={handleChange}
              placeholder="e.g. React, Python, UI/UX, Machine Learning"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Roles Needed
            </label>

            <input
              type="text"
              name="roles_needed"
              value={form.roles_needed}
              onChange={handleChange}
              placeholder="e.g. Frontend Developer, ML Developer"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Contact
            </label>

            <input
              type="text"
              name="contact"
              value={form.contact}
              onChange={handleChange}
              placeholder="WhatsApp number or other contact"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
            />

            <p className="text-xs text-gray-400 mt-2">
              This will only be shown to logged-in students.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/teams")}
            className="px-5 py-3 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? "Creating..." : "Create Team"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default CreateTeam;