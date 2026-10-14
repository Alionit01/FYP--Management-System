import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Circle,
  Code2,
  Eye,
  MessageCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import API_URL from "../api";
import { extractErrorMessage } from "../api/errors";
import { useAuth } from "../context/AuthContext";
import { isProfileComplete } from "../profile";
import Alert from "../components/Alert";
import Avatar from "../components/Avatar";
import InvitationsSection from "../components/InvitationsSection";
import Tags from "../components/Tags";

/* Avatar limits. Mirrors backend/app/schemas.py: the same raster
   allow-list (no SVG — it is markup, not an image) and the same 1 MB
   cap. Enforced here for instant feedback and again on the server. */
const ACCEPTED_PICTURE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_PICTURE_BYTES = 1024 * 1024;

/* Checklist shown while a profile is still incomplete. Status is
   conveyed by icon shape + text, not colour alone. */
function SetupBanner({ profile }) {
  const items = [
    {
      label: "Skills",
      done: Boolean(profile.skills && profile.skills.trim()),
    },
    { label: "FYP status", done: Boolean(profile.fyp_status) },
  ];

  return (
    <section className="mb-6 rounded-2xl border border-sun-300/60 bg-warning-50 p-5 sm:p-6">
      <h2 className="display text-xl text-warning-700">
        Complete your profile
      </h2>

      <p className="mt-1.5 text-sm text-warning-700/90">
        Other students need these details to find and trust you. All
        items are required before you can create or join teams.
      </p>

      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item) => (
          <li
            key={item.label}
            className={`flex items-center gap-2 font-medium ${
              item.done ? "text-success-700" : "text-warning-700"
            }`}
          >
            {item.done ? (
              <CheckCircle2 size={17} aria-hidden="true" />
            ) : (
              <Circle size={17} aria-hidden="true" />
            )}
            <span>
              {item.label}
              <span className="sr-only">
                {item.done ? " added" : " still missing"}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-warning-700/80">
        Profile photo are optional but make sure to add linkdin/github links to your profile. It will help other students to find you and see the compatibility.
      </p>
    </section>
  );
}

function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const { setProfileComplete } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetch(`${API_URL}/my-profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(
              response, data, "Could not load your profile."
            )
          );
        }

        return data;
      })
      .then((data) => {
        setProfile(data);

        setForm({
          name: data.name || "",
          program: data.program || "",
          profile_picture: data.profile_picture || "",
          bio: data.bio || "",
          github: data.github || "",
          linkedin: data.linkedin || "",
          whatsapp: data.whatsapp || "",
          skills: data.skills || "",
          interests: data.interests || "",
          fyp_status: data.fyp_status || "",
        });

        // A profile still being set up starts in edit mode.
        if (!isProfileComplete(data)) setEditing(true);

        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handlePictureUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Keep these in step with the server-side rules in
    // backend/app/schemas.py (_validate_picture): the same raster
    // allow-list and the same 1 MB limit. Checking here turns a
    // server-side 422 into an immediate, readable message.
    if (!ACCEPTED_PICTURE_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, GIF or WebP image.");
      return;
    }

    if (file.size > MAX_PICTURE_BYTES) {
      setError("Image is too large. Please use a file under 1 MB.");
      return;
    }

    setError("");

    const reader = new FileReader();

    reader.onload = () => {
      setForm((current) => ({
        ...current,
        profile_picture: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    // Setup mode only: do not let an incomplete save succeed.
    if (!isProfileComplete(profile)) {
      const missing = [];
      if (!form.skills || !form.skills.trim()) missing.push("your skills");
      if (!form.fyp_status) missing.push("your FYP status");
      if (missing.length > 0) {
        setError(`Please add ${missing.join(", ")} before saving.`);
        setSaving(false);
        return;
      }
    }

    try {
      const response = await fetch(
        `${API_URL}/my-profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail) && data.detail[0]?.msg
              ? data.detail[0].msg
              : "Could not update profile."
        );
        return;
      }

      const updated = data.profile;

      setProfile(updated);

      setForm({
        name: updated.name || "",
        program: updated.program || "",
        profile_picture: updated.profile_picture || "",
        bio: updated.bio || "",
        github: updated.github || "",
        linkedin: updated.linkedin || "",
        whatsapp: updated.whatsapp || "",
        skills: updated.skills || "",
        interests: updated.interests || "",
        fyp_status: updated.fyp_status || "",
      });

      setMessage("Profile updated successfully.");
      setEditing(false);
      setProfileComplete(isProfileComplete(updated));
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-container max-w-3xl">
        <p role="status" className="sr-only">
          Loading your profile…
        </p>

        <div className="skeleton h-3 w-24" aria-hidden="true" />
        <div className="skeleton mt-4 h-9 w-56" aria-hidden="true" />

        <div className="card mt-8 p-5 sm:p-8" aria-hidden="true">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="skeleton h-20 w-20 rounded-full" />

            <div className="flex-1 space-y-3">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-4 w-32" />
            </div>
          </div>

          <div className="skeleton mt-8 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-4/5" />
        </div>
      </main>
    );
  }

  if (!profile || !form) {
    return (
      <main className="page-container max-w-3xl">
        <Alert kind="error">
          {error || "Could not load your profile."}
        </Alert>
      </main>
    );
  }

  if (!editing) {
    const skills = profile.skills
      ? profile.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : [];

    const interests = profile.interests
      ? profile.interests
          .split(",")
          .map((interest) => interest.trim())
          .filter(Boolean)
      : [];

    const links = [
      { label: "GitHub", value: profile.github, Icon: Code2 },
      { label: "LinkedIn", value: profile.linkedin, Icon: BriefcaseBusiness },
      { label: "WhatsApp", value: profile.whatsapp, Icon: MessageCircle, whatsapp: true },
    ];

    return (
      <main className="page-container max-w-3xl">
        <div className="mb-8">
          <p className="eyebrow">Account</p>

          <h1 className="display mt-3 text-4xl sm:text-5xl">
            My <em className="accent-italic">profile.</em>
          </h1>

          <p className="mt-4 text-ink-soft leading-relaxed">
            This is how other students see you.
          </p>
        </div>

        {!isProfileComplete(profile) && <SetupBanner profile={profile} />}

        {/* Pending invitations first — they're the only time-sensitive
            action on this page, and the navbar bell links here. Hidden
            when there's nothing to act on. */}
        <InvitationsSection
          className="mb-6"
          onAccepted={(invitation) => {
            setError("");
            setMessage(
              `You joined ${invitation.team_name}. Open the Teams page to view it.`
            );
          }}
        />

        <section className="card p-5 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <Avatar
              name={profile.name}
              src={profile.profile_picture}
              size="lg"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h2 className="display text-2xl sm:text-3xl text-forest-900 break-words">
                  {profile.name}
                </h2>

                {profile.fyp_status && (
                  <span
                    className={`badge w-fit ${
                      profile.fyp_status === "Looking for a team"
                        ? "badge-open"
                        : "badge-full"
                    }`}
                  >
                    {profile.fyp_status}
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm font-medium text-ink-soft">
                {profile.program}
              </p>

              <p className="mt-0.5 text-xs text-ink-muted break-all">
                {profile.university_id} · {profile.email}
              </p>
            </div>
          </div>

          {/* About */}
          <div className="mt-8 pt-6 divider">
            <p className="eyebrow">About</p>

            <p className="mt-3 text-ink-soft leading-relaxed">
              {profile.bio || "No bio added yet."}
            </p>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mt-7">
              <p className="eyebrow">Skills</p>

              <div className="mt-3">
                <Tags items={skills} size="lg" />
              </div>
            </div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow">Interests</p>

              <div className="mt-3">
                <Tags items={interests} size="lg" />
              </div>
            </div>
          )}

          {/* Links & contact */}
          <div className="mt-8 pt-6 divider">
            <p className="eyebrow">Links & Contact</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {links.map(({ label, value, Icon, whatsapp }) => (
                <div key={label} className="rounded-xl border border-forest-900/12 bg-cream-50 p-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </span>

                  {value ? (
                    whatsapp ? (
                      <span className="mt-1.5 block text-sm font-medium text-ink break-all">
                        {value}
                      </span>
                    ) : (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 block text-sm font-medium text-ink break-all underline-offset-4 hover:underline"
                      >
                        {value}
                      </a>
                    )
                  ) : (
                    <span className="mt-1.5 block text-sm text-ink-muted">
                      Not shared
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-6">
            <Alert kind="success">{message}</Alert>
          </div>
        )}

        {error && (
          <div className="mt-6">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link
            to={`/students/${profile.id}`}
            className="secondary-button"
          >
            <Eye size={16} aria-hidden="true" />
            View public profile
          </Link>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setEditing(true);
            }}
            className="primary-button !px-6 !py-3"
          >
            <Pencil size={16} aria-hidden="true" />
            Edit Profile
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container max-w-3xl">
      <div className="mb-8">
        <p className="eyebrow">Account</p>

        <h1 className="display mt-3 text-4xl sm:text-5xl">
          Edit your <em className="accent-italic">profile.</em>
        </h1>

        <p className="mt-4 text-ink-soft leading-relaxed">
          Keep your information up to date so other students can find
          you.
        </p>
      </div>

      {!isProfileComplete(profile) && <SetupBanner profile={profile} />}

      <form onSubmit={handleSubmit} className="card p-5 sm:p-8">
        {/* Basic information */}
        <section>
          <h2 className="display text-xl text-forest-900">
            Basic Information
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-ink-soft mb-2"
              >
                Name
              </label>

              <input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="university_id"
                  className="block text-sm font-medium text-ink-soft mb-2"
                >
                  University ID
                </label>

                <input
                  id="university_id"
                  type="text"
                  value={profile.university_id}
                  disabled
                  className="input-field"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-ink-soft mb-2"
                >
                  University Email
                </label>

                <input
                  id="email"
                  type="text"
                  value={profile.email}
                  disabled
                  className="input-field"
                />
              </div>
            </div>

            <p className="text-xs text-ink-muted">
              University ID and email are fixed at registration and
              cannot be changed.
            </p>

            <div>
              <label
                htmlFor="program"
                className="block text-sm font-medium text-ink-soft mb-2"
              >
                Program
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

            <div>
              <label
                htmlFor="fyp_status"
                className="block text-sm font-medium text-ink-soft mb-2"
              >
                FYP Status
              </label>

              <select
                id="fyp_status"
                name="fyp_status"
                value={form.fyp_status}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">
                  Select your current status
                </option>
                <option value="Looking for a team">
                  Looking for a team
                </option>
                <option value="Already in a team">
                  Already in a team
                </option>
              </select>
            </div>
          </div>
        </section>

        <div className="my-8 divider" />

        {/* About */}
        <section>
          <h2 className="display text-xl text-forest-900">
            About You
          </h2>

          <div className="mt-5 space-y-5">
            <Avatar
              name={form.name}
              src={form.profile_picture}
              size="lg"
            />

            <div>
              <label
                htmlFor="profile_picture_upload"
                className="block text-sm font-medium text-ink-soft mb-2"
              >
                Profile picture
              </label>

              <input
                id="profile_picture_upload"
                type="file"
                accept="image/*"
                onChange={handlePictureUpload}
                className="input-file"
              />

              <p className="text-xs text-ink-muted mt-2 inline-flex items-center gap-1.5">
                <Camera size={13} aria-hidden="true" />
                Pick an image from your device (gallery, camera, or
                downloads). It appears in your profile after saving.
              </p>
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-ink-soft mb-2"
              >
                Bio
              </label>

              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell other students a little about yourself..."
                className="input-field resize-none"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="skills"
                  className="block text-sm font-medium text-ink-soft mb-2"
                >
                  Skills
                </label>

                <input
                  id="skills"
                  type="text"
                  name="skills"
                  value={form.skills}
                  onChange={handleChange}
                  placeholder="e.g. Python, React, SQL, UI/UX"
                  className="input-field"
                />
              </div>

              <div>
                <label
                  htmlFor="interests"
                  className="block text-sm font-medium text-ink-soft mb-2"
                >
                  Interests
                </label>

                <input
                  id="interests"
                  type="text"
                  name="interests"
                  value={form.interests}
                  onChange={handleChange}
                  placeholder="e.g. AI, Web Development, Cybersecurity"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="my-8 divider" />

        {/* Links */}
        <section>
          <h2 className="display text-xl text-forest-900">
            Links & Contact
          </h2>

          <div className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="github"
                  className="block text-sm font-medium text-ink-soft mb-2"
                >
                  GitHub
                </label>

                <input
                  id="github"
                  type="url"
                  name="github"
                  value={form.github}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                  className="input-field"
                />
              </div>

              <div>
                <label
                  htmlFor="linkedin"
                  className="block text-sm font-medium text-ink-soft mb-2"
                >
                  LinkedIn
                </label>

                <input
                  id="linkedin"
                  type="url"
                  name="linkedin"
                  value={form.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="whatsapp"
                className="block text-sm font-medium text-ink-soft mb-2"
              >
                WhatsApp
              </label>

              <input
                id="whatsapp"
                type="text"
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                placeholder="Your WhatsApp number"
                className="input-field"
              />

              <p className="text-xs text-ink-muted mt-2">
                Your contact details are not shown publicly.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-7">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        {message && (
          <div className="mt-7">
            <Alert kind="success">{message}</Alert>
          </div>
        )}

        <div className="mt-8 pt-6 divider flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setForm({
                name: profile.name || "",
                program: profile.program || "",
                profile_picture: profile.profile_picture || "",
                bio: profile.bio || "",
                github: profile.github || "",
                linkedin: profile.linkedin || "",
                whatsapp: profile.whatsapp || "",
                skills: profile.skills || "",
                interests: profile.interests || "",
                fyp_status: profile.fyp_status || "",
              });
              setError("");
              setEditing(false);
            }}
            className="secondary-button"
          >
            <X size={16} aria-hidden="true" />
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="primary-button w-full sm:w-auto !px-6 !py-3"
          >
            <Save size={16} aria-hidden="true" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default MyProfile;
