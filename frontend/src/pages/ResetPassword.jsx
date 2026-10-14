import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import API_URL from "../api";
import Alert from "../components/Alert";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";

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
    <AuthShell
      eyebrow="Set a new password"
      title="Choose a new password"
      subtitle="Pick something memorable — at least 6 characters."
    >
      {done ? (
        <>
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={20}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-forest-700"
            />

            <Alert kind="success">
              Password updated. You can now sign in.
            </Alert>
          </div>

          <Link to="/login" className="primary-button w-full mt-6 !py-3">
            <ShieldCheck size={16} aria-hidden="true" />
            Sign in
          </Link>
        </>
      ) : token ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-ink-soft mb-2"
            >
              New password
            </label>

            <PasswordInput
              id="password"
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
              className="block text-sm font-medium text-ink-soft mb-2"
            >
              Confirm new password
            </label>

            <PasswordInput
              id="confirm-password"
              required
              minLength="6"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
            />
          </div>

          {error && <Alert kind="error">{error}</Alert>}

          <button
            type="submit"
            disabled={saving}
            className="primary-button w-full !py-3"
          >
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-ink-soft leading-relaxed">
          Reset link is missing a token. Please open the link in your
          email, or{" "}
          <Link
            to="/forgot-password"
            className="font-semibold text-forest-800 underline-offset-4 hover:underline"
          >
            request a new one
          </Link>
          .
        </p>
      )}
    </AuthShell>
  );
}

export default ResetPassword;
