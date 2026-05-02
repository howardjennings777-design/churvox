import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Building2, Shield, LogOut } from "lucide-react";
import { PremiumPage, PremiumCard, PremiumButton } from "@/components/premium";

export default function WorkerSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="px-app min-h-screen">
      <header className="bg-white/90 backdrop-blur border-b border-[#e6eef9] px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/worker/jobs" className="text-[#5b6c87] hover:text-[#0d1b34]" data-testid="worker-settings-back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-[#0d1b34]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Settings
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <PremiumPage maxWidth={640}>
          <PremiumCard>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#dbe7ff] to-[#e0f3ff] flex items-center justify-center shadow-sm">
                <User className="h-7 w-7 text-[#1d4ed8]" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#0d1b34] text-lg truncate" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {user?.name || "Worker"}
                </p>
                <p className="text-sm text-[#5b6c87] truncate">{user?.email}</p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#e6eef9] space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-[#7d8ba3]" />
                <span className="text-[#1a2c4d]">{user?.email || "-"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-[#7d8ba3]" />
                <span className="text-[#1a2c4d] capitalize">{user?.role || "worker"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-[#7d8ba3]" />
                <span className="text-[#1a2c4d]">{user?.business_name || "Your business"}</span>
              </div>
            </div>
          </PremiumCard>

          <PremiumButton
            variant="danger"
            onClick={logout}
            dataTestId="worker-logout-btn"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </PremiumButton>
        </PremiumPage>
      </main>
    </div>
  );
}
