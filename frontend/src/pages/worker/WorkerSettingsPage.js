import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Building2, Shield, LogOut, Smartphone, Bell } from "lucide-react";
import { PremiumPage, PremiumCard, PremiumButton } from "@/components/premium";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";

export default function WorkerSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="px-app min-h-screen pb-28">
      <header className="bg-white/90 backdrop-blur border-b border-[#e6eef9] px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/worker/jobs" className="text-[#5b6c87] hover:text-[#0d1b34]"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold text-[#0d1b34]">Worker Settings</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <PremiumPage maxWidth={640}>
          <PremiumCard><div className="px-card__body space-y-3"><div className="flex items-center gap-3"><div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#dbe7ff] to-[#e0f3ff] flex items-center justify-center"><User className="h-7 w-7 text-[#2563eb]" /></div><div><p className="text-lg font-bold text-[#0d1b34]">{user?.name || "Worker"}</p><p className="text-sm text-[#5b6c87]">Field worker profile</p></div></div></div></PremiumCard>
          <PremiumCard><div className="px-card__body space-y-2"><p className="text-sm font-semibold text-[#0d1b34]">Contact details</p><p className="text-sm text-[#5b6c87] flex items-center gap-2"><Mail className="h-4 w-4" />{user?.email || "No email"}</p><p className="text-sm text-[#5b6c87] flex items-center gap-2"><Building2 className="h-4 w-4" />{user?.business_name || "Churvox Team"}</p></div></PremiumCard>
          <PremiumCard><div className="px-card__body space-y-2"><p className="text-sm font-semibold text-[#0d1b34]">Role & region</p><p className="text-sm text-[#5b6c87] flex items-center gap-2"><Shield className="h-4 w-4" />Role: Worker</p>{user?.region ? <p className="text-sm text-[#5b6c87]">Region: {user.region}</p> : null}</div></PremiumCard>
          {typeof user?.notifications_enabled !== "undefined" ? <PremiumCard><div className="px-card__body"><p className="text-sm font-semibold text-[#0d1b34] mb-1 flex items-center gap-2"><Bell className="h-4 w-4" />Notifications</p><p className="text-sm text-[#5b6c87]">{user.notifications_enabled ? "Enabled" : "Disabled"}</p></div></PremiumCard> : null}
          <PremiumCard><div className="px-card__body"><p className="text-sm font-semibold text-[#0d1b34] mb-1 flex items-center gap-2"><Smartphone className="h-4 w-4" />App install & help</p><p className="text-sm text-[#5b6c87]">Use your phone browser menu to install Churvox to your home screen for faster field access.</p></div></PremiumCard>
          <PremiumCard id="help"><div className="px-card__body"><p className="text-sm font-semibold text-[#0d1b34] mb-1">Help</p><p className="text-sm text-[#5b6c87]">If your jobs are missing or something looks wrong, refresh your jobs page first, then contact the office/admin team.</p></div></PremiumCard>
          <PremiumButton onClick={logout} iconLeft={<LogOut className="h-4 w-4" />} className="w-full">Log out</PremiumButton>
        </PremiumPage>
      </main>
      <WorkerBottomNav active="settings" />
    </div>
  );
}
