import React from "react";

export default function V3Brand({ compact = false }) {
  return (
    <div className="v3-brand">
      <div className="v3-mark" aria-hidden="true">
        <span className="v3-cut a" />
        <span className="v3-cut b" />
      </div>
      {!compact && (
        <div className="v3-word">
          <strong>Churvox</strong>
          <span>Trade OS</span>
        </div>
      )}
    </div>
  );
}
