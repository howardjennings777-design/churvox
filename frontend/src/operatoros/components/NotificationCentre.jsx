import { useMemo, useState } from "react";
import { buildAiActions } from "../pages/aiActions";
import DetailDrawer from "./DetailDrawer";

export default function NotificationCentre({ data, onNav }) {
  const [open, setOpen] = useState(false);

  const notifications = useMemo(() => {
    const rows = [];
    const actions = buildAiActions(data);

    if (actions.length) {
      rows.push({
        id: "ai-actions",
        title: `${actions.length} AI action${actions.length === 1 ? "" : "s"} waiting`,
        body: "Review, edit and approve prepared admin work.",
        target: "queue",
        tone: "cyan",
      });
    }

    if ((data.completedJobs || []).length) {
      rows.push({
        id: "proof",
        title: `${data.completedJobs.length} completed job${data.completedJobs.length === 1 ? "" : "s"} ready`,
        body: "Review proof and create draft invoices.",
        target: "proof",
        tone: "green",
      });
    }

    if ((data.unassignedJobs || []).length) {
      rows.push({
        id: "unassigned",
        title: `${data.unassignedJobs.length} unassigned job${data.unassignedJobs.length === 1 ? "" : "s"}`,
        body: "AI can prepare worker assignment suggestions.",
        target: "jobs",
        tone: "amber",
      });
    }

    if ((data.unpaidInvoices || []).length) {
      rows.push({
        id: "money",
        title: `${data.unpaidInvoices.length} invoice${data.unpaidInvoices.length === 1 ? "" : "s"} need money watch`,
        body: "Draft reminders can be prepared for approval.",
        target: "invoices",
        tone: "blue",
      });
    }

    if (Number(data.smsBalance || 0) <= 10) {
      rows.push({
        id: "sms",
        title: "SMS credits are low",
        body: "Top up from System Centre before sending reminders.",
        target: "system",
        tone: "amber",
      });
    }

    if (!data.myobConnected && ["pro", "enterprise"].includes(String(data.currentPlan || "").toLowerCase())) {
      rows.push({
        id: "myob",
        title: "MYOB needs connection review",
        body: "MYOB sync stays approval-first.",
        target: "system",
        tone: "blue",
      });
    }

    if (data.currentPlan === "none") {
      rows.push({
        id: "plan",
        title: "Plan not selected",
        body: "Choose plan/trial before launch use.",
        target: "system",
        tone: "amber",
      });
    }

    return rows;
  }, [data]);

  function openTarget(target) {
    onNav?.(target);
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="op-notification-button" onClick={() => setOpen(true)}>
        Alerts {notifications.length ? <b>{notifications.length}</b> : null}
      </button>

      <DetailDrawer
        open={open}
        title="Notification Centre"
        eyebrow="OWNER ALERTS"
        onClose={() => setOpen(false)}
      >
        <section className="op-notification-list">
          {!notifications.length ? (
            <div className="op-empty">
              <strong>No urgent alerts</strong>
              <span>Churvox is watching jobs, invoices, quotes, crew, SMS and MYOB.</span>
            </div>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`op-notification-row ${item.tone}`}
                onClick={() => openTarget(item.target)}
              >
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </button>
            ))
          )}
        </section>
      </DetailDrawer>
    </>
  );
}
