import React from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Command,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  buildSearchIndex,
  clean,
  createAccess,
  money,
  titleOf,
  useControlBoardData,
} from "../churvox-product/controlBoardData";
import StudioRecordDrawer from "./StudioRecordDrawer";
import {
  ClientsStudio,
  CommandStudio,
  EmptyState,
  MessagesStudio,
  MoneyStudio,
  PlansStudio,
  SettingsStudio,
  StatusPill,
  SupportStudio,
  TeamStudio,
  TodayStudio,
  WorkStudio,
} from "./StudioPages";
import {
  AREA_PAGES,
  AREA_TABS,
  PRIMARY_NAV,
  areaForPage,
  blankRecord,
  initials,
  pageFromLocation,
  toneFor,
} from "./studioModel";
import "./churvoxStudio.css";

const ICONS = {
  today: LayoutDashboard,
  work: BriefcaseBusiness,
  clients: Building2,
  money: WalletCards,
  team: Users,
  messages: MessageSquare,
  command: Command,
};

function useStudioRoute(access) {
  const [page, setPage] = React.useState(pageFromLocation);

  React.useEffect(() => {
    const sync = () => setPage(pageFromLocation());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const go = React.useCallback((next) => {
    const area = areaForPage(next);
    const feature = area === "utility" ? (next === "support" ? "help" : next) : area;
    const safe = access.can(feature) ? next : "plans";
    window.history.pushState({}, "", `/dashboard${safe === "today" ? "" : `#${safe}`}`);
    setPage(safe);
    window.dispatchEvent(new Event("hashchange"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [access]);

  return [page, go];
}

function navCount(area, data) {
  if (area === "today") return data.jobs.filter((job) => job.date).length;
  if (area === "work") return data.jobs.filter((job) => !/complete/i.test(job.status)).length;
  if (area === "clients") return data.clients.length;
  if (area === "money") return data.invoices.filter((invoice) => !/paid/i.test(invoice.status)).length;
  if (area === "team") return data.workers.filter((worker) => !/offline|not clocked|inactive/i.test(worker.status)).length;
  if (area === "messages") return data.messages.filter((message) => /urgent|high/i.test(message.priority)).length || data.messages.length;
  if (area === "command") return data.command.filter((item) => !/approved|complete|done|park/i.test(item.status)).length;
  return 0;
}

function StudioHeader({ page, go, access, user, logout, data, openSearch, openCreate, openUpdates, updateCount }) {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const area = areaForPage(page);
  const businessName = user?.business_name || user?.company_name || user?.name || "Your business";
  const visible = PRIMARY_NAV.filter((item) => access.can(item.area));

  return (
    <>
      <header className="cvsControlBeam">
        <button type="button" className="cvsBrand" onClick={() => go("today")}>
          <span>CV</span>
          <div><b>Churvox</b><small>{businessName}</small></div>
        </button>

        <nav className="cvsWorkstream" aria-label="Main Churvox navigation">
          {visible.map((item) => {
            const Icon = ICONS[item.area];
            const active = area === item.area;
            const count = navCount(item.area, data);
            return (
              <button type="button" key={item.id} className={active ? "active" : ""} onClick={() => go(item.id)}>
                <Icon size={17} />
                <span>{item.label}</span>
                <em>{count}</em>
              </button>
            );
          })}
        </nav>

        <div className="cvsBeamActions">
          <button type="button" onClick={openSearch} aria-label="Search"><Search size={18} /></button>
          <button type="button" onClick={openUpdates} aria-label="Updates" className={updateCount ? "has-count" : ""}><Bell size={18} />{updateCount ? <span>{updateCount}</span> : null}</button>
          <button type="button" className="create" onClick={openCreate}><Plus size={18} /><span>Create</span></button>
          <div className="cvsProfileWrap">
            <button type="button" className="profile" onClick={() => setProfileOpen((value) => !value)}><span>{initials(businessName)}</span><ChevronDown size={15} /></button>
            {profileOpen ? (
              <section className="cvsProfileMenu">
                <header><span>{initials(businessName)}</span><div><b>{businessName}</b><small>{access.planName} plan</small></div></header>
                <button type="button" onClick={() => { setProfileOpen(false); go("settings"); }}><Settings size={17} />Settings</button>
                <button type="button" onClick={() => { setProfileOpen(false); go("plans"); }}><CircleDollarSign size={17} />Plans & billing</button>
                <button type="button" onClick={() => { setProfileOpen(false); go("support"); }}><HelpCircle size={17} />Help</button>
                <button type="button" className="logout" onClick={async () => { await logout(); window.location.assign("/login"); }}><LogOut size={17} />Log out</button>
              </section>
            ) : null}
          </div>
        </div>
      </header>

      <div className="cvsContextBeam">
        <div className="cvsContextIdentity"><span>{ICONS[area] ? React.createElement(ICONS[area], { size: 16 }) : <Sparkles size={16} />}</span><b>{area === "utility" ? page === "support" ? "Help" : page === "plans" ? "Plans & billing" : "Settings" : PRIMARY_NAV.find((item) => item.area === area)?.label}</b></div>
        {AREA_TABS[area] ? <nav>{AREA_TABS[area].filter(([id]) => id !== "accounting" || access.accounting).map(([id, label]) => <button type="button" key={id} className={page === id ? "active" : ""} onClick={() => go(id)}>{label}</button>)}</nav> : <div className="cvsContextLine"><span>Live records</span><i /><span>Owner-controlled actions</span></div>}
        <div className="cvsContextStatus"><span className="live-dot" />Live business data</div>
      </div>
    </>
  );
}

function SearchOverlay({ data, close, open, go }) {
  const [query, setQuery] = React.useState("");
  const index = React.useMemo(() => buildSearchIndex(data), [data]);
  const results = query ? index.filter((item) => item.search.toLowerCase().includes(query.toLowerCase())).slice(0, 24) : index.slice(0, 14);
  const route = (record) => record.type === "client" ? "clients" : record.type === "job" ? "jobs" : record.type === "quote" ? "quotes" : record.type === "invoice" ? "invoices" : record.type === "worker" ? "crew" : "messages";
  return (
    <div className="cvsOverlay" role="dialog" aria-modal="true" aria-label="Search Churvox">
      <button type="button" className="cvsOverlayScrim" aria-label="Close search" onClick={close} />
      <section className="cvsSearchStudio">
        <header><Search size={22} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, job, worker, quote or invoice" /><button type="button" onClick={close}><X size={19} /></button></header>
        <div>{results.length ? results.map((item) => <button type="button" key={`${item.type}-${item.id}`} onClick={() => { close(); go(route(item)); window.setTimeout(() => open(item), 50); }}><span className={`cvsSignal ${toneFor(item.status || item.priority)}`} /><div><small>{item.area}</small><b>{titleOf(item)}</b><em>{item.client || item.worker || item.email || item.status || item.from || "Record"}</em></div><strong>{item.amount ? money(item.amount) : item.price ? money(item.price) : "Open"}</strong></button>) : <EmptyState title="No matching records" text="Try a name, address, job, invoice or worker." />}</div>
      </section>
    </div>
  );
}

function CreateOverlay({ data, access, close, open }) {
  const items = [
    ["job", "Job", "Book, assign and price work", BriefcaseBusiness],
    ["client", "Client", "Create a complete relationship", Building2],
    ["quote", "Quote", "Prepare scope and price", WalletCards],
    ["invoice", "Invoice", "Create an owner-reviewed draft", CircleDollarSign],
    ["worker", "Worker", "Invite crew or a subcontractor", Users],
    ["message", "Message", "Attach communication to work", MessageSquare],
  ].filter(([type]) => !["worker", "message"].includes(type) || access.can("team"));
  return (
    <div className="cvsOverlay" role="dialog" aria-modal="true" aria-label="Create in Churvox">
      <button type="button" className="cvsOverlayScrim" aria-label="Close create menu" onClick={close} />
      <section className="cvsCreateStudio">
        <header><div><span className="cvsEyebrow">Global create</span><h2>Start the right record.</h2><p>Every new item enters the same connected business flow.</p></div><button type="button" onClick={close}><X size={19} /></button></header>
        <div>{items.map(([type, label, text, Icon], index) => <button type="button" key={type} onClick={() => { close(); open(blankRecord(type, data)); }}><span className="number">{String(index + 1).padStart(2, "0")}</span><Icon size={22} /><div><b>{label}</b><small>{text}</small></div><ArrowIcon /></button>)}</div>
      </section>
    </div>
  );
}

function ArrowIcon() {
  return <span className="arrow">↗</span>;
}

function UpdatesPanel({ updates, close, open, go }) {
  const route = (item) => item.type === "approval" ? "command" : item.type === "invoice" ? "invoices" : item.type === "message" ? "messages" : "jobs";
  return (
    <div className="cvsPanelLayer">
      <button type="button" className="cvsPanelScrim" aria-label="Close updates" onClick={close} />
      <aside className="cvsUpdatesPanel">
        <header><div><span className="cvsEyebrow">Signal feed</span><h2>{updates.length ? `${updates.length} meaningful updates` : "You are caught up"}</h2></div><button type="button" onClick={close}><X size={19} /></button></header>
        <div>{updates.length ? updates.map((item, index) => <button type="button" key={`${item.type}-${item.id}-${index}`} onClick={() => { close(); go(route(item)); window.setTimeout(() => open(item), 50); }}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{titleOf(item)}</b><small>{item.reason || item.issue || item.status || item.priority}</small></div><StatusPill value={item.status || item.priority} /></button>) : <EmptyState title="No meaningful updates" text="Payments, replies, late work and owner decisions will appear here." />}</div>
        <footer>Updates show what changed. Command holds what requires judgement.</footer>
      </aside>
    </div>
  );
}

function MobileDock({ page, go, access }) {
  const [open, setOpen] = React.useState(false);
  const items = [["today", "Today", LayoutDashboard], ["jobs", "Work", BriefcaseBusiness], ["command", "Command", Command], ["messages", "Messages", MessageSquare]].filter(([id]) => access.can(areaForPage(id)));
  return (
    <>
      <nav className="cvsMobileDock">{items.map(([id, label, Icon]) => <button type="button" key={id} className={areaForPage(page) === areaForPage(id) ? "active" : ""} onClick={() => go(id)}><Icon size={19} /><span>{label}</span></button>)}<button type="button" onClick={() => setOpen(true)}><Menu size={19} /><span>More</span></button></nav>
      {open ? <div className="cvsMobileMore"><button type="button" className="scrim" onClick={() => setOpen(false)} /><section><header><div><b>Churvox</b><small>All business areas</small></div><button type="button" onClick={() => setOpen(false)}><X size={19} /></button></header>{PRIMARY_NAV.filter((item) => access.can(item.area)).map((item) => { const Icon = ICONS[item.area]; return <button type="button" key={item.id} onClick={() => { setOpen(false); go(item.id); }}><Icon size={18} />{item.label}<span>{navCount(item.area, { jobs: [], clients: [], invoices: [], workers: [], messages: [], command: [] })}</span></button>; })}<button type="button" onClick={() => { setOpen(false); go("settings"); }}><Settings size={18} />Settings</button><button type="button" onClick={() => { setOpen(false); go("plans"); }}><CircleDollarSign size={18} />Plans & billing</button><button type="button" onClick={() => { setOpen(false); go("support"); }}><HelpCircle size={18} />Help</button></section></div> : null}
    </>
  );
}

function Toast({ notice, clear }) {
  React.useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(clear, 5000);
    return () => window.clearTimeout(timer);
  }, [notice, clear]);
  if (!notice) return null;
  return <div className={`cvsToast ${notice.tone || ""}`}><span>{notice.tone === "bad" ? "!" : "✓"}</span><div><b>{notice.title}</b><small>{notice.text}</small></div><button type="button" onClick={clear}><X size={17} /></button></div>;
}

export default function ChurvoxStudioApp() {
  const { user, logout } = useAuth();
  const access = React.useMemo(() => createAccess(user), [user]);
  const { api, data, loading, failures, refresh } = useControlBoardData(Boolean(user));
  const [page, go] = useStudioRoute(access);
  const [record, setRecord] = React.useState(null);
  const [overlay, setOverlay] = React.useState("");
  const [notice, setNotice] = React.useState(null);
  const [lastVisit] = React.useState(() => { const raw = window.localStorage.getItem("churvox:last-owner-visit"); const date = raw ? new Date(raw) : null; return date && !Number.isNaN(date.getTime()) ? date : null; });

  React.useEffect(() => {
    const stamp = () => window.localStorage.setItem("churvox:last-owner-visit", new Date().toISOString());
    window.addEventListener("beforeunload", stamp);
    return () => { stamp(); window.removeEventListener("beforeunload", stamp); };
  }, []);

  const updates = React.useMemo(() => [
    ...data.command.filter((item) => !/approved|complete|done|park/i.test(item.status)),
    ...data.jobs.filter((item) => item.issue || /check|late|unassigned/i.test(`${item.status} ${item.worker}`)),
    ...data.invoices.filter((item) => /overdue/i.test(item.status)),
    ...data.messages.filter((item) => /urgent|high/i.test(item.priority)),
  ].slice(0, 20), [data]);

  const create = (type) => setRecord(blankRecord(type, data));
  let content;
  if (loading) content = <div className="cvsLoading"><span><Sparkles size={25} /></span><b>Building the live business picture</b><small>Connecting work, people, messages and money.</small></div>;
  else if (page === "today") content = <TodayStudio data={data} go={go} open={setRecord} create={create} lastVisit={lastVisit} />;
  else if (AREA_PAGES.work.includes(page)) content = <WorkStudio page={page} data={data} open={setRecord} create={create} />;
  else if (page === "clients") content = <ClientsStudio data={data} open={setRecord} create={create} api={api} refresh={refresh} notify={setNotice} />;
  else if (AREA_PAGES.money.includes(page)) content = <MoneyStudio page={page} data={data} open={setRecord} create={create} access={access} />;
  else if (AREA_PAGES.team.includes(page)) content = <TeamStudio page={page} data={data} open={setRecord} create={create} />;
  else if (page === "messages") content = <MessagesStudio data={data} open={setRecord} create={create} />;
  else if (AREA_PAGES.command.includes(page)) content = <CommandStudio page={page} data={data} open={setRecord} />;
  else if (page === "settings") content = <SettingsStudio user={user} api={api} notify={setNotice} />;
  else if (page === "plans") content = <PlansStudio access={access} />;
  else content = <SupportStudio />;

  return (
    <main className={`cvsStudio page-${page}`} data-churvox-layout="fresh-studio" data-version="CHURVOX_FRESH_STUDIO_20260725">
      <StudioHeader page={page} go={go} access={access} user={user} logout={logout} data={data} openSearch={() => setOverlay("search")} openCreate={() => setOverlay("create")} openUpdates={() => setOverlay("updates")} updateCount={updates.length} />
      {failures?.length ? <div className="cvsDataWarning"><span>Live data issue</span><p>{failures.map((failure) => `${failure.source}: ${failure.message}`).join(" · ")}</p><button type="button" onClick={refresh}>Retry</button></div> : null}
      <div className="cvsWorkspace">{content}</div>
      <MobileDock page={page} go={go} access={access} />
      {overlay === "search" ? <SearchOverlay data={data} close={() => setOverlay("")} open={setRecord} go={go} /> : null}
      {overlay === "create" ? <CreateOverlay data={data} access={access} close={() => setOverlay("")} open={setRecord} /> : null}
      {overlay === "updates" ? <UpdatesPanel updates={updates} close={() => setOverlay("")} open={setRecord} go={go} /> : null}
      <StudioRecordDrawer record={record} data={data} api={api} refresh={refresh} close={() => setRecord(null)} notify={setNotice} />
      <Toast notice={notice} clear={() => setNotice(null)} />
    </main>
  );
}
