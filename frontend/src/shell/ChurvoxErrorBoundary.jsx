import React from "react";
import "./ChurvoxErrorBoundary.css";

export default class ChurvoxErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Something went wrong.",
    };
  }

  componentDidCatch(error, info) {
    console.error("Churvox UI crash caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="churvox-crash-safe">
        <section>
          <span>AI Operator safety mode</span>
          <h1>Churvox hit a screen error.</h1>
          <p>
            The app caught the crash instead of showing a blank page. Refresh once, or go back to the Smart Hub.
          </p>

          <div>
            <button type="button" onClick={() => window.location.reload()}>
              Refresh app
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                window.history.pushState({}, "", "/dashboard");
                window.location.reload();
              }}
            >
              Open Smart Hub
            </button>
          </div>

          <small>{this.state.message}</small>
        </section>
      </main>
    );
  }
}
