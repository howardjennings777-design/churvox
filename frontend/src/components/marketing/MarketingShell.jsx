import React from "react";
import MarketingNav from "./MarketingNav";
import MarketingFooter from "./MarketingFooter";

export default function MarketingShell({ children, footer = true, className = "" }) {
  return (
    <div
      className={className}
      style={{
        minHeight: "100vh",
        background: "var(--cx-bg)",
        color: "var(--cx-text)",
      }}
    >
      <MarketingNav />
      <main>{children}</main>
      {footer ? <MarketingFooter /> : null}
    </div>
  );
}
