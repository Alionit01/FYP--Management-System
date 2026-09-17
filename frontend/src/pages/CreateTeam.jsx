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

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/teams",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...form,
            spots_available: Number(form.spots_available),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create team");
      }

      navigate(`/teams/${data.team_id}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div>
        <h1 className="text-3xl font-bold">
          Create a Team
        </h1>

        <p className="mt-2 text-gray-600">
          Create your FYP team and let other students find you.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 border rounded-2xl p-5 sm:p-6 space-y-5 bg-white"
      >
        <div>
          <label className="block text-sm font-medium mb-2">
            Team Name
          </label>

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Code Warriors"
            required
            className="w-full border rounded-xl px-4 py-3"
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
            placeholder="Leave blank if not decided yet"
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Project Description
          </label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Briefly describe your project idea..."
            rows="4"
            className="w-full border rounded-xl px-4 py-3"
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
            className="w-full border rounded-xl px-4 py-3 bg-white"
          >
            <option value="Any">Any</option>
            <option value="BSCS">BSCS</option>
            <option value="BSSE">BSSE</option>
            <option value="BSCY">BSCY</option>
            <option value="BSAI">BSAI</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Available Spots
          </label>

          <input
            type="number"
            name="spots_available"
            min="1"
            value={form.spots_available}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3"
          />

          <p className="text-xs text-gray-500 mt-2">
            This is how many additional members your team needs.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Skills Needed
          </label>

          <input
            name="skills_needed"
            value={form.skills_needed}
            onChange={handleChange}
            placeholder="e.g. React, Python, AI, UI/UX"
            className="w-full border rounded-xl px-4 py-3"
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
            placeholder="e.g. Frontend Developer, ML Developer"
            className="w-full border rounded-xl px-4 py-3"
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
            placeholder="Email or WhatsApp"
            className="w-full border rounded-xl px-4 py-3"
          />

          <p className="text-xs text-gray-500 mt-2">
            We'll improve contact privacy before deployment.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50"
        >
          {loading ? "Creating Team..." : "Create Team"}
        </button>
      </form>
    </main>
  );
}

export default CreateTeam;