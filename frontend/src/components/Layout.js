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
    canAccess(role, "dashboard") && { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
    canAccess(role, "jobs") && { path: "/jobs", label: "Jobs", icon: Briefcase },
    canAccess(role, "calendar") && { path: "/calendar", label: "Calendar", icon: Calendar },
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
    <div className="cx-app-shell tap-safe-root min-h-screen bg-[#f7f4ef]" data-testid="layout-container">
      {/* Desktop Sidebar — Premium narrow style */}
      <aside className="hidden md:flex md:flex-col md:w-[256px] md:fixed md:inset-y-0 bg-[#fcfaf6] border-r border-[#e4e0d8] z-40 shadow-[10px_0_28px_rgba(23,32,51,0.05)]" data-testid="desktop-sidebar">
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-[86px] border-b border-[#ebe7de] bg-white/70">
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
                    ? "bg-[#155EEF] text-white shadow-[0_10px_22px_rgba(21,94,239,0.3)] border border-[#0f48be]"
                    : "text-slate-600 hover:bg-[#eef3ff] hover:text-[#155EEF] border border-transparent"
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
        <div className="p-3 border-t border-[#ebe7de] space-y-2 bg-[#f8f5ef]">
          <div className="px-3 py-2.5 rounded-xl bg-white border border-[#e5e0d7] shadow-[0_2px_8px_rgba(23,32,51,0.05)]">
            <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.business_name || user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
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
        <header className="md:hidden bg-[#fcfaf6] border-b border-[#e4e0d8] px-4 py-3 flex items-center justify-between sticky top-0 z-30" data-testid="mobile-header">
          <ChurvoxLogo size="sm" dataTestId="mobile-logo" />
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <span className="text-xs font-medium text-slate-500">{user?.name?.split(" ")[0]}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fcfaf6] border-t border-[#e4e0d8] z-40 safe-area-bottom" data-testid="mobile-bottom-nav">
          <div className="flex items-center justify-around py-1">
            {mainNav.map((item) => {
              const active = isActive(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] ${active ? "text-blue-600" : "text-slate-400"}`}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
            <button type="button" onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] ${moreOpen ? "text-blue-600" : "text-slate-400"}`}
              data-testid="mobile-more-button">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>

          {moreOpen && (
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-slate-200 shadow-lg max-h-[60vh] overflow-y-auto" data-testid="mobile-more-menu">
              <div className="p-3 space-y-0.5">
                {moreNav.map((item) => (
                  <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                      isActive(item.path) ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}>
                    <item.icon className="h-5 w-5" />{item.label}
                  </Link>
                ))}
                <button onClick={() => { setMoreOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">
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
