import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Students from "./pages/Students";
import Teams from "./pages/Teams";
import StudentProfile from "./pages/StudentProfile";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/students" element={<Students />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/students/:id" element={<StudentProfile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;