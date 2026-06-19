import React from "react";
import JobCreateForm from "../components/forms/JobCreateForm";

export default function FreshJobQuickSlip({ instruction = "", onClose, onSuccess }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add job"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "rgba(2, 6, 23, 0.58)",
        backdropFilter: "blur(10px)",
      }}
    >
      <section
        style={{
          width: "min(820px, calc(100vw - 32px))",
          maxHeight: "calc(100dvh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: 22,
          background: "#fffaf0",
          border: "1px solid rgba(15, 23, 42, 0.14)",
          boxShadow: "0 28px 80px rgba(0, 0, 0, 0.36)",
        }}
      >
        <header
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            borderBottom: "1px solid rgba(15, 23, 42, 0.10)",
            background: "#fffaf0",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: "#9a3412" }}>New job</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 26, lineHeight: 1, fontWeight: 1000, color: "#111827" }}>Add job</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close job slip"
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              border: "1px solid rgba(15, 23, 42, 0.14)",
              background: "#ffffff",
              color: "#111827",
              fontSize: 20,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </header>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: 14 }}>
          <JobCreateForm
            key={instruction || "blank-job-slip"}
            initialInstruction={instruction}
            onCancel={onClose}
            onSuccess={onSuccess}
            submitLabel="Save job"
          />
        </div>
      </section>
    </div>
  );
}
