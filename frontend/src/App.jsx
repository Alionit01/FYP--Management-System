import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Students from "./pages/Students";
import Teams from "./pages/Teams";
import StudentProfile from "./pages/StudentProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TeamProfile from "./pages/TeamProfile";
import CreateTeam from "./pages/CreateTeam";
import MyTeam from "./pages/MyTeam";
import MyProfile from "./pages/MyProfile";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:id" element={<TeamProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;