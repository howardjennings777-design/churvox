import React from "react";
import Layout from "./Layout";

export default class SmartHubErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error("Smart Hub boundary", error); }
  render() {
    if (this.state.hasError) {
      return <Layout><div className="min-h-screen bg-slate-100 p-4"><div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 shadow-sm text-center"><h2 className="text-xl font-semibold">Something went wrong loading Smart Hub.</h2><div className="mt-4 flex justify-center gap-2"><button className="rounded-lg bg-blue-600 px-3 py-2 text-white" onClick={() => window.location.reload()}>Reload</button><button className="rounded-lg bg-slate-200 px-3 py-2" onClick={() => window.location.assign('/jobs')}>Go to Jobs</button><button className="rounded-lg bg-slate-200 px-3 py-2" onClick={() => window.location.assign('/login')}>Go to Login</button></div></div></div></Layout>;
    }
    return this.props.children;
  }
}
