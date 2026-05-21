import React from "react";

/**
 * Churvox primitive Card.
 * Variants: default (white), soft (warm cream), flat (no shadow).
 */
export default function CxCard({
  children,
  variant = "default",
  padded = true,
  className = "",
  style,
  onClick,
  as: As = "div",
  ...rest
}) {
  const variantCls =
    variant === "soft" ? " cx-card-v2--soft" : variant === "flat" ? " cx-card-v2--flat" : "";
  const cls = `cx-card-v2${variantCls} ${className}`.trim();
  const inlineStyle = padded ? style : { ...style, padding: 0 };
  return (
    <As
      className={cls}
      style={inlineStyle}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      {children}
    </As>
  );
}

export function CxCardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div
      className={`flex items-start justify-between gap-3 mb-3 ${className}`}
    >
      <div className="min-w-0">
        {title ? (
          <div
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--cx-text)",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </div>
        ) : null}
        {subtitle ? (
          <div style={{ fontSize: 13, color: "var(--cx-muted)", marginTop: 2 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
