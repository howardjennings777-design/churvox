import React from "react";
import { useAuth } from "../context/AuthContext";
import { accessForOwnerScreen, canonicalOwnerScreen } from "./OfficeTeamAccess";
import "./OfficeTeamOwnerScreenGuard.css";

function targetUrl(value) {
  try { return new URL(String(value || window.location.href), window.location.href); } catch { return new URL(window.location.href); }
}

function dispatchHashChange() {
  window.setTimeout(() => {
    try { window.dispatchEvent(new HashChangeEvent("hashchange")); }
    catch { window.dispatchEvent(new Event("hashchange")); }
  }, 0);
}

export default function OfficeTeamOwnerScreenGuard({ appMode = "lab", children }) {
  const { user, loading } = useAuth();
  const active = appMode === "owner";
  const [ready, setReady] = React.useState(() => !active || Boolean(user));
  const [blocked, setBlocked] = React.useState(null);

  React.useLayoutEffect(() => {
    if (!active || !user) {
      if (!active) setReady(true);
      return undefined;
    }

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);
    let guarding = false;

    const check = (urlValue, method = "replace") => {
      if (guarding) return false;
      const url = targetUrl(urlValue);
      const requested = canonicalOwnerScreen(url.hash);
      const access = accessForOwnerScreen(requested, user);
      if (access.allowed) return false;

      guarding = true;
      const safeUrl = new URL(url.toString());
      safeUrl.hash = "#plans";
      setBlocked({
        requested,
        title: access.title || "Plan upgrade required",
        message: access.message || "This tool is not included in the current plan.",
      });
      if (method === "push") originalPushState(window.history.state, "", safeUrl.toString());
      else originalReplaceState(window.history.state, "", safeUrl.toString());
      dispatchHashChange();
      guarding = false;
      return true;
    };

    window.history.pushState = function paidLaunchOwnerPushState(state, title, url) {
      const candidate = targetUrl(url || window.location.href);
      const requested = canonicalOwnerScreen(candidate.hash);
      const access = accessForOwnerScreen(requested, user);
      if (!access.allowed) {
        candidate.hash = "#plans";
        setBlocked({ requested, title: access.title || "Plan upgrade required", message: access.message || "This tool is not included in the current plan." });
        const result = originalPushState(state, title, candidate.toString());
        dispatchHashChange();
        return result;
      }
      return originalPushState(state, title, url);
    };

    window.history.replaceState = function paidLaunchOwnerReplaceState(state, title, url) {
      const candidate = targetUrl(url || window.location.href);
      const requested = canonicalOwnerScreen(candidate.hash);
      const access = accessForOwnerScreen(requested, user);
      if (!access.allowed) {
        candidate.hash = "#plans";
        setBlocked({ requested, title: access.title || "Plan upgrade required", message: access.message || "This tool is not included in the current plan." });
        const result = originalReplaceState(state, title, candidate.toString());
        dispatchHashChange();
        return result;
      }
      return originalReplaceState(state, title, url);
    };

    const handleRoute = () => check(window.location.href, "replace");
    window.addEventListener("hashchange", handleRoute);
    window.addEventListener("popstate", handleRoute);
    check(window.location.href, "replace");
    setReady(true);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("hashchange", handleRoute);
      window.removeEventListener("popstate", handleRoute);
    };
  }, [active, loading, user]);

  if (active && (!user || !ready)) {
    return <main className="cvOwnerScreenGuardLoading"><strong>Checking plan access…</strong><span>Churvox is opening the correct owner workspace.</span></main>;
  }

  return (
    <>
      {blocked ? (
        <aside className="cvOwnerScreenGuardNotice" role="alert">
          <div><strong>{blocked.title}</strong><span>{blocked.message}</span></div>
          <button type="button" onClick={() => setBlocked(null)} aria-label="Dismiss plan access notice">Dismiss</button>
        </aside>
      ) : null}
      {children}
    </>
  );
}
