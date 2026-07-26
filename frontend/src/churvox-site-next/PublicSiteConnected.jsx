import React from "react";
import { ArrowRight, LockKeyhole, Mail, UserPlus } from "lucide-react";
import PublicSiteNext from "./PublicSiteNext";
import "./publicSiteConnected.css";

export const PUBLIC_SITE_CONNECTED_BUILD = "churvox-public-site-connected-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_PUBLIC_SITE_CONNECTED_BUILD__ = PUBLIC_SITE_CONNECTED_BUILD;
}

const WORKING_FLOWS = Object.freeze([
  {
    label: "Start 14-day trial",
    detail: "Open the current verified signup and email-verification flow.",
    href: "/signup",
    icon: UserPlus,
    primary: true,
  },
  {
    label: "Log in",
    detail: "Use the current secure role-aware login.",
    href: "/login",
    icon: LockKeyhole,
  },
  {
    label: "Request work",
    detail: "Open the current customer request form.",
    href: "/request",
    icon: ArrowRight,
  },
  {
    label: "Email Churvox",
    detail: "Email-first sales and support through hello@churvox.com.",
    href: "mailto:hello@churvox.com",
    icon: Mail,
  },
]);

export default function PublicSiteConnected() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="cvnextConnected" data-connected-public-replacement="true">
      <PublicSiteNext />
      <aside className={open ? "cvnextHandoff open" : "cvnextHandoff"} aria-label="Working Churvox journeys">
        <button
          type="button"
          className="cvnextHandoffToggle"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span><strong>Continue in working Churvox</strong><small>Verified routes, not preview submissions</small></span>
          <ArrowRight size={18} />
        </button>
        <div className="cvnextHandoffPanel">
          <header>
            <small>Safe staged cutover</small>
            <h2>The new public design hands into the proven journeys.</h2>
            <p>The preview forms remain non-mutating. These links open the current signup, login, request and email flows so no visitor receives a false success.</p>
          </header>
          <div className="cvnextHandoffLinks">
            {WORKING_FLOWS.map((flow) => {
              const Icon = flow.icon;
              return (
                <a key={flow.label} href={flow.href} className={flow.primary ? "primary" : ""}>
                  <Icon size={19} />
                  <span><strong>{flow.label}</strong><small>{flow.detail}</small></span>
                  <ArrowRight size={17} />
                </a>
              );
            })}
          </div>
          <footer>Live public routes are still unchanged. This private replacement is being proven before route cutover.</footer>
        </div>
      </aside>
    </div>
  );
}
