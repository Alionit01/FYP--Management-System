import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

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

  // A section counts as active on its own page and its sub-pages
  // (e.g. Teams on /teams/123/edit).
  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path ||
        location.pathname.startsWith(`${path}/`);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  // Close the mobile menu with Escape, via an outside tap/click, and
  // lock the page scroll while it's open.
  const headerRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const handlePointerDown = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const linkClass = (active, base) =>
    `${base} ${
      active
        ? "bg-forest-100 text-forest-900"
        : "text-ink-soft hover:text-forest-900 hover:bg-forest-50"
    }`;

  return (
    <>
      {/* Desktop Navbar */}
      <nav
        aria-label="Main"
        className="hidden md:block sticky top-0 z-40 border-b border-forest-900/10 bg-cream-50/92 backdrop-blur"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Logo />

          <div className="flex items-center gap-1">
            {links.map((link) => {
              const active = isActive(link.path);

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(
                    active,
                    "text-sm font-medium px-3.5 py-2 rounded-full transition-colors"
                  )}
                >
                  {link.name}
                </Link>
              );
            })}

            <span
              className="w-px h-5 bg-forest-900/15 mx-3"
              aria-hidden="true"
            />

            {isLoggedIn ? (
              <>
                <Link
                  to="/my-profile"
                  aria-current={
                    isActive("/my-profile") ? "page" : undefined
                  }
                  className={linkClass(
                    isActive("/my-profile"),
                    "text-sm font-medium px-3.5 py-2 rounded-full transition-colors"
                  )}
                >
                  My Profile
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="secondary-button ml-3 !py-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {/* Account actions get a touch more padding and weight
                    than the nav links so the two groups read as
                    separate, balanced clusters. */}
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-full text-sm font-semibold text-forest-800 transition-colors hover:bg-forest-50 hover:text-forest-900"
                >
                  Create account
                </Link>

                <Link to="/login" className="primary-button ml-2 !py-2">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <header
        ref={headerRef}
        className="md:hidden sticky top-0 z-40 border-b border-forest-900/10 bg-cream-50/95 backdrop-blur"
      >
        <div className="h-14 px-4 flex items-center justify-between">
          <Logo onClick={handleLinkClick} />

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="-mr-2 p-2 rounded-full text-forest-900 hover:bg-forest-100 active:bg-forest-200 transition-colors"
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
          <div className="border-t border-forest-900/10 bg-cream-50 px-4 pb-5 pt-2 shadow-lift">
            <div className="flex flex-col">
              {links.map((link) => {
                const active = isActive(link.path);

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={handleLinkClick}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-forest-100 text-forest-900"
                        : "text-ink-soft hover:bg-forest-50 hover:text-forest-900"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}

              {isLoggedIn ? (
                <>
                  <Link
                    to="/my-profile"
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive("/my-profile")
                        ? "bg-forest-100 text-forest-900"
                        : "text-ink-soft hover:bg-forest-50 hover:text-forest-900"
                    }`}
                  >
                    My Profile
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="secondary-button mt-3 w-full !py-3"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={handleLinkClick}
                    className="primary-button mt-3 w-full !py-3"
                  >
                    Sign in
                  </Link>

                  <Link
                    to="/register"
                    onClick={handleLinkClick}
                    className="secondary-button mt-2 w-full !py-3"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Navbar;
