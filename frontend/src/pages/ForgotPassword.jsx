import { useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import API_URL from "../api";
import Alert from "../components/Alert";
import AuthShell from "../components/AuthShell";

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
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter the email on your account and we will send you a reset link."
    >
      <form onSubmit={handleSubmit}>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="yourname@iqra.edu.pk"
            className="input-field"
          />
        </div>

        {error && (
          <div className="mt-5">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        {message && (
          <div className="mt-5">
            <Alert kind="success">{message}</Alert>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="primary-button w-full mt-6 !py-3"
        >
          <Send size={16} aria-hidden="true" />
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <p className="text-sm text-ink-muted text-center mt-6">
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-semibold text-forest-800 underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default ForgotPassword;
