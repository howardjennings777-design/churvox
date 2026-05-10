import churvoxLogoIcon from "../assets/churvox-logo-icon.svg";
import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { <img className="churvox-logo-force" src={churvoxLogoIcon} alt="Churvox" /> ChurvoxLogo } from "./ChurvoxLogo";
import { hasPlanAccess, normalizePlan } from "../utils/planRules";
import { InstallPrompt } from "./InstallPrompt";
import { canAccess } from "../lib/roles";
import {
  LayoutDashboard, Briefcase, Calendar, Users, MoreHorizontal, LogOut,
  Settings, FileText, Receipt, CreditCard, UserPlus, MessageSquare, DollarSign, Zap,
  Sparkles, Plug,
} from "lucide-react";
import NotificationsBell from "./NotificationsBell";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const pendingAiActionCount = (data) => {
  const actions = safeArray(data?.actions);
  if (actions.length) {
    return actions.filter((action) => ["pending", "edited", "needs_review"].includes(String(action?.status || "pending").toLowerCase())).length;
  }
  const count = Number(data?.count ?? data?.pending_count ?? 0);
  return Number.isFinite(count) ? count : 0;
};

export default function Layout({ children, smartHubMode = false }) {
  const { user, logout, normalizedRole, isOwnerUser } = useAuth();
  const { get } = useApi();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [aiQueueCount, setAiQueueCount] = useState(0);
  const safePlan = normalizePlan(user?.plan);
  const role = normalizedRole || "owner";

  const isSmartHubRoute = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  const embedded = (() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("embedded") === "1" || window.self !== window.top;
  })();
  const isSmartHubLayout = smartHubMode || isSmartHubRoute;
  const hideChrome = isSmartHubLayout || embedded;
  const canSeeAiQueue = !hideChrome && canAccess(role, "ai_operator");

  const loadAiQueue = useCallback(async () => {
    if (!canSeeAiQueue) {
      setAiQueueCount(0);
      return;
    }
    const res = await get("/ai/operator/queue");
    if (res?.success || res?.ok) {
      setAiQueueCount(pendingAiActionCount(res.data || res));
    }
  }, [canSeeAiQueue, get]);

  useEffect(() => {
    loadAiQueue();
    if (!canSeeAiQueue) return undefined;
    const timer = setInterval(loadAiQueue, 60000);
    return () => clearInterval(timer);
  }, [canSeeAiQueue, loadAiQueue, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Main navigation stays business-first. AI runs in the background and only appears through the global queue notice.
  const groups = [
    {
      label: "Workspace",
      items: [
        canAccess(role, "dashboard") && { path: "/dashboard", label: "Smart Hub", icon: LayoutDashboard },
        canAccess(role, "jobs") && { path: "/v3/jobs", label: "Jobs", icon: Briefcase },
        canAccess(role, "calendar") && { path: "/v3/dispatch", label: "Dispatch", icon: Calendar },
        canAccess(role, "clients") && { path: "/v3/clients", label: "Clients", icon: Users },
        canAccess(role, "proof_to_paid") && { path: "/v3/proof", label: "Job Proofs", icon: Sparkles },
      ].filter(Boolean),
    },
    {
      label: "Sales",
      items: [
        canAccess(role, "quotes") && { path: "/v3/quotes", label: "Quotes", icon: FileText },
        canAccess(role, "invoices") && { path: "/v3/invoices", label: "Invoices", icon: Receipt },
      ].filter(Boolean),
    },
    {
      label: "Operations",
      items: [
        canAccess(role, "team") && (isOwnerUser || hasPlanAccess(safePlan, "team")) && { path: "/v3/team", label: "Team", icon: UserPlus },
        canAccess(role, "payroll") && { path: "/v3/payroll", label: "Payroll", icon: DollarSign },
        (role === "owner" || role === "employer" || role === "manager") && { path: "/v3/rules", label: "Automations", icon: Zap },
        canAccess(role, "reports") && { path: "/v3/reports", label: "Reports", icon: FileText },
      ].filter(Boolean),
    },
    {
      label: "Admin",
      items: [
        canAccess(role, "sms") && { path: "/v3/messages", label: "Messages", icon: MessageSquare },
        canAccess(role, "integrations") && { path: "/v3/integrations", label: "Integrations", icon: Plug },
        isOwnerUser && { path: "/v3/plans", label: "Billing", icon: CreditCard },
        canAccess(role, "settings") && { path: "/v3/settings", label: "Settings", icon: Settings },
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

  const openAiQueue = () => navigate("/ai-operator/approvals");

  return (
    <div className={`px-app tap-safe-root cx-app-shell ${embedded ? "px-app--embedded" : ""}`} data-testid="layout-container" data-route={location.pathname}>
      {/* Desktop Sidebar — Premium light */}
      {!hideChrome && <aside className="px-sidebar hidden md:flex" data-testid="desktop-sidebar">
        <div className="px-sidebar__brand">
          <ChurvoxLogo size="md" dataTestId="sidebar-logo" />
          <NotificationsBell />
        </div>

        {canSeeAiQueue && aiQueueCount > 0 && (
          <button type="button" onClick={openAiQueue} className="ai-global-queue-card" data-testid="global-ai-approval-queue">
            <span><Sparkles className="h-4 w-4" /> AI queue</span>
            <strong>{aiQueueCount} waiting for review</strong>
            <small>Tap to open approval queue</small>
          </button>
        )}

        <nav className="px-sidebar__nav">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="px-nav-group">{g.label}</div>
              {g.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                const badge = Number(item.badge || 0);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-nav-item ${active ? "is-active" : ""}`}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="px-nav-item__icon h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                    {badge > 0 && <em className="ai-global-queue-badge">{badge}</em>}
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
      <div className={`px-main ${hideChrome ? "px-main--full" : ""} ${embedded ? "px-main--embedded" : ""}`} data-testid="main-content-area">
        {/* Mobile header */}
        {!hideChrome && <header className="md:hidden px-mobile-header" data-testid="mobile-header">
          <ChurvoxLogo size="sm" dataTestId="mobile-logo" />
          <div className="flex items-center gap-2">
            {canSeeAiQueue && aiQueueCount > 0 && (
              <button type="button" onClick={openAiQueue} className="ai-mobile-queue-pill" data-testid="mobile-ai-approval-queue">
                <Sparkles className="h-3.5 w-3.5" /> {aiQueueCount}
              </button>
            )}
            <NotificationsBell />
            <span className="text-xs font-semibold text-[#0d1b34]">{(user?.name || "").split(" ")[0]}</span>
          </div>
        </header>}

        <main className="flex-1">{children}</main>

        {/* Mobile bottom nav */}
        {!hideChrome && <nav className="md:hidden px-mobile-bottom" data-testid="mobile-bottom-nav">
          <div className="flex items-center justify-around px-2 py-1">
            {mainNav.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              const badge = Number(item.badge || 0);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-mobile-tab ${active ? "is-active" : ""}`}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span className="relative inline-flex">
                    <Icon className="h-5 w-5" />
                    {badge > 0 && <em className="ai-mobile-tab-dot">{badge}</em>}
                  </span>
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
                  const badge = Number(item.badge || 0);
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
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && <em className="ai-global-queue-badge">{badge}</em>}
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

      {!embedded && <InstallPrompt />}
    </div>
  );
}
