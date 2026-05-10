import React, { useEffect, useState } from "react";
import { Camera, CheckCircle2, ClipboardCheck, Navigation, WifiOff } from "lucide-react";
import WorkerCockpitPage from "./WorkerCockpitPage";

const CHECKS = [
  "Navigate to site",
  "Start job on arrival",
  "Upload before/after proof",
  "Add final note",
  "Complete job",
];

export default function WorkerCommandProPage() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [done, setDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("churvox_worker_daily_checks") || "{}");
    } catch {
      return {};
    }
  });

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

  const toggle = (item) => {
    setDone((current) => {
      const next = { ...current, [item]: !current[item] };
      localStorage.setItem("churvox_worker_daily_checks", JSON.stringify(next));
      return next;
    });
  };

  const completed = CHECKS.filter((item) => done[item]).length;

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10000,
          background: "linear-gradient(135deg,#07100d,#121923)",
          color: "#fff7e8",
          padding: "12px",
          borderBottom: "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 12px 30px rgba(0,0,0,.18)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          <div style={cardStyle}>
            {online ? <CheckCircle2 size={19} color="#27f6b7" /> : <WifiOff size={19} color="#ff7a48" />}
            <div><strong>{online ? "Worker app online" : "Offline mode ready"}</strong><small>Actions are ready for proof-to-paid.</small></div>
          </div>

          <div style={cardStyle}>
            <Navigation size={19} color="#ffd48a" />
            <div><strong>Next best action</strong><small>Navigate, start, upload proof, complete.</small></div>
          </div>

          <div style={cardStyle}>
            <Camera size={19} color="#27f6b7" />
            <div><strong>Proof-to-paid</strong><small>Photos + note help AI draft the invoice.</small></div>
          </div>

          <div style={cardStyle}>
            <ClipboardCheck size={19} color="#ffd48a" />
            <div><strong>Daily checklist</strong><small>{completed}/{CHECKS.length} done</small></div>
          </div>
        </div>

        <div style={{ maxWidth: 1180, margin: "10px auto 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CHECKS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "8px 11px",
                background: done[item] ? "#27f6b7" : "rgba(255,255,255,.1)",
                color: done[item] ? "#07100d" : "#fff7e8",
                fontWeight: 850,
                fontSize: 12,
              }}
            >
              {done[item] ? "✓ " : ""}{item}
            </button>
          ))}
        </div>
      </div>

      <WorkerCockpitPage />
    </>
  );
}

const cardStyle = {
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 20,
  background: "rgba(255,255,255,.07)",
  padding: 12,
  display: "grid",
  gridTemplateColumns: "24px 1fr",
  gap: 9,
  alignItems: "center",
};
