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
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "14px",
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
