import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "../api";

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
    <main className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10 pb-24 md:pb-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <p className="eyebrow">
            FYP Finder
          </p>

          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            Create your account
          </h1>

          <p className="mt-3 text-zinc-600">
            Use your university email to join FYP Finder. You will set your password after confirming the email link.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card p-6 sm:p-8"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 mb-2"
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
                  className="block text-sm font-medium text-zinc-700 mb-2"
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
                  className="block text-sm font-medium text-zinc-700 mb-2"
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
                className="block text-sm font-medium text-zinc-700 mb-2"
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

              <p className="text-xs text-zinc-500 mt-2">
                Only @iqra.edu.pk email addresses can register. Your
                University ID must match the part of your email before
                the @.
              </p>
            </div>

          </div>

          {error && (
            <div role="alert" className="mt-5 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-button w-full mt-6 !py-3"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-sm text-zinc-500 text-center mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-zinc-900 hover:underline"
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