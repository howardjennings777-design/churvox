import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "./ChurvoxLogo";
import { hasPlanAccess, normalizePlan } from "../utils/planRules";
import { InstallPrompt } from "./InstallPrompt";
import { isOwner as isOwnerRole, canAccess } from "../lib/roles";
import {
  LayoutDashboard, Briefcase, Calendar, Users, MoreHorizontal, LogOut,
  Settings, FileText, Receipt, CreditCard, UserPlus, MessageSquare, DollarSign,
} from "lucide-react";

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

  const mainNavItems = [
    canAccess(role, "dashboard") && { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
    canAccess(role, "jobs") && { path: "/jobs", label: "Jobs", icon: Briefcase },
    canAccess(role, "calendar") && { path: "/calendar", label: "Calendar", icon: Calendar },
    canAccess(role, "clients") && { path: "/clients", label: "Clients", icon: Users },
  ].filter(Boolean);

  const moreItems = [
    canAccess(role, "team") && hasPlanAccess(safePlan, "team") && { path: "/team", label: "Team", icon: UserPlus },
    canAccess(role, "quotes") && { path: "/quotes", label: "Quotes", icon: FileText },
    canAccess(role, "invoices") && { path: "/invoices", label: "Invoices", icon: Receipt },
    canAccess(role, "payroll") && { path: "/payroll", label: "Payroll", icon: DollarSign },
    canAccess(role, "sms") && { path: "/sms", label: "SMS", icon: MessageSquare },
    isOwnerUser && { path: "/plans", label: "Plans", icon: CreditCard },
    canAccess(role, "settings") && { path: "/settings", label: "Settings", icon: Settings },
  ].filter(Boolean);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="tap-safe-root min-h-screen bg-slate-50" data-testid="layout-container">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r border-slate-200 z-40" data-testid="desktop-sidebar">
        <div className="flex items-center justify-center px-5 h-16 border-b border-slate-200">
          <ChurvoxLogo size="lg" dataTestId="sidebar-logo" />
        </div>

        <div className="px-5 py-3 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-900 truncate" data-testid="user-name">{user?.name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.business_name || user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-600" data-testid="user-role-badge">
            {(role || "").replace(/_/g, " ")}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {mainNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          ))}

          {moreItems.length > 0 && (
            <div className="pt-3 mt-3 border-t border-slate-200 space-y-1">
              {moreItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            data-testid="logout-button"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-64 min-h-screen flex flex-col" data-testid="main-content-area">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30" data-testid="mobile-header">
          <ChurvoxLogo size="sm" dataTestId="mobile-logo" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{user?.name?.split(" ")[0]}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-area-bottom" data-testid="mobile-bottom-nav">
          <div className="flex items-center justify-around py-1.5">
            {mainNavItems.slice(0, 4).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] ${
                  isActive(item.path) ? "text-blue-600" : "text-slate-400"
                }`}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] ${moreOpen ? "text-blue-600" : "text-slate-400"}`}
              data-testid="mobile-more-button"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>

          {moreOpen && (
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-slate-200 shadow-lg max-h-[60vh] overflow-y-auto" data-testid="mobile-more-menu">
              <div className="p-3 space-y-1">
                {moreItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                      isActive(item.path) ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => { setMoreOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
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
