import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_URL from "../api";
import { useAuth } from "../context/AuthContext";
import { isProfileComplete } from "../profile";

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
            data.detail || "Could not load your profile."
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

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 1024 * 1024) {
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
        <div className="card py-12 text-center text-zinc-500">
          Loading your profile...
        </div>
      </main>
    );
  }

  if (!profile || !form) {
    return (
      <main className="page-container max-w-3xl">
        <div role="alert" className="border border-red-200 bg-red-50 rounded-2xl p-6">
          <p className="text-red-700">
            {error || "Could not load your profile."}
          </p>
        </div>
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
      { label: "GitHub", value: profile.github },
      { label: "LinkedIn", value: profile.linkedin },
      { label: "WhatsApp", value: profile.whatsapp, whatsapp: true },
    ];

    return (
      <main className="page-container max-w-3xl">
        <div className="mb-8">
          <p className="eyebrow">
            Account
          </p>

          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            My Profile
          </h1>

          <p className="mt-3 text-zinc-600 leading-relaxed">
            This is how other students see you.
          </p>
        </div>

        {!isProfileComplete(profile) && (
          <section className="mb-6 border border-amber-200 bg-amber-50 rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-amber-900">
              Complete your profile
            </h2>

            <p className="mt-1 text-sm text-amber-800">
              Other students need these details to find and trust you.
              All items are required before you can create or join teams.
            </p>

            <ul className="mt-3 space-y-1.5 text-sm">
              {[
                {
                  label: "Skills",
                  done: Boolean(profile.skills && profile.skills.trim()),
                },
                { label: "FYP status", done: Boolean(profile.fyp_status) },
              ].map((item) => (
                <li
                  key={item.label}
                  className={
                    item.done ? "text-green-700" : "text-amber-900 font-medium"
                  }
                >
                  {item.done ? "✓" : "○"} {item.label}
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs text-amber-700">
              A profile photo, bio and interests are optional.
            </p>
          </section>
        )}

        <section className="card p-5 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {profile.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt={profile.name}
                className="w-20 h-20 rounded-full object-cover shrink-0 ring-2 ring-zinc-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-2xl font-semibold text-zinc-700 shrink-0 ring-2 ring-zinc-100">
                {profile.name
                  ? profile.name.trim().charAt(0).toUpperCase()
                  : "?"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 break-words">
                  {profile.name}
                </h2>

                {profile.fyp_status && (
                  <span className="badge w-fit">
                    {profile.fyp_status}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm font-medium text-zinc-700">
                {profile.program}
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                {profile.university_id} · {profile.email}
              </p>
            </div>
          </div>

          {/* About */}
          <div className="mt-7 pt-6 border-t border-zinc-100">
            <p className="eyebrow">About</p>

            <p className="mt-2 text-zinc-600 leading-relaxed">
              {profile.bio || "No bio added yet."}
            </p>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow">Skills</p>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {skills.map((skill, index) => (
                  <span key={index} className="tag !text-sm !px-3 !py-1.5">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow">Interests</p>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {interests.map((interest, index) => (
                  <span key={index} className="tag !text-sm !px-3 !py-1.5">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links & contact */}
          <div className="mt-7 pt-6 border-t border-zinc-100">
            <p className="eyebrow">Links & Contact</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {links.map(({ label, value, whatsapp }) => (
                <div
                  key={label}
                  className="border border-zinc-200 rounded-xl p-3.5"
                >
                  <span className="text-xs font-medium text-zinc-500 block">
                    {label}
                  </span>

                  {value ? (
                    whatsapp ? (
                      <span className="mt-1 block text-sm font-medium text-zinc-900 break-all">
                        {value}
                      </span>
                    ) : (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-sm font-medium text-zinc-900 break-all hover:underline"
                      >
                        {value}
                      </a>
                    )
                  ) : (
                    <span className="mt-1 block text-sm text-zinc-400">
                      Not shared
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {message && (
          <div
            role="status"
            className="mt-6 border border-green-200 bg-green-50 text-green-700 rounded-lg px-4 py-3 text-sm"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link
            to={`/students/${profile.id}`}
            className="secondary-button"
          >
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
            Edit Profile
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container max-w-3xl">
      <div className="mb-8">
        <p className="eyebrow">
          Account
        </p>

        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          My Profile
        </h1>

        <p className="mt-3 text-zinc-600 leading-relaxed">
          Keep your information up to date so other students can
          find you.
        </p>
      </div>

      {!isProfileComplete(profile) && (
        <section className="mb-6 border border-amber-200 bg-amber-50 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-amber-900">
            Complete your profile
          </h2>

          <p className="mt-1 text-sm text-amber-800">
            Other students need these details to find and trust you.
            All items are required before you can create or join teams.
          </p>

          <ul className="mt-3 space-y-1.5 text-sm">
            {[
              {
                label: "Skills",
                done: Boolean(profile.skills && profile.skills.trim()),
              },
              { label: "FYP status", done: Boolean(profile.fyp_status) },
            ].map((item) => (
              <li
                key={item.label}
                className={
                  item.done ? "text-green-700" : "text-amber-900 font-medium"
                }
              >
                {item.done ? "✓" : "○"} {item.label}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-amber-700">
            A profile photo, bio and interests are optional.
          </p>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="card p-5 sm:p-8"
      >
        {/* Basic information */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            Basic Information
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 mb-2"
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
                  className="block text-sm font-medium text-zinc-700 mb-2"
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
                  className="block text-sm font-medium text-zinc-700 mb-2"
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

            <p className="text-xs text-zinc-500 mt-2">
              University ID and email are fixed at registration and cannot be
              changed.
            </p>

            <div>
              <label
                htmlFor="program"
                className="block text-sm font-medium text-zinc-700 mb-2"
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
                className="block text-sm font-medium text-zinc-700 mb-2"
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

        <div className="my-8 border-t border-zinc-100" />

        {/* About */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            About You
          </h2>

          <div className="mt-5 space-y-5">
            {form.profile_picture ? (
              <img
                src={form.profile_picture}
                alt="Current profile"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-zinc-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-2xl font-semibold text-zinc-700 ring-2 ring-zinc-100">
                {form.name ? form.name.trim().charAt(0).toUpperCase() : "?"}
              </div>
            )}

            <div>
              <label
                htmlFor="profile_picture_upload"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                Profile picture
              </label>

              <input
                id="profile_picture_upload"
                type="file"
                accept="image/*"
                onChange={handlePictureUpload}
                className="w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-50"
              />

              <p className="text-xs text-zinc-500 mt-2">
                Pick an image from your device (gallery, camera, or
                downloads). It appears in your profile after saving.
              </p>
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-zinc-700 mb-2"
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
                className="block text-sm font-medium text-zinc-700 mb-2"
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
                className="block text-sm font-medium text-zinc-700 mb-2"
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

        <div className="my-8 border-t border-zinc-100" />

        {/* Links */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            Links & Contact
          </h2>

          <div className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="github"
                className="block text-sm font-medium text-zinc-700 mb-2"
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
                className="block text-sm font-medium text-zinc-700 mb-2"
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
                className="block text-sm font-medium text-zinc-700 mb-2"
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

              <p className="text-xs text-zinc-500 mt-2">
                Your contact details are not shown publicly.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div role="alert" className="mt-7 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-7 border border-green-200 bg-green-50 text-green-700 rounded-lg px-4 py-3 text-sm"
          >
            {message}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
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
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="primary-button w-full sm:w-auto !px-6 !py-3"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default MyProfile;