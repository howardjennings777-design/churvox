import React from "react";

export default function V3Brand({ compact = false, light = false }) {
  return (
    <div className="v3-brand">
      <div className="v3-brand-mark" aria-hidden="true">
        <span className="v3-bolt v3-bolt-a" />
        <span className="v3-bolt v3-bolt-b" />
        <span className="v3-brand-cut v3-cut-a" />
        <span className="v3-brand-cut v3-cut-b" />
      </div>
      {!compact && (
        <div className="v3-brand-wordmark">
          <strong className={light ? "light" : ""}>Churvox</strong>
          <span>Trade OS</span>
        </div>
      )}
    </div>
  );
}
