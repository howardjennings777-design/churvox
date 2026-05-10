import React, { useEffect, useState } from "react";
import { Camera, CheckCircle2, ClipboardCheck, Navigation, Sparkles, WifiOff } from "lucide-react";
import WorkerCockpitPage from "./WorkerCockpitPage";

const CHECKS = [
  "Navigate to site",
  "Start job on arrival",
  "Upload proof photos",
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
      <section style={wrap}>
        <div style={hero}>
          <div style={statusPill}>
            {online ? <CheckCircle2 size={16} /> : <WifiOff size={16} />}
            {online ? "Online" : "Offline ready"}
          </div>

          <div>
            <p style={eyebrow}><Sparkles size={15} /> WORKER COMMAND</p>
            <h1 style={title}>Do the next job. Prove the work. Move on.</h1>
            <p style={subtitle}>
              Open your next job below, navigate, start, upload proof, add the final note, then complete it so the office can invoice faster.
            </p>
          </div>

          <div style={actions}>
            <div style={actionCard}>
              <Navigation size={20} color="#ffd166" />
              <strong>Next action</strong>
              <span>Open Next Job below</span>
            </div>
            <div style={actionCard}>
              <Camera size={20} color="#20e3b2" />
              <strong>Proof-to-paid</strong>
              <span>Photos + note help AI prepare the invoice</span>
            </div>
            <div style={actionCard}>
              <ClipboardCheck size={20} color="#ffd166" />
              <strong>Checklist</strong>
              <span>{completed}/{CHECKS.length} complete</span>
            </div>
          </div>

          <div style={checkRow}>
            {CHECKS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggle(item)}
                style={{
                  ...checkBtn,
                  background: done[item] ? "#20e3b2" : "rgba(255,253,248,.10)",
                  color: done[item] ? "#08090b" : "#fffdf8",
                }}
              >
                {done[item] ? "✓ " : ""}{item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <WorkerCockpitPage />
    </>
  );
}

const wrap = {
  background: "#f3ebdd",
  padding: "12px",
};

const hero = {
  maxWidth: 1180,
  margin: "0 auto",
  borderRadius: 30,
  padding: 18,
  background: "radial-gradient(circle at 8% 0%, rgba(255,107,53,.20), transparent 32%), radial-gradient(circle at 92% 0%, rgba(32,227,178,.16), transparent 32%), linear-gradient(135deg,#08090b,#17120e)",
  color: "#fffdf8",
  border: "1px solid rgba(255,255,255,.12)",
  boxShadow: "0 18px 48px rgba(23,18,14,.22)",
  display: "grid",
  gap: 14,
};

const statusPill = {
  width: "fit-content",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  borderRadius: 999,
  padding: "7px 10px",
  background: "rgba(32,227,178,.14)",
  color: "#20e3b2",
  fontWeight: 900,
  fontSize: 12,
};

const eyebrow = {
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#20e3b2",
  fontWeight: 950,
  fontSize: 11,
  letterSpacing: ".15em",
};

const title = {
  margin: "8px 0 0",
  fontSize: "clamp(32px,6vw,58px)",
  lineHeight: .92,
  letterSpacing: "-.07em",
};

const subtitle = {
  margin: "10px 0 0",
  color: "rgba(255,253,248,.72)",
  maxWidth: 760,
  fontWeight: 650,
};

const actions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: 10,
};

const actionCard = {
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 22,
  background: "rgba(255,253,248,.08)",
  padding: 13,
  display: "grid",
  gap: 5,
};

const checkRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const checkBtn = {
  border: 0,
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 900,
  fontSize: 12,
};
