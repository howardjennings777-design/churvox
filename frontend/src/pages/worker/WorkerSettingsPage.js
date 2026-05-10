import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  HelpCircle,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";
import "../../styles/churvox-worker-settings.css";

function clean(value, fallback = "Not set") {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  return String(value).trim();
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="worker-settings-row">
      <div className="worker-settings-row-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default function WorkerSettingsPage() {
  const navigate = useNavigate();
  const { user, logout, checkAuth } = useAuth();
  const [showHelp, setShowHelp] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState("");

  const name = clean(user?.name || user?.full_name || user?.first_name, "Worker");
  const email = clean(user?.email, "No email saved");
  const business = clean(user?.business_name || user?.company_name, "Churvox Team");
  const role = clean(user?.role || user?.user_role, "worker").replace(/_/g, " ");
  const region = clean(user?.region || user?.area || user?.zone, "Not set");

  React.useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  async function refreshProfile() {
    setBusy("refresh");
    try {
      if (checkAuth) await checkAuth();
      setMessage("Profile refreshed");
    } catch {
      setMessage("Could not refresh profile");
    } finally {
      setBusy("");
    }
  }

  async function handleLogout() {
    setBusy("logout");
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="worker-settings-page">
      {message ? <div className="worker-settings-toast">{message}</div> : null}

      <header className="worker-settings-top">
        <div className="worker-settings-top-inner">
          <Link to="/worker/jobs" className="worker-settings-icon-btn" aria-label="Back to worker jobs">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <small>Worker App</small>
            <b>Settings</b>
          </div>
          <button
            type="button"
            className="worker-settings-icon-btn"
            onClick={refreshProfile}
            disabled={busy === "refresh"}
            aria-label="Refresh worker profile"
          >
            <RefreshCw size={19} />
          </button>
        </div>
      </header>

      <main className="worker-settings-shell">
        <section className="worker-settings-hero">
          <div className="worker-settings-avatar">
            <UserRound size={34} />
          </div>
          <div>
            <span>Field worker profile</span>
            <h1>{name}</h1>
            <p>Worker-only access for jobs, photos, notes, office help, and app setup.</p>
          </div>
        </section>

        <section className="worker-settings-actions">
          <button type="button" onClick={() => navigate("/worker/jobs")}>
            <Briefcase size={18} />
            My jobs
          </button>
          <button type="button" onClick={() => setShowHelp(true)}>
            <HelpCircle size={18} />
            Contact office
          </button>
          <button type="button" onClick={refreshProfile} disabled={busy === "refresh"}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </section>

        <section className="worker-settings-card">
          <div className="worker-settings-card-head">
            <div>
              <small>Profile</small>
              <h2>Your details</h2>
            </div>
            <img src="/brand/churvox-logo.svg" alt="Churvox" className="h-10 w-10 rounded-2xl shadow-sm" />
          </div>

          <Row icon={UserRound} label="Name" value={name} />
          <Row icon={Mail} label="Email" value={email} />
          <Row icon={Building2} label="Business" value={business} />
          <Row icon={ShieldCheck} label="Role" value={role} />
          <Row icon={Briefcase} label="Region / area" value={region} />
        </section>

        <section className="worker-settings-card" id="help">
          <div className="worker-settings-card-head">
            <div>
              <small>Help</small>
              <h2>Need office support?</h2>
            </div>
            <HelpCircle size={22} />
          </div>

          <p className="worker-settings-copy">
            Use this when your jobs are missing, the address is wrong, access is blocked, or you need instructions.
          </p>

          <button type="button" className="worker-settings-primary" onClick={() => setShowHelp(true)}>
            <HelpCircle size={18} />
            Contact office
          </button>
        </section>

        <section className="worker-settings-card">
          <div className="worker-settings-card-head">
            <div>
              <small>App setup</small>
              <h2>Phone settings</h2>
            </div>
            <Smartphone size={22} />
          </div>

          <Row icon={Smartphone} label="Install app" value="Browser menu → Add to Home screen" />
          <Row icon={Bell} label="Notifications" value="Job updates show inside Churvox" />
        </section>

        <section className="worker-settings-card worker-settings-safe">
          <div className="worker-settings-card-head">
            <div>
              <small>Safe worker access</small>
              <h2>Hidden from workers</h2>
            </div>
            <img src="/brand/churvox-logo.svg" alt="Churvox" className="h-10 w-10 rounded-2xl shadow-sm" />
          </div>

          <ul>
            <li>Owner pricing</li>
            <li>Invoices and billing</li>
            <li>Payroll and MYOB</li>
            <li>Admin settings</li>
            <li>GPS proof details</li>
          </ul>
        </section>

        <button
          type="button"
          className="worker-settings-logout"
          onClick={handleLogout}
          disabled={busy === "logout"}
        >
          <LogOut size={18} />
          {busy === "logout" ? "Logging out..." : "Log out"}
        </button>
      </main>

      <WorkerContactOfficePanel
        open={showHelp}
        onClose={() => setShowHelp(false)}
        defaultMessage="I need help with my Churvox worker account."
      />

      <WorkerBottomNav active="settings" />
    </div>
  );
}
