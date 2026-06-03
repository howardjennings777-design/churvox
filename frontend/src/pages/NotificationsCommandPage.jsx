import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const sampleNotifications = [
  { id: "sample-n1", title: "Job completed", message: "Mike completed Lawn service. Photos are ready for owner review.", type: "job", priority: "high", read: false, link: "/jobs" },
  { id: "sample-n2", title: "Invoice ready", message: "A completed job is ready to become a draft invoice.", type: "invoice", priority: "high", read: false, link: "/invoices" },
  { id: "sample-n3", title: "Quote follow-up", message: "A sent quote has been quiet and may need a polite nudge.", type: "quote", priority: "medium", read: false, link: "/quotes" },
  { id: "sample-n4", title: "Payroll review", message: "Some worker hours are pending review before payroll handoff.", type: "payroll", priority: "medium", read: true, link: "/payroll" },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/notifications") return pathname === "/notifications" || pathname.startsWith("/notifications/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.notifications?.items)) return data.notifications.items;
  return [];
}

function idOf(value) {
  const raw = value?.id || value?._id || value?.notification_id || "";
  if (typeof raw === "object" && raw?.$oid) return raw.$oid;
  return String(raw || "");
}

function titleOf(item) {
  return item?.title || item?.subject || item?.heading || item?.type || "Notification";
}

function messageOf(item) {
  return item?.message || item?.body || item?.description || item?.text || "No message saved.";
}

function typeOf(item) {
  return String(item?.type || item?.category || "alert").toLowerCase().replaceAll(" ", "_");
}

function priorityOf(item) {
  return String(item?.priority || item?.severity || (item?.read ? "normal" : "medium")).toLowerCase();
}

function isUnread(item) {
  return item?.read === false || item?.is_read === false || item?.status === "unread" || !item?.read_at;
}

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function linkFor(item) {
  const raw = item?.link || item?.url || item?.href || item?.target_url || "";
  if (raw && String(raw).startsWith("/")) return raw;
  const type = typeOf(item);
  if (type.includes("job")) return "/jobs";
  if (type.includes("invoice")) return "/invoices";
  if (type.includes("quote")) return "/quotes";
  if (type.includes("payroll")) return "/payroll";
  if (type.includes("team") || type.includes("worker")) return "/team";
  return "/dashboard";
}

function priorityStyle(item) {
  const priority = priorityOf(item);
  if (["urgent", "high", "critical"].includes(priority)) return "border-red-200 bg-red-50 text-red-800";
  if (["medium", "warning"].includes(priority)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (!isUnread(item)) return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
        <div><div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div></div>
      </div>
      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function NotificationCard({ item, onOpen, onRead, busy }) {
  const unread = isUnread(item);
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{pretty(typeOf(item))}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{titleOf(item)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${priorityStyle(item)}`}>{unread ? pretty(priorityOf(item)) : "Read"}</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{messageOf(item)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(item)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Review slip</button>
        <Link to={linkFor(item)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open place</Link>
        {unread && !idOf(item).startsWith("sample-") ? <button type="button" disabled={busy === idOf(item)} onClick={() => onRead(item)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-60">Mark read</button> : null}
      </div>
    </article>
  );
}

function NotificationSlip({ item, onClose, onRead, busy }) {
  if (!item) return null;
  const unread = isUnread(item);
  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[680px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Notification Work Slip</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{titleOf(item)}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{pretty(typeOf(item))} · {unread ? "Unread" : "Read"}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What needs attention</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">{messageOf(item)}</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Open the related place, review the work, then mark this notification read when it is handled.</div>
          </section>
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          <Link to={linkFor(item)} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open place</Link>
          {unread && !idOf(item).startsWith("sample-") ? <button type="button" disabled={busy === idOf(item)} onClick={() => onRead(item)} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-60">Mark read</button> : null}
        </footer>
      </div>
    </div>
  );
}

function NotificationsCommandContent() {
  const api = useApi();
  const [items, setItems] = React.useState([]);
  const [metrics, setMetrics] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [activeItem, setActiveItem] = React.useState(null);

  async function loadNotifications() {
    setLoading(true);
    const res = await api.get("/notifications/workspace");
    if (res?.success) {
      const workspace = res.data?.notifications || res.data || {};
      setItems(arr(workspace.items || workspace));
      setMetrics(workspace.metrics || {});
      setError("");
    } else {
      setItems([]);
      setMetrics({});
      setError(res?.error || "Could not load notifications");
    }
    setLoading(false);
  }

  React.useEffect(() => { loadNotifications(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function markRead(item) {
    const id = idOf(item);
    if (!id) return;
    setBusy(id);
    const res = await api.post(`/notifications/${id}/read`, {});
    setBusy("");
    if (res?.success) {
      toast.success("Marked read");
      setActiveItem(null);
      await loadNotifications();
    } else toast.error(res?.error || "Could not mark read");
  }

  async function createTest() {
    setBusy("test");
    const res = await api.post("/notifications/test", {});
    setBusy("");
    if (res?.success) {
      toast.success("Test notification created");
      await loadNotifications();
    } else toast.error(res?.error || "Could not create test notification");
  }

  const list = items.length ? items : sampleNotifications;
  const counts = React.useMemo(() => {
    const unread = metrics.unread ?? list.filter(isUnread).length;
    const urgent = metrics.urgent ?? list.filter((item) => ["urgent", "high", "critical"].includes(priorityOf(item))).length;
    const total = metrics.total ?? list.length;
    const read = list.filter((item) => !isUnread(item)).length;
    return { unread, urgent, total, read };
  }, [list, metrics]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Notifications Command</div><div className="text-sm font-bold text-slate-500">Business alerts, owner actions, worker updates and urgent follow-ups.</div></div>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={loadNotifications} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Refresh</button><button type="button" disabled={busy === "test"} onClick={createTest} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-60">Test alert</button></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Notifications Command</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Nothing important should get buried.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox turns job completions, invoice actions, quote follow-ups and payroll checks into clear owner alerts.</p></div></div>
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Alert health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="text-2xl font-black text-red-800">{counts.urgent}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Urgent</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{counts.unread}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Unread</div></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{counts.total}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Total alerts</div></div></div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Total</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{counts.total}</div></div>
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Unread</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-amber-900">{counts.unread}</div></div>
            <div className="rounded-[22px] border border-red-200 bg-red-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-red-700">Urgent</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-red-900">{counts.urgent}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Read</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{counts.read}</div></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Alert queue</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open notifications</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}{error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Showing sample layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">{list.map((item) => <NotificationCard key={idOf(item) || titleOf(item)} item={item} onOpen={setActiveItem} onRead={markRead} busy={busy} />)}</div>
          </section>
        </section>
      </div>
      <NotificationSlip item={activeItem} onClose={() => setActiveItem(null)} onRead={markRead} busy={busy} />
    </main>
  );
}

export default function NotificationsCommandPage() {
  if (typeof document === "undefined") return <NotificationsCommandContent />;
  return createPortal(<NotificationsCommandContent />, document.body);
}
