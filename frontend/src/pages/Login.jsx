import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/";

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
      const response = await fetch(
        "http://127.0.0.1:8000/login",
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
        setError(data.detail || "Invalid email or password.");
        return;
      }

      login(data.access_token, data.student_id);
      navigate(from, { replace: true });
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10 pb-24 md:pb-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            FYP Finder
          </p>

          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            Welcome back
          </h1>

          <p className="mt-3 text-gray-600">
            Sign in to manage your profile and team.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                University Email
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Password
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
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
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-sm text-gray-500 text-center mt-6">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-gray-900 hover:underline"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default Login;