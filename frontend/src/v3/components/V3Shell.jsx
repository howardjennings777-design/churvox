import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  LogOut,
  MessageSquare,
  Plug,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Zap
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import V3Brand from "./V3Brand";
import V3CsvImport from "./V3CsvImport";
import "../styles/v3.css";

const navItems = [
  ["Smart Hub", "/dashboard", ShieldCheck],
  ["AI Operator", "/v3/operator", Sparkles],
  ["Decisions", "/v3/decisions", Sparkles],
  ["AI Run Sheet", "/v3/jobs", Briefcase],
  ["Crew Match", "/v3/dispatch", Calendar],
  ["Clients", "/v3/clients", Users],
  ["Quote Desk", "/v3/quotes", FileText],
  ["Money Board", "/v3/invoices", Receipt],
  ["Crew", "/v3/team", UserPlus],
  ["Pay Run", "/v3/payroll", DollarSign],
  ["Auto Rules", "/v3/rules", Zap],
  ["Reports", "/v3/reports", BarChart3],
  ["AI Messages", "/v3/messages", MessageSquare],
  ["Sync", "/v3/integrations", Plug],
  ["Billing", "/v3/plans", CreditCard],
  ["Settings", "/v3/settings", Settings],
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
  if (r === "worker") return navItems.filter(([label]) => ["AI Run Sheet", "Settings"].includes(label));
  if (r === "payroll") return navItems.filter(([label]) => ["Pay Run", "Settings"].includes(label));
  if (r === "office_admin") return navItems.filter(([label]) => !["Crew", "Pay Run", "Auto Rules", "Billing"].includes(label));
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
    navigate("/login", { replace: true });
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

          <V3CsvImport />

          <div className="v3-account">
            <div className="v3-user-pill">
              <div className="v3-avatar">{initials(user)}</div>
              <div className="min-w-0">
                <b>{user?.name || "Account"}</b>
                <span>{user?.business_name || user?.email || "Churvox"}</span>
              </div>
            </div>
            <button className="v3-logout-button" type="button" onClick={signOut} aria-label="Log out">
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        </header>

        <button className="v3-mobile-logout-float" type="button" onClick={signOut} aria-label="Log out">
          <LogOut size={18} />
          <span>Log out</span>
        </button>

        {children}
      </div>
    </div>
  );
}
