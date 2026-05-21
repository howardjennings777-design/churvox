import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Churvox in-page modal / sheet.
 * - Centered modal on desktop, bottom sheet on mobile.
 * - Closes on Esc and backdrop click (unless `dismissible={false}`).
 * - Does NOT navigate. Owner stays in context (per Work Slip UX rule).
 */
export default function CxModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md", // sm | md | lg | xl
  dismissible = true,
  zIndex = 60,
  className = "",
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && dismissible) onClose && onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  const maxWidthMap = { sm: 460, md: 640, lg: 880, xl: 1120 };
  const maxW = maxWidthMap[size] || 640;

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0,
      }}
      className={className}
    >
      <div
        onClick={() => dismissible && onClose && onClose()}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(14,14,14,0.45)",
          backdropFilter: "blur(2px)",
          animation: "cx-fade 160ms ease-out",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: maxW,
          background: "var(--cx-surface)",
          borderTopLeftRadius: "var(--cx-radius-xl)",
          borderTopRightRadius: "var(--cx-radius-xl)",
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          border: "1px solid var(--cx-border)",
          boxShadow: "var(--cx-shadow-lg)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "94vh",
          animation: "cx-slide-up 240ms cubic-bezier(0.22,1,0.36,1)",
        }}
        className="cx-modal-shell"
      >
        {(title || subtitle || dismissible) && (
          <div
            style={{
              padding: "18px 22px 12px",
              borderBottom: "1px solid var(--cx-border-soft)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              {title ? (
                <div
                  style={{
                    fontFamily: "Outfit, Inter, sans-serif",
                    fontSize: 19,
                    fontWeight: 700,
                    color: "var(--cx-text)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {title}
                </div>
              ) : null}
              {subtitle ? (
                <div style={{ fontSize: 13, color: "var(--cx-muted)", marginTop: 4 }}>
                  {subtitle}
                </div>
              ) : null}
            </div>
            {dismissible ? (
              <button
                type="button"
                aria-label="Close"
                onClick={() => onClose && onClose()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid var(--cx-border)",
                  background: "var(--cx-surface)",
                  color: "var(--cx-text)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        )}
        <div
          style={{
            padding: "18px 22px",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </div>
        {footer ? (
          <div
            style={{
              padding: "14px 22px",
              borderTop: "1px solid var(--cx-border-soft)",
              background: "var(--cx-surface-2)",
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexWrap: "wrap",
              flexShrink: 0,
              paddingBottom: "max(14px, env(safe-area-inset-bottom))",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
      <style>{`
        @keyframes cx-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cx-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (min-width: 700px) {
          .cx-modal-shell {
            border-radius: var(--cx-radius-xl) !important;
            margin: auto !important;
            max-height: 88vh !important;
          }
        }
      `}</style>
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
