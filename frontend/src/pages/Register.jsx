import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    university_id: "",
    email: "",
    password: "",
    program: "BS(CS)",
  });

  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (form.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/students",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Could not create your account.");
        return;
      }

      navigate("/login", {
        state: {
          registered: true,
        },
      });
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10 pb-24 md:pb-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            FYP Finder
          </p>

          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            Create your account
          </h1>

          <p className="mt-3 text-gray-600">
            Use your university email to join FYP Finder.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name *
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                autoComplete="name"
                placeholder="Your full name"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">
                  University ID *
                </label>

                <input
                  type="text"
                  name="university_id"
                  value={form.university_id}
                  onChange={handleChange}
                  required
                  placeholder="Your roll number"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Program *
                </label>

                <select
                  name="program"
                  value={form.program}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-gray-900"
                >
                  <option value="BS(CS)">BS(CS)</option>
                  <option value="BS(AI)">BS(AI)</option>
                  <option value="BS(CB)">BS(CB)</option>
                  <option value="BS(SE)">BS(SE)</option>
                  <option value="BE(SE)">BE(SE)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                University Email *
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="yourname@iqra.edu.pk"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />

              <p className="text-xs text-gray-400 mt-2">
                Only @iqra.edu.pk email addresses can register.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Password *
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength="6"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm Password *
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Enter your password again"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-sm text-gray-500 text-center mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-gray-900 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default Register;