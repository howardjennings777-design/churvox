
import { useState } from "react";
import "../pages/FirstLoginGuide.css";

const setupByIndustry = {
  "Lawn care": ["Import clients", "Add workers", "Create recurring lawn jobs", "Try Proof-to-Paid", "Review AI Work Queue"],
  "Property maintenance": ["Import landlords/properties", "Add workers", "Create first maintenance job", "Upload proof photos", "Create draft invoice"],
  Cleaning: ["Import clients", "Add cleaners", "Create recurring cleaning jobs", "Capture completion notes", "Review invoice actions"],
  Landscaping: ["Add clients", "Add crew", "Create first project job", "Track proof photos", "Prepare quote follow-up"],
  Handyman: ["Add clients", "Add workers", "Create first repair job", "Capture notes/photos", "Prepare invoice"],
  Other: ["Add clients", "Add team", "Create first job", "Try AI Work Queue", "Prepare first invoice"],
};

export default function FirstLoginGuide({ onNav, onCreate }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem("churvox_show_first_login_guide") === "true" && localStorage.getItem("churvox_first_login_guide_done") !== "true"; } catch { return false; }
  });
  if (!open) return null;
  const industry = localStorage.getItem("churvox_industry") || "Other";
  const steps = setupByIndustry[industry] || setupByIndustry.Other;
  function done() {
    try { localStorage.setItem("churvox_first_login_guide_done", "true"); localStorage.removeItem("churvox_show_first_login_guide"); } catch {}
    setOpen(false);
  }
  return (
    <div className="firstguide-backdrop">
      <section className="firstguide-modal">
        <button className="firstguide-close" onClick={done}>×</button>
        <p>FIRST LOGIN SETUP</p>
        <h2>Let’s shape Churvox around your {industry.toLowerCase()} business.</h2>
        <span>Start with the basics. Churvox works best once clients, workers and the first jobs are in place.</span>
        <div className="firstguide-steps">{steps.map((step, index) => <article key={step}><b>{index + 1}</b><strong>{step}</strong></article>)}</div>
        <footer><button onClick={() => { onCreate?.("client"); done(); }}>Add client</button><button onClick={() => { onCreate?.("job"); done(); }}>Create job</button><button onClick={() => { onNav?.("queue"); done(); }}>Open AI Work Queue</button><button className="secondary" onClick={done}>Skip for now</button></footer>
      </section>
    </div>
  );
}
