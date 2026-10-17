import { useEffect } from "react";
import {
  BrowserRouter,
  Link,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./context/AuthContext";

import Home from "./pages/Home";
import Students from "./pages/Students";
import Teams from "./pages/Teams";
import StudentProfile from "./pages/StudentProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TeamProfile from "./pages/TeamProfile";
import CreateTeam from "./pages/CreateTeam";
import MyTeam from "./pages/MyTeam";
import MyProfile from "./pages/MyProfile";
import EditTeam from "./pages/EditTeam";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";

/* The browser restores a history entry's scroll position on its own,
   which would undo the reset below the moment a student presses Back
   — leaving them wherever they were on the page instead of at its
   top. Handing scroll position to the app (React Router's data
   routers do the same) is what makes the reset mean anything. */
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function RouteFocus() {
  const location = useLocation();

  useEffect(() => {
    // Route changes used to keep the previous scroll offset, so
    // opening a profile from the bottom of a long directory list left
    // the new page pinned mid-document with its back link above the
    // fold. Keyed on the path only, so changing a filter (the query
    // string) does not yank the page back to the top.
    window.scrollTo(0, 0);

    const main = document.querySelector("main");
    if (!main) return;

    let headingFocused = false;

    const focusHeading = () => {
      const heading = main.querySelector("h1");
      if (heading && !headingFocused) {
        headingFocused = true;
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    };

    // Focus the new page's heading as soon as it exists (some pages
    // render the h1 only after data loads, so watch for it).
    focusHeading();

    const observer = new MutationObserver(() => {
      focusHeading();
      if (headingFocused) observer.disconnect();
    });

    observer.observe(main, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [location.pathname]);

  return null;
}

function RouteTitle() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    let title;
    if (path === "/") title = "Home";
    else if (path === "/students") title = "Find Students";
    else if (path === "/teams") title = "Find a Team";
    else if (path === "/login") title = "Sign In";
    else if (path === "/register") title = "Create Account";
    else if (path === "/privacy") title = "Privacy Policy";
    else if (path === "/verify-email") title = "Email Verification";
    else if (path === "/forgot-password") title = "Reset Password";
    else if (path === "/reset-password") title = "Set New Password";
    else if (path === "/my-team") title = "My Team";
    else if (path === "/my-profile") title = "My Profile";
    else if (path === "/teams/create") title = "Create a Team";
    else if (/^\/students\/\d+$/.test(path)) title = "Student Profile";
    else if (/^\/teams\/\d+\/edit$/.test(path)) title = "Edit Team";
    else if (/^\/teams\/\d+$/.test(path)) title = "Team Profile";
    else title = "Page Not Found";

    document.title = `${title} · FYP Finder`;
  }, [location.pathname]);

  return null;
}

/* Shown once when a session is dropped while the app is open (FE-03).
   Explains the sign-out instead of leaving the student staring at a
   login page they did not ask for, and offers a direct way back in. */
function SessionExpiredNotice() {
  const { sessionExpired, dismissSessionExpired } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // A fresh navigation (including to /login) is its own answer.
    dismissSessionExpired();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!sessionExpired) return null;

  return (
    <div
      role="status"
      className="border-b border-warning-300/60 bg-warning-50 text-warning-900"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
        <p className="flex-1 min-w-[14rem]">
          Your session has expired, so we signed you out to protect your
          account. Sign in again to carry on where you left off.
        </p>
        <Link
          to="/login"
          className="rounded-lg bg-forest-700 px-4 py-2 font-medium text-white hover:bg-forest-800"
        >
          Sign in again
        </Link>
        <button
          type="button"
          onClick={dismissSessionExpired}
          className="rounded-lg px-3 py-2 text-ink-soft hover:text-forest-800"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RouteTitle />
      <RouteFocus />
      <Navbar />
      <SessionExpiredNotice />

      <ErrorBoundary>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:id" element={<TeamProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Readable while signed out: the consent checkbox on /register
            links here, so it can never sit behind ProtectedRoute. */}
        <Route path="/privacy" element={<Privacy />} />

        {/* Protected pages */}
        <Route
          path="/teams/create"
          element={
            <ProtectedRoute>
              <CreateTeam />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-team"
          element={
            <ProtectedRoute>
              <MyTeam />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-profile"
          element={
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teams/:id/edit"
          element={
            <ProtectedRoute>
              <EditTeam />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
      <Footer />
    </BrowserRouter>
  );
}

export default App;