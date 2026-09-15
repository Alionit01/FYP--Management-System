import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();

  const links = [
    { name: "Home", path: "/" },
    { name: "Students", path: "/students" },
    { name: "Teams", path: "/teams" },
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">
            FYP Find
          </Link>

          <div className="flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={
                  location.pathname === link.path
                    ? "font-semibold"
                    : "text-gray-600"
                }
              >
                {link.name}
              </Link>
            ))}

            <Link
              to="/login"
              className="bg-black text-white px-4 py-2 rounded-lg"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden border-b bg-white">
        <div className="h-14 px-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold">
            FYP Finder
          </Link>

          <Link
            to="/login"
            className="text-sm font-medium"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
        <div className="grid grid-cols-3 h-16">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center justify-center text-sm ${
                location.pathname === link.path
                  ? "font-semibold"
                  : "text-gray-500"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export default Navbar;