import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isProfileComplete } from "../profile";
import API_URL from "../api";
import Alert from "../components/Alert";
import PasswordInput from "../components/PasswordInput";

function Register() {
  const navigate = useNavigate();
  const { login, setProfileComplete } = useAuth();

  const [form, setForm] = useState({
    name: "",
    university_id: "",
    email: "",
    program: "BSCS",
    password: "",
  });
  // null = checking pilot status, true/false once known
  const [pilot, setPilot] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/pilot-status`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) {
          setPilot(Boolean(data?.pilot_onboarding));
        }
      })
      .catch(() => {
        if (!cancelled) setPilot(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      // The password is only sent during the supervised pilot,
      // where accounts are created without email delivery.
      const body = pilot
        ? {
            name: form.name,
            university_id: form.university_id,
            email: form.email,
            program: form.program,
            password: form.password,
          }
        : {
            name: form.name,
            university_id: form.university_id,
            email: form.email,
            program: form.program,
          };

      const response = await fetch(
        `${API_URL}/students`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail) && data.detail[0]?.msg
              ? data.detail[0].msg
              : "Could not create your account."
        );
        return;
      }

      if (pilot && data.access_token) {
        // Pilot accounts are signed in immediately.
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

        navigate("/", { replace: true });
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

          {pilot ? (
            <div className="mt-8 card max-w-md p-5">
              <div className="flex items-start gap-3">
                <UserPlus
                  size={19}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-forest-700"
                />

                <p className="text-sm text-ink-soft leading-relaxed">
                  Supervised pilot: email verification is temporarily
                  unavailable. Your account is created unverified and you
                  can sign in right away with the password you choose.
                </p>
              </div>
            </div>
          ) : (
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
          )}
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
              {pilot
                ? "Use your university email to join FYP Finder. Email verification is temporarily unavailable during the supervised pilot, so create a password to sign in now."
                : "Use your university email to join FYP Finder. You will set your password after confirming the email link."}
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

              {pilot && (
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-ink-soft mb-2"
                  >
                    Password *
                  </label>

                  <PasswordInput
                    id="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    maxLength={72}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                  />

                  <p className="text-xs text-ink-muted mt-2">
                    Your account is created unverified for the pilot. You
                    can sign in with this password immediately.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-5">
                <Alert kind="error">{error}</Alert>
              </div>
            )}

            {/* Consent gate. Native `required` on the checkbox blocks
                submission until it is ticked, so this needs no extra
                React state and no handler. The link opens in a new tab
                so a student never loses a half-filled form. */}
            <label
              htmlFor="privacy-consent"
              className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-forest-900/15 bg-cream-100 p-4 text-sm text-ink-soft leading-relaxed transition-colors hover:border-forest-900/30"
            >
              <input
                id="privacy-consent"
                type="checkbox"
                name="privacy_consent"
                required
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-forest-700"
              />

              <span>
                I have read and agree to the{" "}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-forest-800 underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

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
