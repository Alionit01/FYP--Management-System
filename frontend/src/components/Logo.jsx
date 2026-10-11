import { Link } from "react-router-dom";

/* The FYP Finder mark: a forest tile holding a cream map-pin with a
   warm sun at its centre — "finding" your people. Matches favicon.svg. */
export function LogoMark({ className = "h-8 w-8", inverted = false }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {!inverted && <rect width="32" height="32" rx="9" fill="#175e3c" />}
      <path
        d="M16 6.4c-4.42 0-8 3.52-8 7.86 0 5.66 8 12.24 8 12.24s8-6.58 8-12.24c0-4.34-3.58-7.86-8-7.86z"
        fill={inverted ? "#fdfaf3" : "#fdfaf3"}
      />
      <circle cx="16" cy="14.2" r="3.1" fill="#dd8a2b" />
    </svg>
  );
}

/* Wordmark link used in the navigation bar and the footer. */
function Logo({ to = "/", onClick, inverted = false, className = "" }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 group ${className}`}
    >
      <LogoMark
        inverted={inverted}
        className="h-8 w-8 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5"
      />

      <span
        className={`display text-[1.35rem] leading-none ${
          inverted ? "text-cream-50" : "text-forest-900"
        }`}
      >
        FYP{" "}
        <em className={inverted ? "text-sun-300" : ""}>Finder</em>
      </span>
    </Link>
  );
}

export default Logo;
