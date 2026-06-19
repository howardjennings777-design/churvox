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
        alignItems: "stretch",
        justifyContent: "center",
        padding: "18px 24px 18px 300px",
        background: "rgba(2, 6, 23, 0.68)",
        backdropFilter: "blur(16px)",
        overflow: "hidden",
      }}
    >
      <section
        style={{
          width: "min(940px, calc(100vw - 360px))",
          height: "calc(100dvh - 36px)",
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          borderRadius: 30,
          background: "#fffaf0",
          border: "1px solid rgba(15, 23, 42, 0.12)",
          boxShadow: "0 40px 110px rgba(0, 0, 0, 0.45)",
        }}
      >
        <header
          style={{
            flex: "0 0 auto",
            margin: 14,
            marginBottom: 10,
            borderRadius: 24,
            padding: "16px 22px",
            color: "#fffaf0",
            background: "linear-gradient(135deg, #111827, #1f2937 58%, #f97316)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "clamp(30px, 4vw, 46px)", lineHeight: 0.96, fontWeight: 1000 }}>Add job</h1>
        </header>
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "0 14px 14px",
          }}
        >
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
