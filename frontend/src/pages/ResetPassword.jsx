import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_URL from "../api";

function ResetPassword() {
  const [token] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token")
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Keep the token out of subsequent navigation URLs and browser history.
  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      "/reset-password"
    );
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "This reset link is invalid or expired."
        );
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10 pb-24 md:pb-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="eyebrow">FYP Finder</p>

          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            Set a new password
          </h1>

          <p className="mt-3 text-zinc-600">
            Choose a password with at least 6 characters.
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          {done ? (
            <>
              <div
                role="status"
                className="border border-green-200 bg-green-50 text-green-700 rounded-lg px-4 py-3 text-sm"
              >
                Password updated. You can now sign in.
              </div>

              <Link
                to="/login"
                className="primary-button w-full mt-6 !py-3"
              >
                Sign in
              </Link>
            </>
          ) : token ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-700 mb-2"
                >
                  New password
                </label>

                <input
                  id="password"
                  className="input-field"
                  type="password"
                  required
                  minLength="6"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-zinc-700 mb-2"
                >
                  Confirm new password
                </label>

                <input
                  id="confirm-password"
                  className="input-field"
                  type="password"
                  required
                  minLength="6"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="primary-button w-full !py-3"
              >
                {saving ? "Updating..." : "Update password"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-zinc-600">
              Reset link is missing a token. Please open the link in your
              email, or{" "}
              <Link
                to="/forgot-password"
                className="font-medium text-zinc-900 hover:underline"
              >
                request a new one
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default ResetPassword;
