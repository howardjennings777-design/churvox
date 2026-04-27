import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "./ChurvoxLogo";
import { hasPlanAccess, normalizePlan } from "../utils/planRules";
import { InstallPrompt } from "./InstallPrompt";
import { canAccess } from "../lib/roles";
import {
  LayoutDashboard, Briefcase, Users, MoreHorizontal, LogOut,
  Settings, FileText, Receipt, CreditCard, UserPlus, MessageSquare, DollarSign, Zap,
} from "lucide-react";
import NotificationsBell from "./NotificationsBell";

export default function Layout({ children }) {
  const { user, logout, normalizedRole, isOwnerUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const safePlan = normalizePlan(user?.plan);
  const role = normalizedRole || "owner";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    canAccess(role, "dashboard") && { path: "/dashboard", label: "Smart Hub", icon: LayoutDashboard, group: "Core" },
    canAccess(role, "jobs") && { path: "/jobs", label: "Jobs", icon: Briefcase, group: "Core" },
    canAccess(role, "clients") && { path: "/clients", label: "Clients", icon: Users, group: "Core" },
    canAccess(role, "quotes") && { path: "/quotes", label: "Quotes", icon: FileText, group: "Operations" },
    canAccess(role, "invoices") && { path: "/invoices", label: "Invoices", icon: Receipt, group: "Operations" },
    canAccess(role, "team") && (isOwnerUser || hasPlanAccess(safePlan, "team")) && { path: "/team", label: "Team", icon: UserPlus, group: "Operations" },
    (role === "owner" || role === "employer" || role === "manager") && { path: "/automation", label: "Automation", icon: Zap, group: "Operations" },
    canAccess(role, "payroll") && { path: "/payroll", label: "Payroll", icon: DollarSign, group: "Operations" },
    canAccess(role, "sms") && { path: "/sms", label: "Communications", icon: MessageSquare, group: "Operations" },
    canAccess(role, "reports") && role !== "payroll" && { path: "/reports", label: "Reports", icon: FileText, group: "Admin" },
    canAccess(role, "integrations") && { path: "/integrations", label: "Document Studio", icon: Zap, group: "Admin" },
    isOwnerUser && { path: "/plans", label: "Plans & Billing", icon: CreditCard, group: "Admin" },
    canAccess(role, "settings") && { path: "/settings", label: "Settings", icon: Settings, group: "Admin" },
  ].filter(Boolean);

  const mainNav = navItems.slice(0, 4);
  const moreNav = navItems.slice(4);
  const grouped = {
    Core: navItems.filter((n) => n.group === "Core"),
    Operations: navItems.filter((n) => n.group === "Operations"),
    Admin: navItems.filter((n) => n.group === "Admin"),
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="cx-app-shell tap-safe-root min-h-screen overflow-x-clip" data-testid="layout-container">
      <aside className="hidden md:flex md:flex-col md:w-[272px] md:fixed md:inset-y-0 z-40" data-testid="desktop-sidebar">
        <div className="h-[92px] px-5 border-b border-slate-700/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChurvoxLogo size="sm" dataTestId="sidebar-logo" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-300/70">Churvox</p>
              <p className="text-sm font-semibold text-white">Smart Hub</p>
            </div>
          </div>
          <NotificationsBell />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {Object.entries(grouped).map(([label, items]) => (
            items.length ? (
              <div key={label}>
                <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.16em]" data-nav="group-label">{label}</p>
                <div className="space-y-1.5">
                  {items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        data-nav="item"
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold border border-transparent transition-all ${active ? "active" : "hover:bg-[#1a3150]"}`}
                      >
                        <item.icon className="h-[17px] w-[17px] shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700/70 bg-[#0c1729]">
          <div className="px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900/35">
            <p className="text-xs font-semibold text-slate-100 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.business_name || user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-200 transition-all"
            data-testid="logout-button"
          >
            <LogOut className="h-[17px] w-[17px]" />Log out
          </button>
        </div>
      </aside>

      <div className="md:ml-[272px] min-h-screen flex flex-col" data-testid="main-content-area">
        <header className="md:hidden px-4 py-3 flex items-center justify-between sticky top-0 z-30" data-testid="mobile-header">
          <div className="flex items-center gap-2">
            <ChurvoxLogo size="sm" dataTestId="mobile-logo" />
            <span className="text-xs text-slate-300 font-medium">Smart Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <span className="text-xs font-medium text-slate-300">{user?.name?.split(" ")[0]}</span>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-bottom" data-testid="mobile-bottom-nav">
          <div className="flex items-center justify-around py-1">
            {mainNav.map((item) => {
              const active = isActive(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] ${active ? "text-blue-300" : "text-slate-400"}`}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
            <button type="button" onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] ${moreOpen ? "text-blue-300" : "text-slate-400"}`}
              data-testid="mobile-more-button">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>

          {moreOpen && (
            <div className="absolute bottom-full left-0 right-0 bg-[#122640] border-t border-slate-700 shadow-xl max-h-[60vh] overflow-y-auto" data-testid="mobile-more-menu">
              <div className="p-3 space-y-1">
                {moreNav.map((item) => (
                  <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${isActive(item.path) ? "bg-blue-600 text-white" : "text-slate-200 hover:bg-[#1a3150]"}`}>
                    <item.icon className="h-5 w-5" />{item.label}
                  </Link>
                ))}
                <button onClick={() => { setMoreOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/10">
                  <LogOut className="h-5 w-5" />Log out
                </button>
              </div>
            </div>
          )}
        </nav>
      </div>

      <InstallPrompt />
    </div>
  );
}
