import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Briefcase, Calendar, CreditCard, DollarSign, FileText, LogOut, MessageSquare, Plug, Receipt, Settings, ShieldCheck, UserPlus, Users, Zap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import V3Brand from "./V3Brand";
import "../styles/v3.css";

const navItems = [
  ["Hub", "/dashboard", ShieldCheck],
  ["Jobs", "/v3/jobs", Briefcase],
  ["Dispatch", "/v3/dispatch", Calendar],
  ["Clients", "/v3/clients", Users],
  ["Quotes", "/v3/quotes", FileText],
  ["Invoices", "/v3/invoices", Receipt],
  ["Team", "/v3/team", UserPlus],
  ["Payroll", "/v3/payroll", DollarSign],
  ["Rules", "/automation", Zap],
  ["Reports", "/v3/reports", BarChart3],
  ["Messages", "/sms", MessageSquare],
  ["Sync", "/integrations", Plug],
  ["Billing", "/plans", CreditCard],
  ["Settings", "/settings", Settings],
];

function initials(user) {
  return String(user?.name || user?.email || "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function visible(role) {
  const r = String(role || "owner").toLowerCase();
  if (r === "worker") return navItems.filter(([label]) => ["Jobs", "Settings"].includes(label));
  if (r === "payroll") return navItems.filter(([label]) => ["Payroll", "Settings"].includes(label));
  if (r === "office_admin") return navItems.filter(([label]) => !["Team", "Payroll", "Rules", "Billing"].includes(label));
  if (r === "manager") return navItems.filter(([label]) => label !== "Billing");
  return navItems;
}

export default function V3Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, normalizedRole } = useAuth();
  const items = visible(normalizedRole || user?.role || "owner");
  const active = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="v3-app">
      <div className="v3-shell">
        <header className="v3-topbar">
          <button className="v3-brand-button" type="button" onClick={() => navigate("/dashboard")}>
            <V3Brand />
          </button>

          <nav className="v3-nav">
            {items.map(([label, path, Icon]) => (
              <Link className={active(path) ? "active" : ""} to={path} key={path}>
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="v3-account">
            <div className="v3-user-pill">
              <div className="v3-avatar">{initials(user)}</div>
              <div className="min-w-0">
                <b>{user?.name || "Account"}</b>
                <span>{user?.business_name || user?.email || "Churvox"}</span>
              </div>
            </div>
            <button className="v3-icon-button" type="button" onClick={signOut} aria-label="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
