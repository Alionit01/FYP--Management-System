import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main className="page-container max-w-xl">
      <div className="border border-dashed border-zinc-300 rounded-2xl p-10 text-center">
        <h1 className="text-xl font-bold text-zinc-900">
          Page not found
        </h1>

        <p className="mt-2 text-zinc-500">
          The page you're looking for doesn't exist or has moved.
        </p>

        <Link to="/" className="primary-button mt-5 inline-flex">
          Back to Home
        </Link>
      </div>
    </main>
  );
}

export default NotFound;
