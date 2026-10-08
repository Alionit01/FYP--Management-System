import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_URL from "../api";

function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
        setError(data.detail || "Could not update profile.");
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

        <Link
          to={`/students/${profile.id}`}
          className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-900 underline-offset-4 hover:underline"
        >
          View how others see your profile →
        </Link>
      </div>

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
                htmlFor="profile_picture"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                Profile Picture URL
              </label>

              <input
                id="profile_picture"
                type="url"
                name="profile_picture"
                value={form.profile_picture.startsWith("data:") ? "" : form.profile_picture}
                onChange={handleChange}
                placeholder="https://..."
                className="input-field"
              />

              {form.profile_picture.startsWith("data:") && (
                <p className="text-xs text-zinc-500 mt-2">
                  A picture was loaded from your device. Saving will keep it.
                  Type a URL above to replace it.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile_picture_upload"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                Or upload a picture
              </label>

              <input
                id="profile_picture_upload"
                type="file"
                accept="image/*"
                onChange={handlePictureUpload}
                className="w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-50"
              />

              <p className="text-xs text-zinc-500 mt-2">
                An uploaded image replaces the URL until you save the profile.
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

        <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end">
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