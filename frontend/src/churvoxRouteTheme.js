/*
  Adds a safe body route marker so CSS can theme worker screens
  without changing app logic or breaking routes.
*/
(function installChurvoxRouteTheme() {
  if (typeof window === "undefined" || window.__churvoxRouteThemeInstalled) return;
  window.__churvoxRouteThemeInstalled = true;

  const sync = () => {
    if (!document.body) return;

    const path = window.location.pathname || "/";
    document.body.setAttribute("data-churvox-path", path);

    const isWorkerRoute =
      /(^|\/)(worker|workers|my-jobs|worker-jobs|worker-dashboard)(\/|$)/i.test(path);

    if (isWorkerRoute) {
      document.body.setAttribute("data-churvox-worker", "true");
    } else {
      document.body.removeAttribute("data-churvox-worker");
    }
  };

  const patchHistory = (name) => {
    const original = window.history[name];
    window.history[name] = function patchedHistory() {
      const result = original.apply(this, arguments);
      window.dispatchEvent(new Event("churvox-route-change"));
      return result;
    };
  };

  patchHistory("pushState");
  patchHistory("replaceState");

  window.addEventListener("popstate", sync);
  window.addEventListener("churvox-route-change", sync);
  window.addEventListener("load", sync);

  sync();
})();
