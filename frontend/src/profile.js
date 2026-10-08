// Single source of truth for "is this profile complete?".
// The backend flag is authoritative (grandfathered users keep it TRUE);
// the field check is a fallback so a stale flag cannot lock anyone out.
export function isProfileComplete(profile) {
  if (!profile) return false;
  if (profile.profile_completed === true) return true;
  return Boolean(
    profile.profile_picture &&
      profile.skills &&
      profile.skills.trim() &&
      profile.fyp_status
  );
}

export function missingProfileFields(profile) {
  const missing = [];
  if (!profile) return ["Profile photo", "Skills", "FYP status"];
  if (!profile.profile_picture) missing.push("Profile photo");
  if (!profile.skills || !profile.skills.trim()) missing.push("Skills");
  if (!profile.fyp_status) missing.push("FYP status");
  return missing;
}
