import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    university_id: "",
    email: "",
    password: "",
    program: "BSCS",
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

    try {
      const response = await fetch("http://127.0.0.1:8000/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      navigate("/login");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 pb-24">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold">Create Account</h1>

        <p className="mt-2 text-gray-600">
          Register using your university email.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            name="university_id"
            placeholder="University / Roll number"
            value={form.university_id}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            name="email"
            type="email"
            placeholder="University email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full border rounded-xl px-4 py-3"
          />

          <select
            name="program"
            value={form.program}
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-3 bg-white"
          >
            <option value="BSCS">BSCS</option>
            <option value="BSSE">BSSE</option>
            <option value="BSCY">BSCY</option>
            <option value="BSAI">BSAI</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-xl py-3 font-medium"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-black font-medium"
          >
            Login
          </button>
        </p>
      </div>
    </main>
  );
}

export default Register;