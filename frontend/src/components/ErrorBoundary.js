import React from "react";
import { safeReactChild } from "../utils/safeRender";

const CHUNK_RECOVERY_KEY = "churvox:chunk-recovery-route:v1";
const CHUNK_RECOVERY_QUERY = "cv_reload";

export function isRecoverableChunkError(error) {
  const message = String(error?.message || error?.name || error || "");
  return /ChunkLoadError|Loading (?:CSS )?chunk [^ ]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
}

function routeRecoveryKey() {
  if (typeof window === "undefined") return "server";
  const url = new URL(window.location.href);
  url.searchParams.delete(CHUNK_RECOVERY_QUERY);
  return `${url.pathname}${url.search}${url.hash}`;
}

function recoveryUrl() {
  if (typeof window === "undefined") return "/";
  const url = new URL(window.location.href);
  url.searchParams.set(CHUNK_RECOVERY_QUERY, Date.now().toString(36));
  return `${url.pathname}${url.search}${url.hash}`;
}

function rememberRecoveryAttempt() {
  try {
    window.sessionStorage.setItem(CHUNK_RECOVERY_KEY, routeRecoveryKey());
  } catch {}
}

function hasTriedRecovery() {
  try {
    return window.sessionStorage.getItem(CHUNK_RECOVERY_KEY) === routeRecoveryKey();
  } catch {
    return false;
  }
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.recoveryTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    if (typeof window === "undefined") return;
    this.recoveryTimer = window.setTimeout(() => {
      if (this.state.hasError) return;
      try {
        if (window.sessionStorage.getItem(CHUNK_RECOVERY_KEY) === routeRecoveryKey()) {
          window.sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
        }
      } catch {}
    }, 8000);
  }

  componentWillUnmount() {
    if (this.recoveryTimer) window.clearTimeout(this.recoveryTimer);
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);

    if (typeof window !== "undefined" && isRecoverableChunkError(error) && !hasTriedRecovery()) {
      rememberRecoveryAttempt();
      window.location.replace(recoveryUrl());
    }
  }

  retryCurrentPage = () => {
    if (typeof window === "undefined") return;
    rememberRecoveryAttempt();
    window.location.replace(recoveryUrl());
  };

  render() {
    if (this.state.hasError) {
      const fallbackLabel = this.props.fallbackLabel || "Try this page again";
      const chunkError = isRecoverableChunkError(this.state.error);

      return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6" data-testid="churvox-error-boundary">
          <section className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">Churvox recovery</p>
            <h1 className="text-xl font-semibold text-slate-900">
              {chunkError ? "Churvox was updated while this page was open." : "Something went wrong loading this page."}
            </h1>
            <p className="text-sm text-slate-600">
              {chunkError
                ? "Your work is still safe. Refresh this exact page to load the newest version."
                : safeReactChild(this.state.error, "An unexpected error occurred.")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.retryCurrentPage}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700"
              >
                {fallbackLabel}
              </button>
              <a
                href={this.props.fallbackHref || "/"}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100"
              >
                Open Churvox home
              </a>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
