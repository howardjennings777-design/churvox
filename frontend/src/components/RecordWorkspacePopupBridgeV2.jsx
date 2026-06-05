import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const TYPES = {
  jobs: { label: "Jobs", single: "Job", endpoint: "/jobs", color: "#fb923c" },
  invoices: { label: "Invoices", single: "Invoice", endpoint: "/invoices", color: "#34d399" },
  quotes: { label: "Quotes", single: "Quote", endpoint: "/quotes", color: "#22d3ee" },
  clients: { label: "Clients", single: "Client", endpoint: "/clients", color: "#facc15" },
  team: { label: "Crew", single: "Person", endpoint: "/team/workers", color: "#a78bfa" },
};

function listFrom(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  for (const key of ["jobs", "invoices", "quotes", "clients", "customers", "workers", "team", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function oneFrom(value, kind) {
  const data = value?.data ?? value;
  const single = kind === "invoices" ? "invoice" : kind === "quotes" ? "quote" : kind === "clients" ? "client" : kind === "jobs" ? "job" : "worker";
  return data?.[single] || data?.item || data?.record || data || {};
}

function idOf(item) {
  const raw = item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.client_id || item?.customer_id || item?.worker_id || item?.user_id || "";
  return typeof raw === "object" && raw?.$oid ? String(raw.$oid) : String(raw || "");
}

function titleOf(item, kind) {
  if (!item) return "Open record";
  if (kind === "invoices") return item.invoice_number || item.number || item.title || "Invoice";
  if (kind === "quotes") return item.quote_number || item.title || item.client_name || item.customer_name || "Quote";
  if (kind === "clients") return item.name || item.client_name || item.customer_name || item.company || "Client";
  if (kind === "team") return item.name || item.full_name || item.display_name || item.email || "Crew member";
  return item.title || item.job_name || item.client_name || item.customer_name || "Job";
}

function metaOf(item) {
  return [item?.client_name || item?.customer_name || item?.name, item?.email || item?.customer_email, item?.address || item?.site_address || item?.billing_address, item?.status || item?.role].filter(Boolean).join(" · ");
}

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n === 0) return "$0";
  return n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function targetFromPath(pathname) {
  const path = pathname || "";
  if (path === "/money-desk" || path === "/money") return { kind: "invoices", id: "" };
  if (path === "/crew-map") return { kind: "jobs", id: "" };
  const list = path.match(/^\/(jobs|invoices|quotes|clients|team)$/);
  if (list) return { kind: list[1], id: "" };
  const detail = path.match(/^\/(jobs|invoices|quotes|clients)\/([^/]+)(\/edit)?$/);
  if (!detail || detail[2] === "new") return null;
  return { kind: detail[1], id: decodeURIComponent(detail[2]), edit: Boolean(detail[3]) };
}

function fieldsFor(kind, record) {
  const defaults = {
    jobs: ["title", "job_name", "client_name", "customer_name", "status", "address", "site_address", "scheduled_date", "scheduled_at", "description", "notes", "worker_notes", "fixed_price", "price", "hourly_rate"],
    invoices: ["invoice_number", "customer_name", "customer_email", "customer_phone", "status", "billing_address", "site_address", "description", "due_date", "payment_terms", "subtotal", "gst_amount", "total", "amount_due", "amount_paid", "notes", "internal_notes"],
    quotes: ["quote_number", "title", "client_name", "customer_name", "customer_email", "status", "address", "site_address", "description", "notes", "price", "subtotal", "total"],
    clients: ["name", "client_name", "customer_name", "company", "email", "phone", "address", "site_address", "billing_address", "notes"],
    team: ["name", "full_name", "display_name", "email", "phone", "role", "status", "notes"],
  };
  const existing = Object.keys(record || {}).filter((key) => ["string", "number", "boolean"].includes(typeof record[key]));
  return Array.from(new Set([...(defaults[kind] || []), ...existing])).filter((key) => !key.startsWith("_") && !["id", "business_id", "user_id", "owner_id", "created_at", "updated_at"].includes(key));
}

function Field({ name, value, onChange }) {
  const text = value == null ? "" : String(value);
  const long = text.length > 70 || /notes|description|address|message/i.test(name);
  return (
    <label className="cv-popup-field">
      <span>{name.replaceAll("_", " ")}</span>
      {long ? <textarea value={text} onChange={(e) => onChange(name, e.target.value)} rows={4} /> : <input value={text} onChange={(e) => onChange(name, e.target.value)} />}
    </label>
  );
}

function Info({ label, value }) {
  if (value == null || value === "") return null;
  const display = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  return <div className="cv-popup-info-row"><span>{label.replaceAll("_", " ")}</span><strong>{display}</strong></div>;
}

export default function RecordWorkspacePopupBridgeV2() {
  const api = useApi();
  const [popup, setPopup] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [record, setRecord] = React.useState(null);
  const [draft, setDraft] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const onClick = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const el = event.target instanceof Element ? event.target : event.target?.parentElement;
      const anchor = el?.closest?.("a[href]");
      if (!anchor || anchor.closest?.(".cv-record-popup")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.getAttribute("href") || anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      const target = targetFromPath(url.pathname);
      if (!target || !TYPES[target.kind]) return;
      event.preventDefault();
      event.stopPropagation();
      setPopup(target);
      setEditing(Boolean(target.edit));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  React.useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const type = popup ? TYPES[popup.kind] : null;

  const close = React.useCallback(() => {
    setPopup(null);
    setItems([]);
    setRecord(null);
    setDraft({});
    setEditing(false);
  }, []);

  React.useEffect(() => {
    if (!popup || !type) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [popup, type]);

  const loadList = React.useCallback(async () => {
    if (!popup || !type) return;
    setLoading(true);
    const res = await api.get(type.endpoint);
    setItems(res?.success ? listFrom(res) : []);
    setLoading(false);
  }, [api, popup, type]);

  const loadRecord = React.useCallback(async (id) => {
    if (!popup || !type || !id) return;
    setLoading(true);
    const res = await api.get(`${type.endpoint}/${encodeURIComponent(id)}`);
    if (res?.success) {
      const next = oneFrom(res, popup.kind);
      setRecord(next);
      setDraft(next || {});
    } else {
      toast.error(res?.error || `Could not load ${type.single.toLowerCase()}`);
    }
    setLoading(false);
  }, [api, popup, type]);

  React.useEffect(() => {
    if (!popup) return;
    setRecord(null);
    setDraft({});
    if (popup.id) loadRecord(popup.id);
    else loadList();
  }, [popup, loadList, loadRecord]);

  if (!popup || !type) return null;

  const openRecord = (item) => {
    const id = idOf(item);
    if (!id) return toast.error("No record ID found");
    setPopup({ kind: popup.kind, id });
  };

  const backToList = () => {
    setPopup({ kind: popup.kind, id: "" });
    setEditing(false);
  };

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  async function saveRecord() {
    if (!popup.id) return;
    setSaving(true);
    const payload = {};
    fieldsFor(popup.kind, draft).forEach((key) => {
      if (draft[key] !== record?.[key]) payload[key] = draft[key];
    });
    payload.updated_at = new Date().toISOString();
    const res = await api.patch(`${type.endpoint}/${encodeURIComponent(popup.id)}`, payload);
    setSaving(false);
    if (!res?.success) return toast.error(res?.error || "Could not save changes");
    toast.success(`${type.single} saved`);
    setEditing(false);
    await loadRecord(popup.id);
  }

  const detail = record || {};
  const fields = fieldsFor(popup.kind, draft);

  return (
    <div className="cv-record-popup" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="cv-record-popup-shell">
        <header className="cv-record-popup-header">
          <div>
            <p>{popup.id ? type.single : type.label}</p>
            <h1>{popup.id ? titleOf(record || {}, popup.kind) : `${type.label} workspace`}</h1>
            <span>{popup.id ? "View, edit and save this record without leaving Command." : "Open a record below. It stays in this pop-up."}</span>
          </div>
          <div className="cv-record-popup-actions">
            {popup.id ? <button type="button" onClick={backToList}>Back to list</button> : null}
            {popup.id ? <button type="button" onClick={() => setEditing((v) => !v)}>{editing ? "View" : "Edit"}</button> : null}
            {editing && popup.id ? <button type="button" className="primary" onClick={saveRecord} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button> : null}
            <button type="button" className="close" onClick={close}>Close</button>
          </div>
        </header>

        <section className="cv-record-popup-body">
          {loading ? <div className="cv-popup-empty">Loading…</div> : null}

          {!loading && !popup.id ? (
            <div className="cv-popup-list">
              {items.length ? items.map((item, index) => (
                <button type="button" key={idOf(item) || index} className="cv-popup-list-card" onClick={() => openRecord(item)}>
                  <span style={{ background: type.color }} />
                  <b>{titleOf(item, popup.kind)}</b>
                  <small>{metaOf(item) || "Open full record"}</small>
                  <em>{item.status || item.role || "ready"}</em>
                </button>
              )) : <div className="cv-popup-empty">No records found yet.</div>}
            </div>
          ) : null}

          {!loading && popup.id && record ? (
            <div className="cv-popup-detail-grid">
              <section className="cv-popup-main-card">
                <div className="cv-popup-strip" style={{ background: type.color }} />
                {editing ? (
                  <div className="cv-popup-fields">{fields.map((field) => <Field key={field} name={field} value={draft[field]} onChange={setField} />)}</div>
                ) : (
                  <>
                    <div className="cv-popup-summary">
                      <div><span>Status</span><strong>{detail.status || detail.job_status || detail.invoice_status || detail.quote_status || "ready"}</strong></div>
                      <div><span>Client</span><strong>{detail.client_name || detail.customer_name || detail.name || "Not saved"}</strong></div>
                      <div><span>Total</span><strong>{money(detail.total || detail.amount || detail.price || detail.fixed_price)}</strong></div>
                      <div><span>Address</span><strong>{detail.site_address || detail.address || detail.billing_address || "Not saved"}</strong></div>
                    </div>
                    <div className="cv-popup-all-fields">{Object.keys(detail).sort().map((key) => <Info key={key} label={key} value={detail[key]} />)}</div>
                  </>
                )}
              </section>
              <aside className="cv-popup-side-card">
                <h2>Actions</h2>
                <button type="button" onClick={() => setEditing(true)}>Edit this record</button>
                <button type="button" onClick={saveRecord} disabled={!editing || saving}>Save changes</button>
                <button type="button" onClick={backToList}>Open another {type.single.toLowerCase()}</button>
                <p>All details stay in this pop-up so you do not lose your place on Command.</p>
              </aside>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
