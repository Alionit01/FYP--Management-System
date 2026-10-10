// Single source of truth for "is this profile complete?".
// The backend flag is authoritative (grandfathered users keep it TRUE);
// the field check is a fallback so a stale flag cannot lock anyone out.
// A profile picture is optional — skills and FYP status are required.
export function isProfileComplete(profile) {
  if (!profile) return false;
  if (profile.profile_completed === true) return true;
  return Boolean(
    profile.skills && profile.skills.trim() && profile.fyp_status
  );
}

export function missingProfileFields(profile) {
  const missing = [];
  if (!profile) return ["Skills", "FYP status"];
  if (!profile.skills || !profile.skills.trim()) missing.push("Skills");
  if (!profile.fyp_status) missing.push("FYP status");
  return missing;
}
