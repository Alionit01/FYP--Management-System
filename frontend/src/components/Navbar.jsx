import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchMyInvitations,
  INVITATIONS_CHANGED_EVENT,
} from "../api/invitations";
import Logo from "./Logo";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);

  const links = [
    { name: "Home", path: "/" },
    { name: "Students", path: "/students" },
    { name: "Teams", path: "/teams" },
  ];

  // Keep the pending-invitation count fresh: re-read it on every route
  // change (so it's current after accepting somewhere else) and when a
  // component announces that invitations changed. fetchMyInvitations
  // resolves to [] without any request when signed out, so there is no
  // separate logged-out branch to reset the count.
  useEffect(() => {
    let active = true;

    fetchMyInvitations().then((list) => {
      if (active) setInvitationCount(list.length);
    });

    return () => {
      active = false;
    };
  }, [isLoggedIn, location.pathname]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const refresh = () =>
      fetchMyInvitations().then((list) =>
        setInvitationCount(list.length)
      );

    window.addEventListener(INVITATIONS_CHANGED_EVENT, refresh);
    return () =>
      window.removeEventListener(INVITATIONS_CHANGED_EVENT, refresh);
  }, [isLoggedIn]);

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
                {/* Pending-invitation signal. Shown from md up: below md
                    the hamburger menu carries a "Team invitations" row
                    instead, and md is the narrowest width the desktop bar
                    still has room for it (measured ~115px free at 768 vs
                    40px needed). */}
                {invitationCount > 0 && (
                  <Link
                    to="/my-profile"
                    aria-label={`Team invitations, ${invitationCount} pending`}
                    title={`${invitationCount} pending team invitation${
                      invitationCount === 1 ? "" : "s"
                    }`}
                    className="relative ml-1 hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 hover:bg-forest-50 transition-colors"
                  >
                    <Bell size={18} aria-hidden="true" />

                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sun-500 text-forest-950 text-[11px] font-bold flex items-center justify-center"
                    >
                      {invitationCount}
                    </span>
                  </Link>
                )}

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
                  {/* Mobile has no room for the bell, so pending
                      invitations get their own menu row. */}
                  {invitationCount > 0 && (
                    <Link
                      to="/my-profile"
                      onClick={handleLinkClick}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-forest-900 bg-forest-50 transition-colors hover:bg-forest-100"
                    >
                      Team invitations
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-sun-500 text-forest-950 text-[11px] font-bold">
                        {invitationCount}
                      </span>
                    </Link>
                  )}

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
