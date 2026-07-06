import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getDefaultRoute } from "@/lib/roles";
import "./PwaLaunchPage.css";

function AppLogo() {
  return (
    <div className="pwaLaunchLogo" aria-hidden="true">
      <svg viewBox="0 0 128 128" focusable="false">
        <defs>
          <linearGradient id="pwaBg" x1="18" y1="10" x2="112" y2="118" gradientUnits="userSpaceOnUse">
            <stop stopColor="#161c18" />
            <stop offset="0.58" stopColor="#090d0b" />
            <stop offset="1" stopColor="#030404" />
          </linearGradient>
          <linearGradient id="pwaOrange" x1="21" y1="18" x2="105" y2="109" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffad55" />
            <stop offset="0.5" stopColor="#f97316" />
            <stop offset="1" stopColor="#dc3f17" />
          </linearGradient>
          <linearGradient id="pwaWhite" x1="39" y1="43" x2="95" y2="86" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#dce3ec" />
          </linearGradient>
          <filter id="pwaLift" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.36" />
          </filter>
        </defs>
        <rect x="7" y="7" width="114" height="114" rx="29" fill="url(#pwaBg)" />
        <rect x="8.5" y="8.5" width="111" height="111" rx="27.5" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2" />
        <g filter="url(#pwaLift)">
          <path d="M92 38C85 27 73 21 60 21C37 21 18 40 18 64C18 88 37 107 60 107C75 107 87 100 95 89" fill="none" stroke="url(#pwaOrange)" strokeWidth="15" strokeLinecap="round" />
          <path d="M39 66L56 82L92 43" fill="none" stroke="url(#pwaWhite)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <circle cx="95" cy="38" r="6.5" fill="#f97316" />
      </svg>
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
    }, 1050);

    return () => window.clearTimeout(timer);
  }, [hasAppAccess, isPayroll, isWorker, loading, navigate, normalizedRole, user]);

  return (
    <main className="pwaLaunchScreen" data-version="CHURVOX_REAL_PWA_LAUNCH_20260707">
      <section className="pwaLaunchCard" aria-label="Opening Churvox">
        <AppLogo />
        <h1>Churvox</h1>
        <p>Does the admin. <strong>You approve.</strong></p>
        <div className="pwaLaunchLoader"><span /></div>
        <small>Opening owner command floor</small>
      </section>
    </main>
  );
}
