import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

function NotFound() {
  return (
    <main className="page-container max-w-xl">
      <div className="empty-state !p-12">
        <p
          aria-hidden="true"
          className="display text-6xl text-forest-200 leading-none"
        >
          404
        </p>

        <h1 className="display mt-4 text-2xl text-forest-900">
          Page not found
        </h1>

        <p className="mt-2 text-ink-soft">
          The page you're looking for doesn't exist or has moved.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <Link to="/" className="primary-button">
            Back to Home
          </Link>

          <Link to="/students" className="secondary-button">
            <Compass size={16} aria-hidden="true" />
            Find students
          </Link>
        </div>
      </div>
    </main>
  );
}

export default NotFound;
