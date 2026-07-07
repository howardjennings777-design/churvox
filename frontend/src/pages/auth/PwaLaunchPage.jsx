import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getDefaultRoute } from "@/lib/roles";
import "./PwaLaunchPage.css";
import "./PwaLaunchLogoBlend.css";

function AppLogo() {
  return (
    <div className="pwaLaunchLogo" aria-label="Churvox logo">
      <img src="/churvox-mark.svg?v=transparent-real-mark-20260707" alt="Churvox" />
    </div>
  );
}

export default function PwaLaunchPage() {
  const navigate = useNavigate();
  const { user, loading, normalizedRole, isWorker, isPayroll, hasAppAccess } = useAuth();

  React.useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      if (!user) {
        navigate("/login?app=1", { replace: true });
        return;
      }
      if (isWorker) {
        navigate("/worker/today", { replace: true });
        return;
      }
      if (isPayroll) {
        navigate("/dashboard#payroll", { replace: true });
        return;
      }
      if (!hasAppAccess) {
        navigate("/plans", { replace: true });
        return;
      }
      navigate(getDefaultRoute(normalizedRole) || "/dashboard", { replace: true });
    }, 650);

    return () => window.clearTimeout(timer);
  }, [hasAppAccess, isPayroll, isWorker, loading, navigate, normalizedRole, user]);

  return (
    <main className="pwaLaunchScreen" data-version="CHURVOX_TRANSPARENT_REAL_LOGO_LAUNCH_20260707">
      <section className="pwaLaunchCard" aria-label="Opening Churvox">
        <AppLogo />
        <h1>Churvox</h1>
        <p>Loading secure sign in.</p>
        <div className="pwaLaunchLoader"><span /></div>
        <small>Workers and owners sign in here</small>
      </section>
    </main>
  );
}
