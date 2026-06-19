import React from "react";
import JobCreateForm from "../components/forms/JobCreateForm";

export default function FreshJobQuickSlip({ instruction = "", onClose, onSuccess }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New job"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 28px 24px 300px",
        background: "rgba(2, 6, 23, 0.68)",
        backdropFilter: "blur(16px)",
      }}
    >
      <section
        style={{
          width: "min(940px, calc(100vw - 360px))",
          maxHeight: "calc(100dvh - 52px)",
          overflow: "auto",
          borderRadius: 30,
          background: "#fffaf0",
          border: "1px solid rgba(15, 23, 42, 0.12)",
          boxShadow: "0 40px 110px rgba(0, 0, 0, 0.45)",
        }}
      >
        <header
          style={{
            margin: 16,
            borderRadius: 24,
            padding: "24px 26px",
            color: "#fffaf0",
            background: "linear-gradient(135deg, #111827, #1f2937 58%, #f97316)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.92 }}>New job slip</div>
          <h1 style={{ margin: "8px 0 6px", fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 0.94, fontWeight: 1000 }}>Add job</h1>
          <p style={{ margin: 0, maxWidth: 760, fontSize: 14, lineHeight: 1.4, fontWeight: 800, opacity: 0.92 }}>
            {instruction ? `Ask Churvox filled from: ${instruction}` : "Create a real job without leaving the Jobs page."}
          </p>
        </header>
        <div style={{ padding: "0 16px 16px" }}>
          <JobCreateForm
            key={instruction || "blank-job-slip"}
            initialInstruction={instruction}
            onCancel={onClose}
            onSuccess={onSuccess}
            submitLabel="Create job"
          />
        </div>
      </section>
    </div>
  );
}
