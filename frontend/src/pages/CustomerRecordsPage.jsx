import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  industrialAction,
  industrialChip,
  industrialContentLane,
  industrialGhost,
  industrialPageShell,
} from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["clients", "customers", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(client) {
  const raw = client?.id || client?._id || client?.client_id || client?.customer_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}

function nameOf(client) {
  return first(client?.name, client?.full_name, client?.client_name, client?.customer_name, client?.company_name, client?.business_name, "Unnamed client");
}

function emailOf(client) {
  return first(client?.email, client?.email_address, client?.contact_email, "No email saved");
}

function phoneOf(client) {
  return first(client?.phone, client?.mobile, client?.phone_number, client?.contact_phone, "No phone saved");
}

function addressOf(client) {
  return first(client?.address, client?.site_address, client?.street_address, client?.billing_address, client?.property_address, "No address saved");
}

function statusOf(client) {
  return String(first(client?.status, client?.client_status, client?.type, "ready")).replaceAll("_", " ");
}

function rawStatus(client) {
  return String(first(client?.status, client?.client_status, client?.type, "ready")).toLowerCase();
}

function hasReal(value, emptyLabel) {
  return Boolean(value && value !== emptyLabel);
}

function detailsFor(client) {
  return {
    Name: nameOf(client),
    Email: emailOf(client),
    Phone: phoneOf(client),
    Address: addressOf(client),
    Status: statusOf(client),
    Notes: first(client?.notes, client?.description, client?.customer_notes, "No notes saved"),
  };
}

function statusClass(client) {
  const status = rawStatus(client);
  if (status.includes("inactive") || status.includes("archiv")) return "bg-slate-300 text-slate-950";
  if (status.includes("overdue") || status.includes("problem")) return "bg-red-300 text-slate-950";
  if (status.includes("vip") || status.includes("priority")) return "bg-amber-300 text-slate-950";
  return "bg-emerald-300 text-slate-950";
}

function SecurityTape({ color = "#22d3ee" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.30) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 18px ${color}66` }} />;
}

function MetricCard({ label, value, text, color }) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}>
      <SecurityTape color={color} />
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div>
      <div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div>
      <div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div>
    </div>
  );
}

function ClientSlip({ client, mode, approved, onClose, onApprove, onMode }) {
  const [draft, setDraft] = React.useState("");
  const details = React.useMemo(() => detailsFor(client || {}), [client]);

  React.useEffect(() => {
    if (!client) return;
    const detailText = Object.entries(details).map(([key, value]) => `${key}: ${value}`).join("\n");
    setDraft(`${nameOf(client)}\n${detailText}`.trim());
  }, [client, details]);

  if (!client) return null;
  const clientId = idOf(client);
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div>
            <div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Client slip</div>
            <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{nameOf(client)}</h2>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{phoneOf(client)} · {emailOf(client)} · {statusOf(client)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </header>

        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review this exact client</div>
            {isEdit ? (
              <>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-4 min-h-[330px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm font-bold leading-6 text-white outline-none" />
                <button type="button" onClick={() => onMode("details")} className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Save edit in slip</button>
              </>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(details).map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
              </div>
            )}
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review the client here first. Approve or edit the slip, then open the full client record only when you need the full editor or history.</p>
            {approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. This client slip decision is recorded in this view.</div> : null}
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button>
              <button type="button" onClick={() => onMode("edit")} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Edit in slip</button>
              {clientId ? <Link to={`/clients/${clientId}`} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open full client page</Link> : null}
              {clientId ? <Link to={`/clients/${clientId}/workbench`} onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-center text-sm font-black text-white ring-1 ring-white/10">Open client workbench</Link> : null}
              <button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to clients</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ClientRow({ client, onOpen }) {
  const missingContact = !hasReal(emailOf(client), "No email saved") || !hasReal(phoneOf(client), "No phone saved");
  return (
    <button type="button" onClick={() => onOpen(client)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]">
      <SecurityTape color={missingContact ? "#fb923c" : "#22d3ee"} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{nameOf(client)}</h3>
          <p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{phoneOf(client)} · {emailOf(client)} · {addressOf(client)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(client)}`}>{missingContact ? "Needs contact" : statusOf(client)}</span>
      </div>
    </button>
  );
}

export default function CustomerRecordsPage() {
  const { get } = useApi();
  const [clients, setClients] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [mode, setMode] = React.useState("details");
  const [approvedIds, setApprovedIds] = React.useState({});

  React.useEffect(() => {
    let alive = true;
    async function loadClients() {
      try {
        setLoading(true);
        const res = await get("/clients");
        if (!alive) return;
        setClients(listFrom(res));
      } catch (error) {
        console.warn("Clients page load failed", error);
        if (alive) setClients([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadClients();
    return () => { alive = false; };
  }, [get]);

  const needsContact = clients.filter((client) => !hasReal(emailOf(client), "No email saved") || !hasReal(phoneOf(client), "No phone saved"));
  const missingAddress = clients.filter((client) => !hasReal(addressOf(client), "No address saved"));
  const archived = clients.filter((client) => rawStatus(client).includes("archiv") || rawStatus(client).includes("inactive"));
  const selectedId = selectedClient ? idOf(selectedClient) || nameOf(selectedClient) : "current";

  const openSlip = (client, nextMode = "details") => {
    setSelectedClient(client);
    setMode(nextMode);
  };

  return (
    <main className={industrialPageShell} data-industrial-simple-page="clients" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}>
          <SecurityTape color="#22d3ee" />
          <span className={industrialChip}>Clients</span>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Clients, contact details, and job history without the mess.</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Tap a client to open a full-screen slip. Use the full client page only when you need the complete record, notes, or history.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/clients/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Add client</Link>
            <Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total" value={clients.length} text="Client records in this business." color="#22d3ee" />
          <MetricCard label="Needs contact" value={needsContact.length} text="Missing phone or email details." color="#fb923c" />
          <MetricCard label="Needs address" value={missingAddress.length} text="Missing site or billing address." color="#facc15" />
          <MetricCard label="Inactive" value={archived.length} text="Archived or inactive client records." color="#a78bfa" />
        </section>

        <section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Client list</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a client to review it</h2>
            </div>
            {loading ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span> : <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{clients.length} clients</span>}
          </div>

          {clients.length ? (
            <div className="grid gap-3">
              {clients.map((client, index) => <ClientRow key={idOf(client) || `${nameOf(client)}-${index}`} client={client} onOpen={openSlip} />)}
            </div>
          ) : (
            <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
              <h3 className="text-2xl font-black tracking-[-0.05em] text-white">No clients showing yet.</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-300">Add the first client and Churvox will keep their contact details, jobs, quotes and invoices easier to review.</p>
              <Link to="/clients/new" className={`mt-4 inline-flex rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Add client</Link>
            </div>
          )}
        </section>
      </section>

      <ClientSlip
        client={selectedClient}
        mode={mode}
        approved={Boolean(approvedIds[selectedId])}
        onMode={setMode}
        onClose={() => setSelectedClient(null)}
        onApprove={() => setApprovedIds((prev) => ({ ...prev, [selectedId]: true }))}
      />
    </main>
  );
}
