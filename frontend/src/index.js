import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

async function killOldCaches() {
  try {
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.unregister();
      }
    }

    if (typeof window !== "undefined" && "caches" in window) {
      const keys = await window.caches.keys();
      for (const key of keys) {
        await window.caches.delete(key);
      }
    }

    console.log("Old service workers and caches cleared");
  } catch (err) {
    console.error("CACHE_CLEAR_ERROR", err);
  }
}

killOldCaches().finally(() => {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
