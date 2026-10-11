import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import API_URL from "../api";
import Alert from "../components/Alert";
import AuthShell from "../components/AuthShell";

function VerifyEmail() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token"));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Keep the token out of subsequent navigation URLs and browser history.
    window.history.replaceState(window.history.state, "", "/verify-email");
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
      const response = await fetch(`${API_URL}/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        setError("This link is invalid or expired, or the identity is already registered. Please register again.");
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setVerified(true);
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Verify your email"
      title="Activate your account"
      subtitle="Confirm your email address and set a password to get started."
    >
      {verified ? (
        <>
          <div className="flex items-start gap-3">
            <BadgeCheck
              size={20}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-forest-700"
            />

            <Alert kind="success">
              Your email is verified. You can now sign in.
            </Alert>
          </div>

          <Link to="/login" className="primary-button w-full mt-6 !py-3">
            <ShieldCheck size={16} aria-hidden="true" />
            Sign in
          </Link>
        </>
      ) : token ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-sm text-ink-soft">
            Set your password to activate your account.
          </p>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-ink-soft mb-2"
            >
              Password
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
              className="block text-sm font-medium text-ink-soft mb-2"
            >
              Confirm password
            </label>

            <input
              id="confirm-password"
              className="input-field"
              type="password"
              required
              minLength="6"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {error && <Alert kind="error">{error}</Alert>}

          <button
            type="submit"
            disabled={saving}
            className="primary-button w-full !py-3"
          >
            {saving ? "Activating..." : "Activate account"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-ink-soft leading-relaxed">
          Verification link is missing a token. Please open the link in
          your email.
        </p>
      )}
    </AuthShell>
  );
}

export default VerifyEmail;
