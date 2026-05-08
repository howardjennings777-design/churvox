import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Users,
  FileText,
  Receipt,
  UserPlus,
  DollarSign,
  Zap,
  BarChart3,
  MessageSquare,
  Plug,
  CreditCard,
  Settings,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import { canAccess } from "../../lib/roles";

const navGroups = [
  {
    label: "Workspace",
    items: [
      ["Smart Hub", "/dashboard", LayoutDashboard, "dashboard"],
      ["Jobs", "/jobs", Briefcase, "jobs"],
      ["Dispatch", "/dispatch", Calendar, "calendar"],
      ["Clients", "/clients", Users, "clients"],
      ["Job Proofs", "/proof-to-paid", Sparkles, "proof_to_paid"],
    ],
  },
  {
    label: "Sales",
    items: [
      ["Quotes", "/quotes", FileText, "quotes"],
      ["Invoices", "/invoices", Receipt, "invoices"],
    ],
  },
  {
    label: "Operations",
    items: [
      ["Team", "/team", UserPlus, "team"],
      ["Payroll", "/payroll", DollarSign, "payroll"],
      ["Automation", "/automation", Zap, "automation"],
      ["Reports", "/reports", BarChart3, "reports"],
    ],
  },
  {
    label: "Admin",
    items: [
      ["Messages", "/sms", MessageSquare, "sms"],
      ["Integrations", "/integrations", Plug, "integrations"],
      ["Billing", "/plans", CreditCard, "plans"],
      ["Settings", "/settings", Settings, "settings"],
    ],
  },
];

function getInitials(user) {
  return String(user?.name || user?.email || "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function V2Shell({ children, status = "Live workspace" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, normalizedRole } = useAuth();
  const role = normalizedRole || user?.role || "owner";

  const allowedGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(([label, path, Icon, access]) => {
        if (access === "automation") return ["owner", "employer", "manager"].includes(role);
        if (access === "plans") return ["owner", "employer"].includes(role);
        return canAccess(role, access);
      }),
    }))
    .filter((group) => group.items.length > 0);

  const flat = allowedGroups.flatMap((group) => group.items);
  const mobile = flat.slice(0, 5);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="v2-shell">
      <aside className="v2-sidebar">
        <div className="v2-brand">
          <ChurvoxLogo size="md" />
        </div>
        <nav className="v2-nav">
          {allowedGroups.map((group) => (
            <div className="v2-nav-group" key={group.label}>
              <div className="v2-nav-label">{group.label}</div>
              {group.items.map(([label, path, Icon]) => (
                <Link className={`v2-nav-link ${isActive(path) ? "active" : ""}`} to={path} key={path}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="v2-user-card">
          <div className="v2-avatar">{getInitials(user)}</div>
          <div className="min-w-0">
            <b>{user?.name || "Account"}</b>
            <span>{user?.business_name || user?.email || "Churvox"}</span>
          </div>
        </div>
        <button className="v2-logout" onClick={handleLogout} type="button">
          <LogOut size={17} /> Log out
        </button>
      </aside>

      <main className="v2-main">
        <div className="v2-mobile-top">
          <ChurvoxLogo size="sm" />
          <span className="v2-live-pill">{status}</span>
        </div>
        {children}
        <nav className="v2-mobile-bottom">
          {mobile.map(([label, path, Icon]) => (
            <Link className={isActive(path) ? "active" : ""} to={path} key={path}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
