import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./settingsHubPage.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

const DEFAULT_AI = {
  mode: "full_approval",
  assignWorkers: true,
  draftInvoices: true,
  smsDrafts: true,
  smsSendRequiresApproval: true,
  quoteFollowups: true,
  jobConfirmations: true,
  adminNotes: true,
};

function readToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const t = readToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  return payload;
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readBusinessSettings() {
  return {
    owner_name: localStorage.getItem("churvox_owner_name") || "",
    business_name: localStorage.getItem("churvox_business_name") || "",
    email: localStorage.getItem("churvox_business_email") || "",
    phone: localStorage.getItem("churvox_business_phone") || "",
    industry: localStorage.getItem("churvox_business_industry") || "",
    address: localStorage.getItem("churvox_business_address") || "",
  };
}

function saveBusinessSettings(form) {
  localStorage.setItem("churvox_owner_name", form.owner_name || "Owner");
  localStorage.setItem("churvox_business_name", form.business_name || "");
  localStorage.setItem("churvox_business_email", form.email || "");
  localStorage.setItem("churvox_business_phone", form.phone || "");
  localStorage.setItem("churvox_business_industry", form.industry || "");
  localStorage.setItem("churvox_business_address", form.address || "");
}

function resetGuide() {
  localStorage.removeItem("churvox_ai_setup_guide_hidden");
  localStorage.removeItem("churvox_onboarding_done");
}

function SettingCard({ title, text, badge, children, action }) {
  return (
    <article className="settings-card">
      <header>
        <div>
          {badge ? <span>{badge}</span> : null}
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        {action}
      </header>
      {children}
    </article>
  );
}

export default function SettingsHubPage() {
  const [business, setBusiness] = useState(readBusinessSettings);
  const [ai, setAi] = useState(() => ({ ...DEFAULT_AI, ...readJson("churvox_ai_operator_settings", {}) }));
  const [active, setActive] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const aiModeLabel = useMemo(() => {
    if (ai.mode === "observe") return "Watch only";
    if (ai.mode === "drafts") return "Draft helper";
    return "Full helper";
  }, [ai.mode]);

  useEffect(() => {
    writeJson("churvox_ai_operator_settings", ai);
  }, [ai]);

  function updateBusiness(field, value) {
    setBusiness((current) => ({ ...current, [field]: value }));
  }

  async function saveBusiness() {
    setBusy("business");
    setNotice("");

    saveBusinessSettings(business);

    let backendSaved = false;
    for (const path of ["/settings/business", "/business/settings", "/auth/profile", "/users/me"]) {
      try {
        await api(path, { method: path === "/users/me" ? "PATCH" : "POST", body: business });
        backendSaved = true;
        break;
      } catch {}
    }

    setBusy("");
    setNotice(backendSaved ? "Business settings saved." : "Business settings saved on this device. Backend settings endpoint is not active yet.");
    setActive("");
  }

  function saveAiNow() {
    writeJson("churvox_ai_operator_settings", ai);
    setNotice("AI control settings saved.");
  }

  function clearLocalSetup() {
    resetGuide();
    setNotice("Setup guide reset. The AI help bubble will appear again.");
  }

  function downloadTemplate(type) {
    const rows =
      type === "clients"
        ? [
            ["client_name", "contact_name", "email", "phone", "address", "notes"],
            ["ABC Property", "Sarah", "sarah@example.com", "021123456", "12 Main St", "Gate code 1234"],
          ]
        : [
            ["name", "email", "phone", "role", "region", "skills", "notes"],
            ["Wiremu", "worker@example.com", "021123456", "worker", "Naenae", "Mowing, hedges", "Available weekdays"],
          ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "clients" ? "churvox-clients-template.csv" : "churvox-workers-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="settings-page">
      <section className="settings-hero">
        <div>
          <p>SETTINGS HUB</p>
          <h1>Control how Churvox runs your business.</h1>
          <span>
            These cards are working controls: business setup, AI control level, imports,
            setup help, SMS status and MYOB/accounting setup.
          </span>
        </div>
        <Link to="/onboarding">Open setup guide</Link>
      </section>

      {notice ? <section className="settings-notice">{notice}</section> : null}

      <section className="settings-grid">
        <SettingCard
          badge="BUSINESS"
          title="Business profile"
          text="Set your business details so invoices, SMS, setup help and AI drafts use the right information."
          action={<button type="button" onClick={() => setActive("business")}>Edit</button>}
        >
          <dl>
            <div><dt>Business</dt><dd>{business.business_name || "Not set"}</dd></div>
            <div><dt>Owner</dt><dd>{business.owner_name || "Owner"}</dd></div>
            <div><dt>Industry</dt><dd>{business.industry || "Not set"}</dd></div>
          </dl>
        </SettingCard>

        <SettingCard
          badge="AI"
          title="AI control level"
          text="Choose how much work AI prepares before the owner approves."
          action={<Link to="/ai-approvals">Open queue</Link>}
        >
          <div className="settings-mode-buttons">
            {[
              ["observe", "Watch only"],
              ["drafts", "Draft helper"],
              ["full_approval", "Full helper"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={ai.mode === value ? "active" : ""}
                onClick={() => setAi((current) => ({ ...current, mode: value }))}
              >
                {label}
              </button>
            ))}
          </div>
          <small>Current mode: {aiModeLabel}</small>
          <button type="button" className="settings-save" onClick={saveAiNow}>Save AI settings</button>
        </SettingCard>

        <SettingCard
          badge="IMPORTS"
          title="Client and worker CSV"
          text="Upload customers and workers fast so AI has real records to work with."
          action={<Link to="/import">Open Import Centre</Link>}
        >
          <div className="settings-actions">
            <button type="button" onClick={() => downloadTemplate("clients")}>Client template</button>
            <button type="button" onClick={() => downloadTemplate("workers")}>Worker template</button>
          </div>
        </SettingCard>

        <SettingCard
          badge="GUIDE"
          title="AI setup help"
          text="Reset the help bubble and onboarding checklist so owners get guided through what to do next."
          action={<button type="button" onClick={clearLocalSetup}>Reset guide</button>}
        >
          <p className="settings-muted">The AI help bubble appears around the app and points owners to the next useful step.</p>
        </SettingCard>

        <SettingCard
          badge="SMS"
          title="Customer SMS"
          text="SMS is approval-first. AI can draft messages, but sending should stay owner-approved."
          action={<Link to="/ai-approvals">Review SMS drafts</Link>}
        >
          <label className="settings-check">
            <input
              type="checkbox"
              checked={!!ai.smsDrafts}
              onChange={(event) => setAi((current) => ({ ...current, smsDrafts: event.target.checked }))}
            />
            <span>Allow AI to write SMS drafts</span>
          </label>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={!!ai.smsSendRequiresApproval}
              onChange={(event) => setAi((current) => ({ ...current, smsSendRequiresApproval: event.target.checked }))}
            />
            <span>Show owner-approved send button</span>
          </label>
        </SettingCard>

        <SettingCard
          badge="ACCOUNTING"
          title="MYOB and invoicing"
          text="Keep MYOB/accounting setup separate from daily job work so owners know what is connected."
          action={<Link to="/invoices">Open invoices</Link>}
        >
          <p className="settings-muted">Pro: optional MYOB add-on. Enterprise: MYOB included by default.</p>
          <Link className="settings-secondary-link" to="/proof-to-paid">Open Proof-to-Paid</Link>
        </SettingCard>
      </section>

      {active === "business" ? (
        <div className="settings-modal-backdrop" onClick={() => !busy && setActive("")}>
          <section className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>BUSINESS PROFILE</p>
                <h2>Edit business details</h2>
                <span>These details are saved for owner setup, drafts and future invoice/SMS defaults.</span>
              </div>
              <button type="button" onClick={() => setActive("")} disabled={!!busy}>×</button>
            </header>

            <div className="settings-form">
              <label>
                Business name
                <input value={business.business_name} onChange={(e) => updateBusiness("business_name", e.target.value)} />
              </label>
              <label>
                Owner name
                <input value={business.owner_name} onChange={(e) => updateBusiness("owner_name", e.target.value)} />
              </label>
              <label>
                Business email
                <input type="email" value={business.email} onChange={(e) => updateBusiness("email", e.target.value)} />
              </label>
              <label>
                Business phone
                <input value={business.phone} onChange={(e) => updateBusiness("phone", e.target.value)} />
              </label>
              <label>
                Industry
                <select value={business.industry} onChange={(e) => updateBusiness("industry", e.target.value)}>
                  <option value="">Choose industry</option>
                  <option value="Lawn Care">Lawn Care</option>
                  <option value="Landscaping">Landscaping</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Handyman">Handyman</option>
                  <option value="Painting">Painting</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Pest Control">Pest Control</option>
                  <option value="Gardening">Gardening</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                Business address
                <textarea value={business.address} onChange={(e) => updateBusiness("address", e.target.value)} />
              </label>
            </div>

            <footer>
              <button type="button" onClick={() => setActive("")} disabled={!!busy}>Cancel</button>
              <button className="primary" type="button" onClick={saveBusiness} disabled={busy === "business"}>
                {busy === "business" ? "Saving..." : "Save business settings"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
