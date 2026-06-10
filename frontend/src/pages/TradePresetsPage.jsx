// CHURVOX_TRADE_PRESETS_PAGE_20260528
// CHURVOX_TRADE_PRESETS_ACTIVE_WORKFLOW_20260528
// CHURVOX_TRADE_PRESETS_HOOK_NAME_FIX_20260528
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTradePresets } from "../concept-c/churvoxTopTierApi";
import "./TradePresetsPage.css";

const fallbackPresets = [
  { id: "lawn_care", name: "Lawn Care", job_types: ["Mow", "Edge", "Hedge trim", "Spray weeds"], invoice_line: "Lawn and grounds maintenance completed." },
  { id: "cleaning", name: "Cleaning", job_types: ["General clean", "Deep clean", "Window clean", "End of tenancy"], invoice_line: "Cleaning service completed." },
  { id: "handyman", name: "Handyman", job_types: ["Repair", "Install", "Maintenance", "Inspection"], invoice_line: "Handyman maintenance work completed." },
  { id: "landscaping", name: "Landscaping", job_types: ["Planting", "Mulch", "Garden tidy", "Soft landscaping"], invoice_line: "Landscaping work completed." },
  { id: "plumbing", name: "Plumbing", job_types: ["Repair", "Inspection", "Install", "Maintenance"], invoice_line: "Plumbing work completed." },
  { id: "electrical", name: "Electrical", job_types: ["Repair", "Install", "Inspection", "Maintenance"], invoice_line: "Electrical work completed." },
  { id: "pest_control", name: "Pest Control", job_types: ["Treatment", "Inspection", "Follow-up", "Prevention"], invoice_line: "Pest control service completed." },
];

function readActivePreset() {
  try {
    return JSON.parse(localStorage.getItem("churvox_active_trade_preset") || "null");
  } catch {
    return null;
  }
}

function saveActivePreset(preset) {
  try {
    localStorage.setItem("churvox_active_trade_preset", JSON.stringify(preset));
  } catch {}
}

export default function TradePresetsPage() {
  const [state, setState] = useState({ loading: true, presets: fallbackPresets, error: "" });
  const [activePreset, setActivePreset] = useState(() => readActivePreset());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const data = await getTradePresets();
        if (!alive) return;
        setState({
          loading: false,
          presets: data.presets?.length ? data.presets : fallbackPresets,
          error: "",
        });
      } catch (err) {
        if (!alive) return;
        setState({
          loading: false,
          presets: fallbackPresets,
          error: err?.message || "",
        });
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  function applyPreset(preset) {
    saveActivePreset(preset);
    setActivePreset(preset);
    setNotice(`${preset.name} is now your active trade preset on this device.`);
  }

  async function copyInvoiceLine(preset) {
    try {
      await navigator.clipboard.writeText(preset.invoice_line || "");
      setNotice(`Copied invoice wording for ${preset.name}.`);
    } catch {
      setNotice(preset.invoice_line || "Invoice wording unavailable.");
    }
  }

  return (
    <main className="ctp-shell" data-version="CHURVOX_TRADE_PRESETS_PAGE_20260528 CHURVOX_TRADE_PRESETS_ACTIVE_WORKFLOW_20260528 CHURVOX_TRADE_PRESETS_HOOK_NAME_FIX_20260528">
      <section className="ctp-hero">
        <div>
          <p>TRADE PRESETS</p>
          <h1>Set Churvox up for the work you actually do.</h1>
          <span>
            Presets shape job types, invoice wording, customer messages and AI Operator suggestions for each trade.
          </span>
        </div>
        
      </section>

      {notice ? <section className="ctp-notice">{notice}</section> : null}

      <section className="ctp-active-panel">
        <div>
          <small>How this helps</small>
          <h2>Pick a trade so Churvox can speak the right language.</h2>
          <p>Use the active preset for job types, invoice wording and customer message drafts while the deeper setup is wired into account settings later.</p>
        </div>
        <Link to="/jobs/new">Create job</Link>
      </section>

      <section className="ctp-grid">
        {state.presets.map((preset) => {
          const active = activePreset?.id === preset.id || activePreset?.name === preset.name;
          return (
            <article key={preset.id || preset.name} className={`ctp-card ${active ? "active" : ""}`}>
              <small>{active ? "active preset" : preset.id || "trade"}</small>
              <h2>{preset.name}</h2>
              <p>{preset.invoice_line}</p>
              <div className="ctp-tags">
                {(preset.job_types || []).map((type) => (
                  <span key={type}>{type}</span>
                ))}
              </div>
              <div className="ctp-actions">
                <button type="button" onClick={() => applyPreset(preset)}>{active ? "Active" : "Use preset"}</button>
                <button type="button" onClick={() => copyInvoiceLine(preset)}>Copy invoice wording</button>
                <Link to="/jobs/new">Start job</Link>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="ctp-footer">
        <Link to="/dashboard">Back to Command Floor</Link>
        <Link to="/operator-tools">Open AI Operator tools</Link>
      </footer>
    </main>
  );
}
