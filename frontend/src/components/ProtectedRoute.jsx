import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isProfileComplete } from "../profile";
import API_URL from "../api";

function ProtectedRoute({ children }) {
  const { isLoggedIn, profileComplete, setProfileComplete } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isLoggedIn || profileComplete !== null) return;

    const token = localStorage.getItem("access_token");
    fetch(`${API_URL}/my-profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setProfileComplete(isProfileComplete(data)))
      .catch(() => setProfileComplete(true)); // fail open: never block the app on a fetch hiccup
  }, [isLoggedIn, profileComplete, setProfileComplete]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const onProfilePage = location.pathname === "/my-profile";

  if (profileComplete === null) {
    // MyProfile fetches the profile itself and renders its own
    // loading state, so only gate the other protected pages.
    if (onProfilePage) return children;
    return (
      <main className="page-container max-w-3xl">
        <p role="status" className="sr-only">
          Loading…
        </p>

        <div className="space-y-4" aria-hidden="true">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (profileComplete === false && !onProfilePage) {
    return (
      <Navigate
        to="/my-profile"
        replace
        state={{ from: location, needsSetup: true }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;
