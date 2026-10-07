import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page-container max-w-xl">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-semibold text-zinc-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-zinc-500">
              The page failed to load. Please try again.
            </p>
            <button
              type="button"
              className="primary-button mt-5"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
