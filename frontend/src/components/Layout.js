import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "./ChurvoxLogo";
import { hasPlanAccess, normalizePlan } from "../utils/planRules";
import { InstallPrompt } from "./InstallPrompt";
import { canAccess } from "../lib/roles";
import {
  LayoutDashboard, Briefcase, Calendar, Users, MoreHorizontal, LogOut,
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
    canAccess(role, "dashboard") && { path: "/dashboard", label: "Smart Hub", icon: LayoutDashboard },
    canAccess(role, "jobs") && { path: "/jobs", label: "Jobs", icon: Briefcase },
    canAccess(role, "calendar") && { path: "/dispatch", label: "Dispatch", icon: Calendar },
    canAccess(role, "clients") && { path: "/clients", label: "Clients", icon: Users },
    canAccess(role, "quotes") && { path: "/quotes", label: "Quotes", icon: FileText },
    canAccess(role, "invoices") && { path: "/invoices", label: "Invoices", icon: Receipt },
    canAccess(role, "team") && (isOwnerUser || hasPlanAccess(safePlan, "team")) && { path: "/team", label: "Team", icon: UserPlus },
    (role === "owner" || role === "employer" || role === "manager") && { path: "/automation", label: "Automation", icon: Zap },
    canAccess(role, "payroll") && { path: "/payroll", label: "Payroll", icon: DollarSign },
    canAccess(role, "sms") && { path: "/sms", label: "SMS", icon: MessageSquare },
    canAccess(role, "reports") && { path: "/reports", label: "Reports", icon: FileText },
    canAccess(role, "integrations") && { path: "/integrations", label: "Integrations", icon: Zap },
    isOwnerUser && { path: "/plans", label: "Plans", icon: CreditCard },
    canAccess(role, "settings") && { path: "/settings", label: "Settings", icon: Settings },
  ].filter(Boolean);

  const mainNav = navItems.slice(0, 4);
  const moreNav = navItems.slice(4);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="cx-app-shell tap-safe-root min-h-screen bg-background" data-testid="layout-container">
      {/* Desktop Sidebar — Premium narrow style */}
      <aside className="hidden md:flex md:flex-col md:w-[256px] md:fixed md:inset-y-0 bg-[#0c1629] border-r border-slate-800 z-40 shadow-[10px_0_28px_rgba(2,6,23,0.45)]" data-testid="desktop-sidebar">
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-[86px] border-b border-slate-800 bg-[#0f1d35]">
          <ChurvoxLogo size="lg" dataTestId="sidebar-logo" />
          <NotificationsBell />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                  active
                    ? "bg-[#1d66ff] text-primary-foreground shadow-[0_12px_24px_rgba(29,102,255,0.35)] border border-blue-400/40"
                    : "text-slate-300 hover:bg-[#122744] hover:text-blue-200 border border-transparent"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-[#0a1424]">
          <div className="px-3 py-2.5 rounded-xl bg-[#111f36] border border-slate-700 shadow-[0_2px_8px_rgba(2,6,23,0.35)]">
            <p className="text-xs font-semibold text-slate-100 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.business_name || user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent hover:border-red-500/30"
            data-testid="logout-button"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-[256px] min-h-screen flex flex-col" data-testid="main-content-area">
        {/* Mobile header */}
        <header className="md:hidden bg-[#0f1d35] border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30" data-testid="mobile-header">
          <ChurvoxLogo size="sm" dataTestId="mobile-logo" />
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <span className="text-xs font-medium text-slate-300">{user?.name?.split(" ")[0]}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f1d35] border-t border-slate-800 z-40 safe-area-bottom" data-testid="mobile-bottom-nav">
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
            <div className="absolute bottom-full left-0 right-0 bg-[#0f1d35] border-t border-slate-800 shadow-lg max-h-[60vh] overflow-y-auto" data-testid="mobile-more-menu">
              <div className="p-3 space-y-0.5">
                {moreNav.map((item) => (
                  <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                      isActive(item.path) ? "bg-blue-600 text-white" : "text-slate-200 hover:bg-[#122744]"
                    }`}>
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
