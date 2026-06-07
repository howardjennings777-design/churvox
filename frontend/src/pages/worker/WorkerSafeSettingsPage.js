import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Briefcase, Camera, CheckCircle2, HelpCircle, LogOut, MessageCircle, RefreshCw, Settings, ShieldCheck, UserCircle2 } from "lucide-react";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import WorkerBottomNav from "../../components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "../../components/worker/WorkerContactOfficePanel";
import { useAuth } from "../../context/AuthContext";

function Card({ children, id }) {
  return <section id={id} className="rounded-[26px] border border-[var(--cx-border)] bg-[var(--cx-surface)] p-4 shadow-[0_18px_44px_rgba(0,0,0,.22)]">{children}</section>;
}
function InfoRow({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-[var(--cx-border)] bg-[var(--cx-surface-2)] p-3"><Icon className="mt-0.5 h-4 w-4 text-[var(--cx-accent)]" /><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--cx-muted)]">{label}</p><p className="mt-1 text-sm font-black text-[var(--cx-text)]">{value || "Not saved"}</p></div></div>;
}

export default function WorkerSafeSettingsPage() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [contactOpen, setContactOpen] = React.useState(false);

  React.useEffect(() => {
    if (location.hash === "#help") setTimeout(() => document.querySelector("#worker-help")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [location.hash]);

  return <div className="px-app min-h-screen pb-28" data-marker="CHURVOX_WORKER_SAFE_SETTINGS_20260608">
    <header className="px-mobile-header"><ChurvoxLogo size="sm" /><Link to="/worker/jobs" className="px-btn px-btn--ghost px-btn--sm">My jobs</Link></header>
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <section className="px-hero" style={{ padding: "20px" }}><span className="px-hero__eyebrow"><Settings className="h-3 w-3" /> Worker settings</span><h1 className="px-hero__title" style={{ fontSize: "24px" }}>Simple worker tools.</h1><p className="px-hero__sub">Only assigned jobs, help, and basic account info. Owner pricing, billing, payroll admin and accounting controls stay hidden.</p></section>

      <Card><div className="flex items-start gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]"><UserCircle2 className="h-6 w-6" /></div><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--cx-muted)]">Signed in as</p><h2 className="truncate text-xl font-black text-[var(--cx-text)]">{user?.name || user?.full_name || user?.email || "Worker"}</h2><p className="mt-1 text-sm font-bold text-[var(--cx-muted)]">{user?.email || "No email saved"}</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><InfoRow icon={ShieldCheck} label="Access" value="Worker only" /><InfoRow icon={Briefcase} label="Main workspace" value="Assigned jobs" /></div></Card>

      <Card><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--cx-accent)]">Quick actions</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Link to="/worker/jobs" className="rounded-2xl bg-[var(--cx-accent)] px-4 py-4 text-center text-sm font-black text-slate-950 no-underline"><Briefcase className="mx-auto mb-1 h-5 w-5" /> Open my jobs</Link><button type="button" onClick={() => setContactOpen(true)} className="rounded-2xl border border-[var(--cx-border)] bg-[var(--cx-surface-2)] px-4 py-4 text-sm font-black text-[var(--cx-text)]"><MessageCircle className="mx-auto mb-1 h-5 w-5" /> Contact office</button><button type="button" onClick={() => window.location.reload()} className="rounded-2xl border border-[var(--cx-border)] bg-[var(--cx-surface-2)] px-4 py-4 text-sm font-black text-[var(--cx-text)]"><RefreshCw className="mx-auto mb-1 h-5 w-5" /> Refresh app</button><button type="button" onClick={logout} className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-4 text-sm font-black text-red-200"><LogOut className="mx-auto mb-1 h-5 w-5" /> Log out</button></div></Card>

      <Card id="worker-help"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--cx-accent)]">How the worker flow works</p><div className="mt-3 grid gap-3"><InfoRow icon={Briefcase} label="1. Open job" value="Only work assigned to you should appear in your list." /><InfoRow icon={CheckCircle2} label="2. Acknowledge / start" value="Acknowledge the job, then start the timer when you begin work." /><InfoRow icon={Camera} label="3. Notes and photos" value="Add clear worker notes and completion photos for owner review." /><InfoRow icon={CheckCircle2} label="4. Complete" value="Finish the job so time and proof are ready for the owner Work Slip." /></div></Card>

      <Card><div className="flex items-start gap-3"><HelpCircle className="mt-1 h-5 w-5 text-[var(--cx-accent)]" /><div><h2 className="text-lg font-black text-[var(--cx-text)]">Need help?</h2><p className="mt-1 text-sm font-bold leading-6 text-[var(--cx-muted)]">Contact the office for job access, instructions, schedule changes, or app issues.</p><button type="button" onClick={() => setContactOpen(true)} className="mt-3 rounded-2xl bg-[var(--cx-accent)] px-4 py-3 text-sm font-black text-slate-950">Contact office</button></div></div></Card>
    </main>
    <WorkerContactOfficePanel open={contactOpen} onClose={() => setContactOpen(false)} defaultMessage="I need help with the worker app or my assigned jobs." />
    <WorkerBottomNav active={location.hash === "#help" ? "help" : "settings"} />
  </div>;
}
