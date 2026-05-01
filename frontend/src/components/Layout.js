import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "./ChurvoxLogo";
import { hasPlanAccess, normalizePlan } from "../utils/planRules";
import { InstallPrompt } from "./InstallPrompt";
import { canAccess } from "../lib/roles";
import PageAIReviewPanel from "./ai/PageAIReviewPanel";
import AIOperationsEnginePanel from "./ai/AIOperationsEnginePanel";
import {
  LayoutDashboard, Briefcase, Users, MoreHorizontal, LogOut,
  Settings, FileText, Receipt, CreditCard, UserPlus, DollarSign, Zap, ListChecks, CalendarDays,
} from "lucide-react";
import NotificationsBell from "./NotificationsBell";
import HelpDropdown from "./HelpDropdown";
import FirstRunGuide from "./FirstRunGuide";

function aiAreaForPath(pathname) {
  if (pathname === "/jobs" || pathname.startsWith("/jobs/")) return "jobs";
  if (pathname === "/schedule" || pathname === "/calendar" || pathname === "/dispatch") return "schedule";
  if (pathname === "/quotes" || pathname.startsWith("/quotes/")) return "quotes";
  if (pathname === "/invoices" || pathname.startsWith("/invoices/")) return "invoices";
  if (pathname === "/clients" || pathname.startsWith("/clients/")) return "clients";
  if (pathname === "/team" || pathname.startsWith("/team/")) return "team";
  if (pathname === "/automation" || pathname.startsWith("/automation/")) return "automation";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "setup";
  return null;
}

export default function Layout({ children }) {
  const { user, logout, normalizedRole, isOwnerUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const safePlan = normalizePlan(user?.plan);
  const role = normalizedRole || "owner";
  const showHelp = role !== "worker";
  const routeAIArea = role !== "worker" && role !== "payroll" ? aiAreaForPath(location.pathname) : null;
  const showAIOperationsEngine = false;
  const showQuickCreate = role !== "worker" && role !== "payroll" && location.pathname !== "/smart-hub";
  const quickItems = [
    { label: "New job", to: "/jobs/new" },
    { label: "New client", to: "/clients/new" },
    { label: "New quote", to: "/quotes/new" },
    { label: "New invoice", to: "/invoices/new" },
    { label: "New team member", to: "/team", require: "team" },
  ];
  const visibleQuickItems = useMemo(() => quickItems.filter((item) => !item.require || canAccess(role, item.require)), [role]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    canAccess(role, "smart_hub") && { path: "/smart-hub", label: "Smart Hub", icon: LayoutDashboard, group: "Core" },
    canAccess(role, "jobs") && { path: "/jobs", label: "Jobs", icon: Briefcase, group: "Core" },
    canAccess(role, "jobs") && { path: "/schedule", label: "Schedule", icon: CalendarDays, group: "Core" },
    canAccess(role, "clients") && { path: "/clients", label: "Clients", icon: Users, group: "Core" },
    canAccess(role, "quotes") && { path: "/quotes", label: "Quotes", icon: FileText, group: "Operations" },
    canAccess(role, "invoices") && { path: "/invoices", label: "Invoices", icon: Receipt, group: "Operations" },
    (role === "owner" || role === "employer" || role === "manager" || role === "office_admin") && { path: "/follow-ups", label: "Follow-ups", icon: ListChecks, group: "Operations" },
    canAccess(role, "team") && (isOwnerUser || hasPlanAccess(safePlan, "team")) && { path: "/team", label: "Team", icon: UserPlus, group: "Operations" },
    (role === "owner" || role === "employer" || role === "manager") && { path: "/automation", label: "Automation", icon: Zap, group: "Operations" },
    canAccess(role, "payroll") && { path: "/timesheets", label: "Timesheets", icon: DollarSign, group: "Operations" },
    canAccess(role, "integrations") && { path: "/integrations", label: "Integrations", icon: Zap, group: "Admin" },
    isOwnerUser && { path: "/plans", label: "Plans & Billing", icon: CreditCard, group: "Admin" },
    canAccess(role, "settings") && { path: "/settings", label: "Settings", icon: Settings, group: "Admin" },
    { path: "/help", label: "Help", icon: FileText, group: "Admin" },
    { path: "/support", label: "Support", icon: Users, group: "Admin" },
  ].filter(Boolean);

  const mainNav = navItems.slice(0, 4);
  const moreNav = navItems.slice(4);
  const grouped = {
    Core: navItems.filter((n) => n.group === "Core"),
    Operations: navItems.filter((n) => n.group === "Operations"),
    Admin: navItems.filter((n) => n.group === "Admin"),
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/") || (path === "/smart-hub" && location.pathname === "/dashboard");

  return (
    <div className="cx-app-shell tap-safe-root min-h-screen overflow-x-clip" data-testid="layout-container">
      <aside className="hidden md:flex md:flex-col md:w-[272px] md:fixed md:inset-y-0 z-40" data-testid="desktop-sidebar">
        <div className="h-[92px] px-5 border-b border-slate-700/70 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <ChurvoxLogo size="sm" dataTestId="sidebar-logo" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-300/70">Churvox</p>
              <p className="text-sm font-semibold text-white">Smart Hub</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <NotificationsBell />
          </div>
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
          {showHelp && (
            <div>
              <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.16em]" data-nav="group-label">Support</p>
              <HelpDropdown sidebar />
            </div>
          )}
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
            {showHelp && <HelpDropdown />}
            <NotificationsBell />
            <span className="text-xs font-medium text-slate-300">{user?.name?.split(" ")[0]}</span>
          </div>
        </header>

        <main className="flex-1">
          {showQuickCreate && (
            <div className="cx-page pb-0">
              <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <button type="button" onClick={() => setQuickOpen((v) => !v)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Quick Create ▾</button>
                {quickOpen && (
                  <div className="absolute mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-20">
                    {visibleQuickItems.map((item) => (
                      <Link key={item.to} to={item.to} onClick={() => setQuickOpen(false)} className="block rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{item.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {showAIOperationsEngine && (
            <div className="cx-page pb-0" data-testid="ai-operations-engine-container">
              <AIOperationsEnginePanel />
            </div>
          )}
          {routeAIArea && (
            <div className="cx-page pb-0" data-testid="route-ai-review-container">
              <PageAIReviewPanel area={routeAIArea} />
            </div>
          )}
          {children}
        </main>

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
                {showHelp && <HelpDropdown sidebar />}
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
      <FirstRunGuide user={user} enabled={showHelp && location.pathname !== "/plans"} />
    </div>
  );
}
