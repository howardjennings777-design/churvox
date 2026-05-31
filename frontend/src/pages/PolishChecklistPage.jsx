import React, { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Paintbrush, RefreshCw } from "lucide-react";
import "./PolishChecklistPage.css";

const arr = (v) => Array.isArray(v) ? v : [];

export default function PolishChecklistPage() {
  const api = useApi();
  const [polish, setPolish] = useState({});
  async function load() { const res = await api.get("/launch/polish-checklist"); if (res.success) setPolish(res.data?.polish || {}); }
  useEffect(() => { load(); }, []);
  return (
    <PremiumPage maxWidth={1050}>
      <PremiumHero eyebrow="Polish checklist" title="The last 10% that makes it feel top-tier." subtitle="Mobile, warnings, empty states, errors, trust, sales demo and UX polish." icon={<Paintbrush className="h-6 w-6" />} actions={<PremiumButton variant="secondary" onClick={load}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>} />
      <section className="cv-polish-list">
        {arr(polish.items).map((item) => <PremiumCard key={`${item.area}-${item.item}`}><div className="cv-polish-row"><b>{item.area}</b><div><h3>{item.item}</h3><span>{item.status}</span></div></div></PremiumCard>)}
      </section>
    </PremiumPage>
  );
}
