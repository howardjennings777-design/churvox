import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./FloatingBottomNav.css";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/invite/setup",
  "/public/",
  "/client-portal",
  "/privacy",
  "/terms",
  "/account-deletion",
];

function isPublicPath(pathname) {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function DockLink({ item, onClick }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) => `cv-float-link ${isActive ? "is-active" : ""}`}
    >
      <span className="cv-float-icon" aria-hidden="true">{item.icon}</span>
      <span className="cv-float-label">{item.label}</span>
    </NavLink>
  );
}

export default function FloatingBottomNav() {
  const { user, normalizedRole, isWorker, isPayroll } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const shouldShow = Boolean(user) && !isPublicPath(location.pathname) && !location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!shouldShow) {
      setOpen(false);
      document.body.classList.remove("cv-has-floating-dock");
      return;
    }

    document.body.classList.add("cv-has-floating-dock");
    return () => document.body.classList.remove("cv-has-floating-dock");
  }, [shouldShow]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const { primary, secondary } = useMemo(() => {
    if (isWorker || normalizedRole === "worker") {
      return {
        primary: [
          { to: "/worker/jobs", label: "Jobs", icon: "◆" },
          { to: "/worker/settings", label: "Me", icon: "◉" },
        ],
        secondary: [
          { to: "/dashboard", label: "Desk", icon: "⌁" },
          { to: "/settings", label: "Settings", icon: "⚙" },
        ],
      };
    }

    if (isPayroll || normalizedRole === "payroll") {
      return {
        primary: [
          { to: "/payroll", label: "Payroll", icon: "◍" },
          { to: "/reports", label: "Reports", icon: "▦" },
          { to: "/settings", label: "Settings", icon: "⚙" },
        ],
        secondary: [
          { to: "/dashboard", label: "Desk", icon: "⌁" },
          { to: "/jobs", label: "Jobs", icon: "◼" },
        ],
      };
    }

    return {
      primary: [
        { to: "/dashboard", label: "Desk", icon: "⌁" },
        { to: "/jobs", label: "Jobs", icon: "◼" },
        { to: "/clients", label: "Clients", icon: "◎" },
        { to: "/invoices", label: "Money", icon: "$" },
        { to: "/team", label: "Crew", icon: "✦" },
      ],
      secondary: [
        { to: "/quotes", label: "Quotes", icon: "◇" },
        { to: "/calendar", label: "Calendar", icon: "□" },
        { to: "/ai-operator", label: "AI Room", icon: "✺" },
        { to: "/automation", label: "Automation", icon: "⚡" },
        { to: "/reports", label: "Reports", icon: "▦" },
        { to: "/settings", label: "Settings", icon: "⚙" },
        { to: "/plans", label: "Plan", icon: "◌" },
      ],
    };
  }, [isPayroll, isWorker, normalizedRole]);

  if (!shouldShow) return null;

  return (
    <>
      <div className={`cv-float-more ${open ? "is-open" : ""}`}>
        <div className="cv-float-more-head">
          <span>Quick nav</span>
          <button type="button" onClick={() => setOpen(false)}>Close</button>
        </div>
        <div className="cv-float-more-grid">
          {secondary.map((item) => <DockLink key={item.to} item={item} onClick={() => setOpen(false)} />)}
        </div>
      </div>

      <nav className="cv-floating-dock" aria-label="Churvox quick navigation">
        <div className="cv-floating-dock__inner">
          {primary.map((item) => <DockLink key={item.to} item={item} />)}

          {secondary.length ? (
            <button
              type="button"
              className={`cv-float-link cv-float-more-button ${open ? "is-active" : ""}`}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="cv-float-icon" aria-hidden="true">＋</span>
              <span className="cv-float-label">More</span>
            </button>
          ) : null}
        </div>
      </nav>
    </>
  );
}
