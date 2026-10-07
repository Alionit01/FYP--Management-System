import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

import Home from "./pages/Home";
import Students from "./pages/Students";
import Teams from "./pages/Teams";
import StudentProfile from "./pages/StudentProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import TeamProfile from "./pages/TeamProfile";
import CreateTeam from "./pages/CreateTeam";
import MyTeam from "./pages/MyTeam";
import MyProfile from "./pages/MyProfile";
import EditTeam from "./pages/EditTeam";
import NotFound from "./pages/NotFound";

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
    else if (path === "/verify-email") title = "Email Verification";
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

function App() {
  return (
    <BrowserRouter>
      <RouteTitle />
      <Navbar />

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
    </BrowserRouter>
  );
}

export default App;