import React, { useEffect, useState } from "react";
import { CheckCircle2, WifiOff } from "lucide-react";
import WorkerCockpitPage from "./WorkerCockpitPage";

export default function WorkerCommandProPage() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const update = () => {
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
      try {
        const raw = localStorage.getItem("churvox_worker_offline_queue") || "[]";
        setQueued(JSON.parse(raw).length || 0);
      } catch {
        setQueued(0);
      }
    };

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("storage", update);
    const timer = setInterval(update, 4000);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("storage", update);
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 13px",
          borderRadius: 999,
          background: online ? "rgba(20,120,72,.94)" : "rgba(184,50,42,.96)",
          color: "white",
          fontWeight: 850,
          fontSize: 12,
          boxShadow: "0 12px 30px rgba(0,0,0,.2)",
          pointerEvents: "none",
        }}
      >
        {online ? <CheckCircle2 size={16} /> : <WifiOff size={16} />}
        {online ? "Worker app online" : "Offline mode"}
        {queued ? ` · ${queued} queued` : ""}
      </div>

      <WorkerCockpitPage />
    </>
  );
}
