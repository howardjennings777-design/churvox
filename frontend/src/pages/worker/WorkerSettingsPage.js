import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Building2, Shield, LogOut, Smartphone, Bell } from "lucide-react";
import { PremiumPage, PremiumCard, PremiumButton } from "@/components/premium";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";

export default function WorkerSettingsPage() {
  const { user, logout } = useAuth();
  const [showContactOffice, setShowContactOffice] = React.useState(false);

  return (
    <div className="px-app min-h-screen pb-28">
      <header className="bg-[rgba(17,21,27,0.92)] backdrop-blur border-b border-[var(--cx-border)] px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/worker/jobs" className="text-[var(--cx-muted)] hover:text-[var(--cx-text)]"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold text-[var(--cx-text)]">Worker Settings</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <PremiumPage maxWidth={640}>
          <PremiumCard><div className="px-card__body space-y-3"><div className="flex items-center gap-3"><div className="h-14 w-14 rounded-2xl bg-[var(--cx-surface-2)] border border-[var(--cx-border)] flex items-center justify-center"><User className="h-7 w-7 text-[var(--cx-accent)]" /></div><div><p className="text-lg font-bold text-[var(--cx-text)]">{user?.name || "Worker"}</p><p className="text-sm text-[var(--cx-muted)]">Field worker profile</p></div></div></div></PremiumCard>
          <PremiumCard><div className="px-card__body space-y-2"><p className="text-sm font-semibold text-[var(--cx-text)]">Contact details</p><p className="text-sm text-[var(--cx-muted)] flex items-center gap-2"><Mail className="h-4 w-4" />{user?.email || "No email"}</p><p className="text-sm text-[var(--cx-muted)] flex items-center gap-2"><Building2 className="h-4 w-4" />{user?.business_name || "Churvox Team"}</p></div></PremiumCard>
          <PremiumCard><div className="px-card__body space-y-2"><p className="text-sm font-semibold text-[var(--cx-text)]">Role & region</p><p className="text-sm text-[var(--cx-muted)] flex items-center gap-2"><Shield className="h-4 w-4" />Role: Worker</p>{user?.region ? <p className="text-sm text-[var(--cx-muted)]">Region: {user.region}</p> : null}</div></PremiumCard>
          {typeof user?.notifications_enabled !== "undefined" ? <PremiumCard><div className="px-card__body"><p className="text-sm font-semibold text-[var(--cx-text)] mb-1 flex items-center gap-2"><Bell className="h-4 w-4" />Notifications</p><p className="text-sm text-[var(--cx-muted)]">{user.notifications_enabled ? "Enabled" : "Disabled"}</p></div></PremiumCard> : null}
          <PremiumCard><div className="px-card__body"><p className="text-sm font-semibold text-[var(--cx-text)] mb-1 flex items-center gap-2"><Smartphone className="h-4 w-4" />App install & help</p><p className="text-sm text-[var(--cx-muted)]">Use your phone browser menu to install Churvox to your home screen for faster field access.</p></div></PremiumCard>
          <PremiumCard id="help"><div className="px-card__body space-y-2"><p className="text-sm font-semibold text-[var(--cx-text)] mb-1">Help</p><p className="text-sm text-[var(--cx-muted)]">If your jobs are missing or something looks wrong, refresh your jobs page first, then contact the office/admin team.</p><PremiumButton variant="secondary" className="w-full" onClick={() => setShowContactOffice(true)}>Contact office</PremiumButton></div></PremiumCard>
          <PremiumButton onClick={logout} iconLeft={<LogOut className="h-4 w-4" />} className="w-full">Log out</PremiumButton>
        </PremiumPage>
      </main>
      <WorkerContactOfficePanel
        open={showContactOffice}
        onClose={() => setShowContactOffice(false)}
        defaultMessage="I need help with my Churvox worker account."
      />
      <WorkerBottomNav active="settings" />
    </div>
  );
}
