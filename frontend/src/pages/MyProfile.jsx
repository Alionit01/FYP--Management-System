import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function MyProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://127.0.0.1:8000/my-profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Failed to load profile"
          );
        }

        return data;
      })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setError(error.message);
        setLoading(false);
      });
  }, [navigate]);

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("access_token");

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
          body: JSON.stringify({
            name: profile.name,
            program: profile.program,
            profile_picture: profile.profile_picture,
            bio: profile.bio,
            github: profile.github,
            linkedin: profile.linkedin,
            whatsapp: profile.whatsapp,
            skills: profile.skills,
            interests: profile.interests,
            fyp_status: profile.fyp_status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update profile"
        );
      }

      setMessage("Profile updated successfully.");
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <p className="text-gray-500">
          Loading profile...
        </p>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div>
        <p className="text-sm text-gray-500">
          My Profile
        </p>

        <h1 className="text-3xl font-bold mt-1">
          Edit your profile
        </h1>

        <p className="mt-2 text-gray-600">
          Keep your information up to date so other students
          can find you.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 border rounded-2xl p-5 sm:p-6 bg-white space-y-5"
      >
        <div>
          <label className="block text-sm font-medium mb-2">
            Name
          </label>

          <input
            name="name"
            value={profile.name || ""}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            University ID
          </label>

          <input
            value={profile.university_id}
            disabled
            className="w-full border rounded-xl px-4 py-3 bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            University Email
          </label>

          <input
            value={profile.email}
            disabled
            className="w-full border rounded-xl px-4 py-3 bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Program
          </label>

          <select
            name="program"
            value={profile.program || ""}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3 bg-white"
          >
            <option value="BSCS">BSCS</option>
            <option value="BSAI">BSAI</option>
            <option value="BSCB">BSCB</option>
            <option value="BSSE">BSSE</option>
            <option value="BESE">BESE</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Profile Picture URL
          </label>

          <input
            name="profile_picture"
            value={profile.profile_picture || ""}
            onChange={handleChange}
            placeholder="https://..."
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Bio
          </label>

          <textarea
            name="bio"
            value={profile.bio || ""}
            onChange={handleChange}
            rows="4"
            placeholder="Tell other students a little about yourself..."
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Skills
          </label>

          <input
            name="skills"
            value={profile.skills || ""}
            onChange={handleChange}
            placeholder="Python, React, Java, UI/UX..."
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Interests
          </label>

          <input
            name="interests"
            value={profile.interests || ""}
            onChange={handleChange}
            placeholder="AI, Web Development, Cybersecurity..."
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            FYP Status
          </label>

          <select
            name="fyp_status"
            value={profile.fyp_status || ""}
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-3 bg-white"
          >
            <option value="">
              Select status
            </option>
            <option value="Looking for a team">
              Looking for a team
            </option>
            <option value="Already in a team">
              Already in a team
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            GitHub
          </label>

          <input
            name="github"
            value={profile.github || ""}
            onChange={handleChange}
            placeholder="https://github.com/username"
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            LinkedIn
          </label>

          <input
            name="linkedin"
            value={profile.linkedin || ""}
            onChange={handleChange}
            placeholder="https://linkedin.com/in/username"
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            WhatsApp
          </label>

          <input
            name="whatsapp"
            value={profile.whatsapp || ""}
            onChange={handleChange}
            placeholder="Your WhatsApp number"
            className="w-full border rounded-xl px-4 py-3"
          />

          <p className="text-xs text-gray-500 mt-2">
            We'll handle contact privacy before deployment.
          </p>
        </div>

        {message && (
          <p className="text-sm text-green-600">
            {message}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </main>
  );
}

export default MyProfile;