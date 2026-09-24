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
      <nav className="hidden md:block sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-zinc-900"
          >
            FYP Finder
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => {
              const active = location.pathname === link.path;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            <span className="w-px h-5 bg-zinc-200 mx-2" aria-hidden="true" />

            {isLoggedIn ? (
              <>
                <Link
                  to="/my-team"
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === "/my-team"
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  My Team
                </Link>

                <Link
                  to="/my-profile"
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === "/my-profile"
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  My Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="ml-2 bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-700 active:bg-zinc-800 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="ml-2 bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-700 active:bg-zinc-800 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
        <div className="h-14 px-4 flex items-center justify-between">
          <Link
            to="/"
            onClick={handleLinkClick}
            className="text-lg font-bold tracking-tight text-zinc-900"
          >
            FYP Finder
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="-mr-2 p-2 rounded-lg text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
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
          <div className="border-t border-zinc-200 bg-white px-4 pb-4 pt-2">
            <div className="flex flex-col">
              {links.map((link) => {
                const active = location.pathname === link.path;

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
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
                    className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === "/my-team"
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    My Team
                  </Link>

                  <Link
                    to="/my-profile"
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === "/my-profile"
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    My Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="mt-3 w-full bg-zinc-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-zinc-700 active:bg-zinc-800 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={handleLinkClick}
                  className="mt-3 w-full text-center bg-zinc-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-zinc-700 active:bg-zinc-800 transition-colors"
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