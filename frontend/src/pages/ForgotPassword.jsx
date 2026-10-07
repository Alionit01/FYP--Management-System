import { useState } from "react";
import { Link } from "react-router-dom";
import API_URL from "../api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Could not send reset email."
        );
        return;
      }

      setMessage(
        data.message ||
          "If that email is registered, a reset link has been sent."
      );
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
          <p className="eyebrow">FYP Finder</p>

          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            Reset your password
          </h1>

          <p className="mt-3 text-zinc-600">
            Enter the email on your account and we will send you a reset
            link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 mb-2"
            >
              University Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="yourname@iqra.edu.pk"
              className="input-field"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mt-5 border border-green-200 bg-green-50 text-green-700 rounded-lg px-4 py-3 text-sm"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-button w-full mt-6 !py-3"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <p className="text-sm text-zinc-500 text-center mt-6">
            Remembered it?{" "}
            <Link
              to="/login"
              className="font-medium text-zinc-900 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default ForgotPassword;
