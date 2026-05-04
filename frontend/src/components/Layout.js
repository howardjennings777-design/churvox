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
  Sparkles, Plug, Bot, ShieldCheck,
} from "lucide-react";
import NotificationsBell from "./NotificationsBell";

export default function Layout({ children, smartHubMode = false }) {
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

  // Group navigation for clarity
  const groups = [
    {
      label: "Workspace",
      items: [
        canAccess(role, "dashboard") && { path: "/dashboard", label: "Smart Hub", icon: LayoutDashboard },
        canAccess(role, "jobs") && { path: "/jobs", label: "All Jobs", icon: Briefcase },
        canAccess(role, "calendar") && { path: "/dispatch", label: "Dispatch Board", icon: Calendar },
        canAccess(role, "clients") && { path: "/clients", label: "Client List", icon: Users },
        canAccess(role, "ai_operator") && { path: "/ai-operator", label: "AI Operator", icon: Bot },
        canAccess(role, "proof_to_paid") && { path: "/proof-to-paid", label: "Proof-to-Paid", icon: ShieldCheck },
      ].filter(Boolean),
    },
    {
      label: "Sales",
      items: [
        canAccess(role, "quotes") && { path: "/quotes", label: "All Quotes", icon: FileText },
        canAccess(role, "invoices") && { path: "/invoices", label: "All Invoices", icon: Receipt },
      ].filter(Boolean),
    },
    {
      label: "Operations",
      items: [
        canAccess(role, "team") && (isOwnerUser || hasPlanAccess(safePlan, "team")) && { path: "/team", label: "Team", icon: UserPlus },
        canAccess(role, "payroll") && { path: "/payroll", label: "Payroll", icon: DollarSign },
        (role === "owner" || role === "employer" || role === "manager") && { path: "/automation", label: "Automation", icon: Zap },
        canAccess(role, "reports") && { path: "/reports", label: "Reports", icon: FileText },
      ].filter(Boolean),
    },
    {
      label: "Settings",
      items: [
        canAccess(role, "sms") && { path: "/sms", label: "Communications", icon: MessageSquare },
        canAccess(role, "integrations") && { path: "/integrations", label: "Integrations", icon: Plug },
        isOwnerUser && { path: "/plans", label: "Plans & Billing", icon: CreditCard },
        canAccess(role, "settings") && { path: "/settings", label: "Settings", icon: Settings },
      ].filter(Boolean),
    },
  ].filter((g) => g.items.length > 0);

  const flatNav = groups.flatMap((g) => g.items);
  const mainNav = flatNav.slice(0, 4);
  const moreNav = flatNav.slice(4);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isSmartHubRoute = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  const isSmartHubLayout = smartHubMode || isSmartHubRoute;
  return (
    <div className="px-app tap-safe-root cx-app-shell" data-testid="layout-container">
      {/* Desktop Sidebar — Premium light */}
      {!isSmartHubLayout && <aside className="px-sidebar hidden md:flex" data-testid="desktop-sidebar">
        <div className="px-sidebar__brand">
          <ChurvoxLogo size="md" dataTestId="sidebar-logo" />
          <NotificationsBell />
        </div>

        <nav className="px-sidebar__nav">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="px-nav-group">{g.label}</div>
              {g.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-nav-item ${active ? "is-active" : ""}`}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="px-nav-item__icon h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-sidebar__foot">
          <div className="px-user-card">
            <div className="px-user-card__avatar">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="px-user-card__name truncate">{user?.name || "Account"}</p>
              <p className="px-user-card__sub truncate">{user?.business_name || user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="px-logout" data-testid="logout-button">
            <LogOut className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>}

      {/* Main */}
      <div className={`px-main ${isSmartHubLayout ? "px-main--full" : ""}`} data-testid="main-content-area">
        {/* Mobile header */}
        {!isSmartHubLayout && <header className="md:hidden px-mobile-header" data-testid="mobile-header">
          <ChurvoxLogo size="sm" dataTestId="mobile-logo" />
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <span className="text-xs font-semibold text-[#0d1b34]">{(user?.name || "").split(" ")[0]}</span>
          </div>
        </header>}

        <main className="flex-1">{children}</main>

        {/* Mobile bottom nav */}
        {!isSmartHubLayout && <nav className="md:hidden px-mobile-bottom" data-testid="mobile-bottom-nav">
          <div className="flex items-center justify-around px-2 py-1">
            {mainNav.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-mobile-tab ${active ? "is-active" : ""}`}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className={`px-mobile-tab ${moreOpen ? "is-active" : ""}`}
              data-testid="mobile-more-button"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </button>
          </div>

          {moreOpen && (
            <div
              className="absolute bottom-full left-0 right-0 bg-white border-t border-[#e6eef9] shadow-2xl max-h-[60vh] overflow-y-auto"
              data-testid="mobile-more-menu"
            >
              <div className="p-3 space-y-1">
                {moreNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold ${
                        isActive(item.path)
                          ? "bg-[#2563eb] text-white"
                          : "text-[#0d1b34] hover:bg-[#eff4ff]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  onClick={() => { setMoreOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-semibold text-[#dc2626] hover:bg-[#fff5f5]"
                >
                  <LogOut className="h-5 w-5" />Log out
                </button>
              </div>
            </div>
          )}
        </nav>}
      </div>

      <InstallPrompt />
    </div>
  );
}
