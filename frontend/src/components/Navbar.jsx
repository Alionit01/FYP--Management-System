import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { name: "Home", path: "/" },
    { name: "Students", path: "/students" },
    { name: "Teams", path: "/teams" },
  ];

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight"
          >
            FYP Finder
          </Link>

          <div className="flex items-center gap-7">
            {links.map((link) => {
              const active = location.pathname === link.path;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm transition ${
                    active
                      ? "font-semibold text-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {isLoggedIn ? (
              <>
                <Link
                  to="/my-team"
                  className={`text-sm transition ${
                    location.pathname === "/my-team"
                      ? "font-semibold text-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  My Team
                </Link>

                <Link
                  to="/my-profile"
                  className={`text-sm transition ${
                    location.pathname === "/my-profile"
                      ? "font-semibold text-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  My Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <header className="md:hidden border-b border-gray-200 bg-white">
        <div className="h-14 px-4 flex items-center justify-between">
          <Link
            to="/"
            onClick={handleLinkClick}
            className="text-lg font-bold tracking-tight"
          >
            FYP Finder
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? (
              <X size={22} />
            ) : (
              <Menu size={22} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            <div className="flex flex-col">
              {links.map((link) => {
                const active = location.pathname === link.path;

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={handleLinkClick}
                    className={`py-3 text-sm border-b border-gray-100 transition ${
                      active
                        ? "font-semibold text-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}

              {isLoggedIn ? (
                <>
                  <Link
                    to="/my-team"
                    onClick={handleLinkClick}
                    className={`py-3 text-sm border-b border-gray-100 transition ${
                      location.pathname === "/my-team"
                        ? "font-semibold text-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    My Team
                  </Link>

                  <Link
                    to="/my-profile"
                    onClick={handleLinkClick}
                    className={`py-3 text-sm border-b border-gray-100 transition ${
                      location.pathname === "/my-profile"
                        ? "font-semibold text-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    My Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="mt-3 w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={handleLinkClick}
                  className="mt-3 w-full text-center bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Navbar;