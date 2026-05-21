import React from "react";

/**
 * Churvox status badge.
 * Tones: neutral, accent (lime), success, warning, danger, info.
 */
export default function CxBadge({ children, tone = "neutral", className = "", icon = null, ...rest }) {
  const cls = `cx-badge cx-badge--${tone} ${className}`.trim();
  return (
    <span className={cls} {...rest}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
