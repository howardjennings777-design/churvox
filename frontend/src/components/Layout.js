import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "./ChurvoxLogo";
import { InstallPrompt } from "./InstallPrompt";
import { LayoutDashboard, Briefcase, Calendar, Users, MoreHorizontal, LogOut, Settings, FileText, Receipt, CreditCard, UserPlus, MessageSquare } from "lucide-react";

export default function Layout({ children }) {
  const { user, logout, isEmployer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const mainNavItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/jobs", label: "Jobs", icon: Briefcase },
    { path: "/calendar", label: "Calendar", icon: Calendar },
    { path: "/clients", label: "Clients", icon: Users },
  ];

  const moreItems = isEmployer
    ? [
        { path: "/team", label: "Team", icon: UserPlus },
        { path: "/quotes", label: "Quotes", icon: FileText },
        { path: "/invoices", label: "Invoices", icon: Receipt },
        { path: "/sms", label: "SMS", icon: MessageSquare },
        { path: "/plans", label: "Plans", icon: CreditCard },
        { path: "/settings", label: "Settings", icon: Settings },
      ]
    : [
        { path: "/settings", label: "Settings", icon: Settings },
      ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen bg-churvox-bg" data-testid="layout-container">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-churvox-card border-r border-churvox-border z-40" data-testid="desktop-sidebar">
        {/* Logo */}
        <div className="flex items-center justify-center px-5 h-20 border-b border-churvox-border">
          <ChurvoxLogo size="lg" dataTestId="sidebar-logo" />
        </div>

        {/* User Info */}
        <div className="px-5 py-3 border-b border-churvox-border">
          <p className="text-sm font-medium text-white truncate" data-testid="user-name">{user?.name}</p>
          <p className="text-xs text-churvox-muted truncate">{user?.business_name || user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-churvox-accent/20 text-churvox-accent" data-testid="user-role-badge">
            {user?.role}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto" data-testid="desktop-nav">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path} data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active ? "bg-churvox-accent text-white" : "text-churvox-muted hover:bg-white/5 hover:text-white"
                }`}>
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-churvox-border">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-churvox-muted">More</p>
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link key={item.path} to={item.path} data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active ? "bg-churvox-accent text-white" : "text-churvox-muted hover:bg-white/5 hover:text-white"
                  }`}>
                  <Icon size={18} /> {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout & Footer */}
        <div className="p-3 border-t border-churvox-border">
          <button onClick={handleLogout} data-testid="logout-button"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} /> Logout
          </button>
          <div className="flex gap-3 px-3 pt-2 text-[10px] text-churvox-muted/50">
            <Link to="/privacy" className="hover:text-churvox-muted transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-churvox-muted transition-colors">Terms</Link>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-churvox-card border-b border-churvox-border flex items-center justify-between px-4 z-40" data-testid="mobile-header">
        <div className="flex items-center gap-2">
          <ChurvoxLogo size="md" dataTestId="mobile-logo" />
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-churvox-accent/20 text-churvox-accent">
            {user?.role}
          </span>
          <button onClick={handleLogout} className="p-2 text-churvox-muted hover:text-red-400" data-testid="mobile-logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen" data-testid="main-content">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-churvox-card border-t border-churvox-border z-40 safe-area-bottom" data-testid="mobile-bottom-nav">
        <div className="flex items-center justify-around h-16">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path} data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium transition-all ${
                  active ? "text-churvox-accent" : "text-churvox-muted"
                }`}>
                <Icon size={20} /> {item.label}
              </Link>
            );
          })}

          {/* More Button */}
          <div className="relative">
            <button onClick={() => setMoreOpen(!moreOpen)} data-testid="mobile-more-button"
              className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium transition-all ${
                moreOpen ? "text-churvox-accent" : "text-churvox-muted"
              }`}>
              <MoreHorizontal size={20} /> More
            </button>

            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div className="absolute bottom-full right-0 mb-2 bg-churvox-card border border-churvox-border rounded-xl shadow-2xl py-2 min-w-[180px] z-50" data-testid="mobile-more-dropdown">
                  {moreItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path} data-testid={`mobile-more-${item.label.toLowerCase()}`}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-churvox-muted hover:bg-white/5 hover:text-white transition-all">
                        <Icon size={16} /> {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
      <InstallPrompt />
    </div>
  );
}
