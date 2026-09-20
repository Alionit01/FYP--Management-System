import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, logout } = useAuth();

  const links = [
    { name: "Home", path: "/" },
    { name: "Students", path: "/students" },
    { name: "Teams", path: "/teams" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
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
                className="bg-gray-900 text-white !text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition"
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
            className="text-lg font-bold tracking-tight"
          >
            FYP Finder
          </Link>

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-3 h-16">
          {links.map((link) => {
            const active = location.pathname === link.path;

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center justify-center text-sm transition ${
                  active
                    ? "font-semibold text-gray-900"
                    : "text-gray-500"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default Navbar;