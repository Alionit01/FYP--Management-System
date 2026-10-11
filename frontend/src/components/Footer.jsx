import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

/* Site footer. Only links to routes that actually exist, and it mirrors
   the signed-in state the navigation bar uses. */
function Footer() {
  const { isLoggedIn } = useAuth();
  const year = new Date().getFullYear();

  const exploreLinks = [
    { name: "Find Students", path: "/students" },
    { name: "Find a Team", path: "/teams" },
  ];

  const accountLinks = isLoggedIn
    ? [
        { name: "My Team", path: "/my-team" },
        { name: "My Profile", path: "/my-profile" },
      ]
    : [
        { name: "Sign In", path: "/login" },
        { name: "Create Account", path: "/register" },
        { name: "Reset Password", path: "/forgot-password" },
      ];

  return (
    <footer className="mt-16 border-t border-forest-900/10 bg-cream-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />

            <p className="mt-4 text-sm text-ink-soft leading-relaxed max-w-xs">
              The meeting point for final-year project teams — find the
              skills your project needs, or the teammates yours is missing.
            </p>
          </div>

          <nav aria-label="Explore">
            <h2 className="eyebrow">Explore</h2>

            <ul className="mt-4 space-y-2.5">
              {exploreLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm font-medium text-ink-soft transition-colors hover:text-forest-800"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account">
            <h2 className="eyebrow">Account</h2>

            <ul className="mt-4 space-y-2.5">
              {accountLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm font-medium text-ink-soft transition-colors hover:text-forest-800"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-forest-900/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-ink-muted">
            © {year} FYP Finder · Built for final-year students
          </p>

          <p className="text-xs text-ink-muted">
            Students of Iqra University · @iqra.edu.pk
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
