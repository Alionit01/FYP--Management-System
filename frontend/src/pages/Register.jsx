import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck, UserPlus } from "lucide-react";
import API_URL from "../api";
import Alert from "../components/Alert";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    university_id: "",
    email: "",
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
      const response = await fetch(
        `${API_URL}/students`,
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
          message:
            typeof data.message === "string"
              ? data.message
              : "Account created successfully.",
        },
      });
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 pb-24 md:pb-12">
      <div className="w-full max-w-5xl grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        {/* Editorial aside */}
        <div className="hidden lg:block">
          <p className="eyebrow">Join FYP Finder</p>

          <h1 className="display mt-5 text-5xl text-forest-900">
            Your final year,{" "}
            <em className="accent-italic">better teamed.</em>
          </h1>

          <p className="mt-5 max-w-md text-ink-soft leading-relaxed">
            Create an account with your university email and you will be
            able to join teams, create your own, and be found by
            classmates.
          </p>

          <div className="mt-8 card max-w-md p-5">
            <div className="flex items-start gap-3">
              <MailCheck
                size={19}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-forest-700"
              />

              <p className="text-sm text-ink-soft leading-relaxed">
                We will email you a confirmation link. Open it, set your
                password, and your account is ready — it takes about a
                minute.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="w-full max-w-lg mx-auto lg:mx-0">
          <div className="mb-8 text-center lg:text-left">
            <p className="eyebrow justify-center lg:justify-start">
              Create account
            </p>

            <h1 className="display mt-4 text-3xl sm:text-4xl text-forest-900 lg:hidden">
              Join FYP Finder
            </h1>

            <p className="mt-3 text-ink-soft">
              Use your university email to join FYP Finder. You will set
              your password after confirming the email link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-ink-soft mb-2"
                >
                  Full Name *
                </label>

                <input
                  id="name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  className="input-field"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="university_id"
                    className="block text-sm font-medium text-ink-soft mb-2"
                  >
                    University ID *
                  </label>

                  <input
                    id="university_id"
                    type="text"
                    name="university_id"
                    value={form.university_id}
                    onChange={handleChange}
                    required
                    placeholder="Your roll number"
                    className="input-field"
                  />
                </div>

                <div>
                  <label
                    htmlFor="program"
                    className="block text-sm font-medium text-ink-soft mb-2"
                  >
                    Program *
                  </label>

                  <select
                    id="program"
                    name="program"
                    value={form.program}
                    onChange={handleChange}
                    required
                    className="input-field"
                  >
                    <option value="BSCS">BSCS</option>
                    <option value="BSAI">BSAI</option>
                    <option value="BSCB">BSCB</option>
                    <option value="BSSE">BSSE</option>
                    <option value="BESE">BESE</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-ink-soft mb-2"
                >
                  University Email *
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

                <p className="text-xs text-ink-muted mt-2">
                  Only @iqra.edu.pk email addresses can register. Your
                  University ID must match the part of your email before
                  the @.
                </p>
              </div>
            </div>

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
              <UserPlus size={16} aria-hidden="true" />
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <p className="text-sm text-ink-muted text-center mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-forest-800 underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default Register;
