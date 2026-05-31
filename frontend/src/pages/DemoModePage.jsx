import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { DatabaseZap, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import "./DemoModePage.css";

const arr = (v) => Array.isArray(v) ? v : [];

export default function DemoModePage() {
  const api = useApi();
  const [demo, setDemo] = useState({});
  const [busy, setBusy] = useState("");

  async function loadDemo() {
    const res = await api.get("/demo/status");
    if (res.success) setDemo(res.data?.demo || {});
    else toast.error(res.error || "Could not load demo status");
  }

  useEffect(() => { loadDemo(); }, []);

  async function seedDemo() {
    setBusy("seed");
    const res = await api.post("/demo/seed", {});
    setBusy("");
    if (res.success) {
      toast.success("Demo data ready");
      await loadDemo();
    } else toast.error(res.error || "Could not seed demo data");
  }

  async function clearDemo() {
    if (!window.confirm("Clear demo records only? Real records are not touched.")) return;
    setBusy("clear");
    const res = await api.post("/demo/clear", {});
    setBusy("");
    if (res.success) {
      toast.success("Demo records cleared");
      await loadDemo();
    } else toast.error(res.error || "Could not clear demo data");
  }

  const counts = demo.counts || {};
  const cards = [
    ["Clients", counts.clients || 0, "/clients"],
    ["Jobs", counts.jobs || 0, "/jobs"],
    ["Quotes", counts.quotes || 0, "/quotes"],
    ["Invoices", counts.invoices || 0, "/invoices"],
    ["AI Actions", counts.ai_actions || 0, "/ai-operator"],
    ["Notifications", counts.notifications || 0, "/notifications"],
  ];

  return (
    <PremiumPage maxWidth={1120}>
      <PremiumHero
        eyebrow="Demo mode"
        title="Create a clean sample business in one tap."
        subtitle="Use demo data for screenshots, sales demos, workflow testing and showing Churvox without touching real customer records."
        icon={<DatabaseZap className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadDemo}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-demo-actions">
        <div>
          <span>Status</span>
          <b>{demo.seeded ? "Demo data is ready" : "No demo data yet"}</b>
          <small>Demo records are marked demo_record=true.</small>
        </div>
        <button type="button" onClick={seedDemo} disabled={busy === "seed"}><DatabaseZap size={16} /> Create / refresh demo data</button>
        <button type="button" className="danger" onClick={clearDemo} disabled={busy === "clear"}><Trash2 size={16} /> Clear demo only</button>
      </section>

      <section className="cv-demo-grid">
        {cards.map(([label, count, href]) => (
          <PremiumCard key={label}>
            <Link className="cv-demo-card" to={href}>
              <span>{label}</span>
              <b>{count}</b>
              <small>Open {label.toLowerCase()}</small>
            </Link>
          </PremiumCard>
        ))}
      </section>

      <PremiumCard title="Best demo path">
        <div className="cv-demo-path">
          {arr(["Clients", "Quotes", "Jobs", "Worker/Crew", "Invoices", "Money Desk", "AI Operator", "Reports"]).map((step, index) => (
            <div key={step}><b>{index + 1}</b><span>{step}</span></div>
          ))}
        </div>
      </PremiumCard>
    </PremiumPage>
  );
}
