import React, { useEffect, useState } from "react";
import { CheckCircle2, WifiOff } from "lucide-react";
import WorkerCockpitPage from "./WorkerCockpitPage";

export default function WorkerCommandProPage() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
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
      </div>

      <WorkerCockpitPage />
    </>
  );
}
