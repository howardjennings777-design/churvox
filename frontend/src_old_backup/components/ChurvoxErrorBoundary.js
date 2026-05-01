import React from "react";

export default class ChurvoxErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Something went wrong." };
  }

  componentDidCatch(error, info) {
    console.error("Churvox page crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: 24 }}>
        <div style={{ maxWidth: 760, margin: "40px auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 24, boxShadow: "0 20px 50px rgba(15,23,42,.10)" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#2563eb", letterSpacing: ".14em", textTransform: "uppercase" }}>Churvox safety mode</p>
          <h1 style={{ margin: "12px 0 8px", fontSize: 30, fontWeight: 950 }}>This page hit a bad build.</h1>
          <p style={{ margin: 0, color: "#475569", fontWeight: 700, lineHeight: 1.6 }}>
            Churvox caught the page crash instead of showing a blank screen. Go back to Smart Hub, Jobs, Clients, Quotes or Invoices, or refresh after the rollback deploy finishes.
          </p>
          {this.state.message ? (
            <pre style={{ marginTop: 16, whiteSpace: "pre-wrap", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, color: "#334155", fontSize: 12 }}>{this.state.message}</pre>
          ) : null}
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/dashboard" style={{ background: "#2563eb", color: "#fff", textDecoration: "none", padding: "10px 14px", borderRadius: 14, fontWeight: 900 }}>Open Smart Hub</a>
            <a href="/jobs" style={{ background: "#fff", color: "#0f172a", textDecoration: "none", padding: "10px 14px", borderRadius: 14, fontWeight: 900, border: "1px solid #e2e8f0" }}>Open Jobs</a>
            <button onClick={() => window.location.reload()} style={{ background: "#fff", color: "#0f172a", padding: "10px 14px", borderRadius: 14, fontWeight: 900, border: "1px solid #e2e8f0", cursor: "pointer" }}>Refresh</button>
          </div>
        </div>
      </div>
    );
  }
}
