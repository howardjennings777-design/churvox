import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Megaphone } from "lucide-react";
import "./LaunchSalesPolishPage.css";

const arr = (v) => Array.isArray(v) ? v : [];

export default function LaunchSalesPolishPage() {
  const api = useApi();
  const [sales, setSales] = useState({});
  useEffect(() => { api.get("/launch/sales-polish").then((res) => { if (res.success) setSales(res.data?.sales || {}); }); }, []);

  return (
    <PremiumPage maxWidth={1120}>
      <PremiumHero eyebrow="Sales polish" title={sales.headline || "Churvox does the admin. You approve."} subtitle={sales.subheadline || "AI Operator for trade and service businesses."} icon={<Megaphone className="h-6 w-6" />} />
      <section className="cv-sales-hero">
        <div>
          <span>Launch message</span>
          <h2>Stop selling features. Sell the outcome.</h2>
          <p>Owners should instantly understand that Churvox turns messy work into prepared admin actions.</p>
          <div><Link to="/pricing">View pricing</Link><Link to="/signup">Start</Link></div>
        </div>
      </section>
      <section className="cv-sales-grid">
        {arr(sales.homepage_sections).map((section) => <PremiumCard key={section.title}><h3>{section.title}</h3><p>{section.copy}</p></PremiumCard>)}
      </section>
      <section className="cv-sales-grid">
        <PremiumCard title="Who it is for"><div className="cv-sales-tags">{arr(sales.who_for).map((x) => <span key={x}>{x}</span>)}</div></PremiumCard>
        <PremiumCard title="Proof points"><ul>{arr(sales.proof_points).map((x) => <li key={x}>{x}</li>)}</ul></PremiumCard>
      </section>
    </PremiumPage>
  );
}
