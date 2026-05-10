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

const navGroups = [
  { label: "Workspace", items: [["Smart Hub", "/dashboard", LayoutDashboard], ["Jobs", "/jobs", Briefcase], ["Dispatch", "/dispatch", Calendar], ["Clients", "/clients", Users], ["Job Proofs", "/proof-to-paid", Sparkles]] },
  { label: "Sales", items: [["Quotes", "/quotes", FileText], ["Invoices", "/invoices", Receipt]] },
  { label: "Operations", items: [["Team", "/team", UserPlus], ["Payroll", "/payroll", DollarSign], ["Automation", "/automation", Zap], ["Reports", "/reports", BarChart3]] },
  { label: "Admin", items: [["Messages", "/sms", MessageSquare], ["Integrations", "/integrations", Plug], ["Billing", "/plans", CreditCard], ["Settings", "/settings", Settings]] },
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

function visibleGroups(role) {
  const r = String(role || "owner").toLowerCase();
  if (r === "worker") {
    return [{ label: "Worker", items: [["Jobs", "/worker/jobs", Briefcase], ["Settings", "/worker/settings", Settings]] }];
  }
  if (r === "payroll") {
    return [{ label: "Payroll", items: [["Payroll", "/payroll", DollarSign], ["Settings", "/settings", Settings]] }];
  }
  if (r === "manager") {
    return navGroups.map((group) => ({ ...group, items: group.items.filter(([label]) => label !== "Billing") }));
  }
  if (r === "office_admin") {
    return navGroups
      .map((group) => ({ ...group, items: group.items.filter(([label]) => !["Team", "Payroll", "Automation", "Billing"].includes(label)) }))
      .filter((group) => group.items.length);
  }
  return navGroups;
}

export default function V2Shell({ children, status = "Live workspace" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, normalizedRole } = useAuth();
  const role = normalizedRole || user?.role || "owner";
  const groups = visibleGroups(role);
  const flat = groups.flatMap((group) => group.items);
  const mobile = flat.slice(0, 5);
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="v2-shell">
      <aside className="v2-sidebar">
        <button type="button" className="v2-brand" onClick={() => navigate("/dashboard")}>
          <ChurvoxLogo size="md" />
        </button>
        <nav className="v2-nav">
          {groups.map((group) => (
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
        <button className="v2-logout" onClick={handleLogout} type="button"><LogOut size={17} /> Log out</button>
      </aside>

      <main className="v2-main">
        <div className="v2-mobile-top"><ChurvoxLogo size="sm" /><span className="v2-live-pill">{status}</span></div>
        {children}
        <nav className="v2-mobile-bottom">
          {mobile.map(([label, path, Icon]) => <Link className={isActive(path) ? "active" : ""} to={path} key={path}><Icon size={18} /><span>{label}</span></Link>)}
        </nav>
      </main>
    </div>
  );
}
