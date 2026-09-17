import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
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
        <Route path="/" element={<Home />} />

        <Route path="/students" element={<Students />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/my-profile" element={<MyProfile />} />

        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:id" element={<TeamProfile />} />
        <Route path="/my-team" element={<MyTeam />} />
        <Route path="/teams/create" element={<CreateTeam />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;