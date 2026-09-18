import { useEffect, useState } from "react";

function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/my-profile", {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/my-profile",
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

      setMessage("Profile updated successfully.");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <p className="text-gray-500">Loading your profile...</p>
      </main>
    );
  }

  if (!profile || !form) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <div className="border border-red-200 bg-red-50 rounded-xl p-6">
          <p className="text-red-700">
            {error || "Could not load your profile."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
      <div className="mb-8">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Account
        </p>

        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          My Profile
        </h1>

        <p className="mt-3 text-gray-600">
          Keep your information up to date so other students can
          find you.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8"
      >
        {/* Basic information */}
        <section>
          <h2 className="text-xl font-semibold">
            Basic Information
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">
                  University ID
                </label>

                <input
                  type="text"
                  value={profile.university_id}
                  disabled
                  className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  University Email
                </label>

                <input
                  type="text"
                  value={profile.email}
                  disabled
                  className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-4 py-3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Program
              </label>

              <select
                name="program"
                value={form.program}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-gray-900"
              >
                <option value="BS(CS)">BS(CS)</option>
                <option value="BS(AI)">BS(AI)</option>
                <option value="BS(CB)">BS(CB)</option>
                <option value="BS(SE)">BS(SE)</option>
                <option value="BE(SE)">BE(SE)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                FYP Status
              </label>

              <select
                name="fyp_status"
                value={form.fyp_status}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-gray-900"
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

        <div className="my-8 border-t border-gray-200" />

        {/* About */}
        <section>
          <h2 className="text-xl font-semibold">
            About You
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Profile Picture URL
              </label>

              <input
                type="url"
                name="profile_picture"
                value={form.profile_picture}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Bio
              </label>

              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell other students a little about yourself..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Skills
              </label>

              <input
                type="text"
                name="skills"
                value={form.skills}
                onChange={handleChange}
                placeholder="e.g. Python, React, SQL, UI/UX"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Interests
              </label>

              <input
                type="text"
                name="interests"
                value={form.interests}
                onChange={handleChange}
                placeholder="e.g. AI, Web Development, Cybersecurity"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>
          </div>
        </section>

        <div className="my-8 border-t border-gray-200" />

        {/* Links */}
        <section>
          <h2 className="text-xl font-semibold">
            Links & Contact
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                GitHub
              </label>

              <input
                type="url"
                name="github"
                value={form.github}
                onChange={handleChange}
                placeholder="https://github.com/username"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                LinkedIn
              </label>

              <input
                type="url"
                name="linkedin"
                value={form.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                WhatsApp
              </label>

              <input
                type="text"
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                placeholder="Your WhatsApp number"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-gray-900"
              />

              <p className="text-xs text-gray-400 mt-2">
                Your contact details are not shown publicly.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-7 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-7 border border-gray-200 bg-gray-50 text-gray-700 rounded-lg px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default MyProfile;