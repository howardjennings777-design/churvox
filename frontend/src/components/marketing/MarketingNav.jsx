import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChurvoxLogo } from "../ChurvoxLogo";
import { CxButton } from "../cx";

export default function MarketingNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: "/features", label: "Features" },
    { to: "/pricing", label: "Pricing" },
    { to: "/#workflow", label: "How it works" },
  ];

  const isActive = (to) => {
    const path = to.split("#")[0];
    if (!path || path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className="cx-mkt-nav"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: scrolled ? "rgba(247,243,234,0.92)" : "transparent",
        backdropFilter: scrolled ? "saturate(160%) blur(10px)" : "none",
        borderBottom: scrolled ? "1px solid var(--cx-border)" : "1px solid transparent",
        transition: "all 220ms ease",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "14px clamp(16px, 4vw, 28px)",
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <Link
          to="/"
          aria-label="Churvox home"
          style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
        >
          <ChurvoxLogo />
        </Link>

        <nav
          className="cx-mkt-nav-links"
          aria-label="Primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: 14,
          }}
        >
          {navLinks.map((l) => (
            <a
              key={l.to}
              href={l.to.startsWith("/#") ? l.to : undefined}
              onClick={(e) => {
                if (l.to.startsWith("/#") && location.pathname === "/") {
                  e.preventDefault();
                  const id = l.to.split("#")[1];
                  const el = document.getElementById(id);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              {l.to.startsWith("/#") ? (
                <span
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--cx-text-soft)",
                    cursor: "pointer",
                  }}
                >
                  {l.label}
                </span>
              ) : (
                <Link
                  to={l.to}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: isActive(l.to) ? "var(--cx-text)" : "var(--cx-text-soft)",
                    background: isActive(l.to) ? "var(--cx-accent-soft)" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  {l.label}
                </Link>
              )}
            </a>
          ))}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              <Link to="/dashboard" style={{ textDecoration: "none" }}>
                <CxButton variant="secondary" size="sm">
                  Go to dashboard
                </CxButton>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="cx-mkt-login-link"
                style={{
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--cx-text)",
                  padding: "8px 12px",
                }}
              >
                Log in
              </Link>
              <Link to="/signup" style={{ textDecoration: "none" }}>
                <CxButton variant="primary" size="sm">
                  Start free trial
                </CxButton>
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label="Open menu"
            className="cx-mkt-burger"
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "none",
              width: 38,
              height: 38,
              borderRadius: 10,
              border: "1px solid var(--cx-border-strong)",
              background: "var(--cx-surface)",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "block", width: 16, height: 2, background: "var(--cx-text)", margin: "4px auto" }} />
            <span style={{ display: "block", width: 16, height: 2, background: "var(--cx-text)", margin: "4px auto" }} />
            <span style={{ display: "block", width: 16, height: 2, background: "var(--cx-text)", margin: "4px auto" }} />
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="cx-mkt-mobile-menu"
          style={{
            display: "block",
            borderTop: "1px solid var(--cx-border)",
            background: "var(--cx-surface)",
            padding: "10px 16px 18px",
          }}
        >
          {navLinks.map((l) =>
            l.to.startsWith("/#") ? (
              <a
                key={l.to}
                href={l.to}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "12px 8px",
                  fontWeight: 600,
                  color: "var(--cx-text)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--cx-border-soft)",
                }}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.to}
                to={l.to}
                style={{
                  display: "block",
                  padding: "12px 8px",
                  fontWeight: 600,
                  color: "var(--cx-text)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--cx-border-soft)",
                }}
              >
                {l.label}
              </Link>
            )
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {user ? (
              <Link to="/dashboard" style={{ flex: 1, textDecoration: "none" }}>
                <CxButton variant="primary" size="md" className="w-full" style={{ width: "100%" }}>
                  Go to dashboard
                </CxButton>
              </Link>
            ) : (
              <>
                <Link to="/login" style={{ flex: 1, textDecoration: "none" }}>
                  <CxButton variant="secondary" size="md" style={{ width: "100%" }}>
                    Log in
                  </CxButton>
                </Link>
                <Link to="/signup" style={{ flex: 1, textDecoration: "none" }}>
                  <CxButton variant="primary" size="md" style={{ width: "100%" }}>
                    Start trial
                  </CxButton>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 820px) {
          .cx-mkt-nav-links { display: none !important; }
          .cx-mkt-login-link { display: none !important; }
          .cx-mkt-burger { display: inline-flex !important; align-items: center; justify-content: center; flex-direction: column; }
        }
      `}</style>
    </header>
  );
}
