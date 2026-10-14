import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isProfileComplete } from "../profile";
import API_URL from "../api";
import { extractErrorMessage } from "../api/errors";
import Alert from "../components/Alert";
import PasswordInput from "../components/PasswordInput";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setProfileComplete } = useAuth();

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
        `${API_URL}/login`,
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
        // Normalised: detail may be a string, a Pydantic error array,
        // or absent (e.g. the 429 from the login rate limiter).
        setError(
          extractErrorMessage(response, data, "Invalid email or password.")
        );
        return;
      }

      login(data.access_token, data.student_id);

      try {
        const profileRes = await fetch(`${API_URL}/my-profile`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const complete = isProfileComplete(profileData);
          setProfileComplete(complete);

          if (!complete) {
            navigate("/my-profile", { replace: true });
            return;
          }
        }
      } catch {
        // Network hiccup: fall through to the normal redirect.
      }

      navigate(from, { replace: true });
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 pb-24 md:pb-12">
      <div className="w-full max-w-5xl grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Editorial aside */}
        <div className="hidden lg:block">
          <p className="eyebrow">Welcome back</p>

          <h1 className="display mt-5 text-5xl text-forest-900">
            Sign in to <em className="accent-italic">FYP Finder.</em>
          </h1>

          <p className="mt-5 max-w-md text-ink-soft leading-relaxed">
            Manage your profile, keep your skills up to date, and stay
            on top of your team.
          </p>

          <ul className="mt-8 space-y-3 max-w-md">
            {[
              "Show your skills to teams looking for you",
              "Create or edit your team and its openings",
              "Contact classmates directly",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-ink-soft"
              >
                <CheckCircle2
                  size={18}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-forest-600"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="mb-8 text-center lg:text-left">
            <p className="eyebrow justify-center lg:justify-start">
              Sign in
            </p>

            <h1 className="display mt-4 text-3xl sm:text-4xl text-forest-900 lg:hidden">
              Welcome back
            </h1>

            <p className="mt-3 text-ink-soft">
              Sign in to manage your profile and team.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-ink-soft mb-2"
                >
                  University Email
                </label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="yourname@iqra.edu.pk"
                  className="input-field"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-ink-soft"
                  >
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-forest-700 underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <PasswordInput
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {location.state?.message && !error && (
              <div className="mt-5">
                <Alert kind="success">{location.state.message}</Alert>
              </div>
            )}

            {error && (
              <div className="mt-5">
                <Alert kind="error">{error}</Alert>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="primary-button w-full mt-6 !py-3"
            >
              <KeyRound size={16} aria-hidden="true" />
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="text-sm text-ink-muted text-center mt-6">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-forest-800 underline-offset-4 hover:underline"
              >
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default Login;
