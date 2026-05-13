import { useState } from "react";
import { apiFetch, clientOf, moneyOf, saveOperatorDraft, addActivity, titleOf } from "../api";
import DetailDrawer from "../components/DetailDrawer";
import EmptyState from "../components/EmptyState";

export default function ProofToPaidWorkspace({ data }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const jobs = data.completedJobs || [];

  async function createDraftInvoice(job) {
    if (!job || busy) return;
    setBusy(true);
    setNotice("");

    const amount = Number(job.total || job.amount || job.price || job.job_price || 0);
    const customerName = clientOf(job);
    const description =
      job.ai_invoice_description ||
      job.completion_summary ||
      job.worker_notes ||
      job.description ||
      `Completed work for ${customerName}`;

    const payload = {
      job_id: job.id || job._id,
      source_job_id: job.id || job._id,
      client_id: job.client_id || job.customer_id || "",
      client_name: customerName,
      customer_name: customerName,
      customer_email: job.customer_email || job.client_email || job.email || "",
      address: job.address || job.site_address || job.job_address || "",
      description,
      subtotal: amount,
      amount,
      total: amount,
      gst_rate: Number(job.gst_rate || 15),
      pricing_type: job.pricing_type || "fixed",
      hourly_rate: Number(job.hourly_rate || 0),
      hours_worked: Number(job.hours_worked || job.total_hours || 0),
      status: "draft",
      created_by_ai: true,
      source: "proof_to_paid",
    };

    try {
      await apiFetch("/invoices", { method: "POST", body: payload });
      addActivity({ type: "proof_to_paid", title: `Draft invoice for ${titleOf(job)}`, message: "Draft invoice created from completed work." });
      setNotice("Draft invoice created from completed job proof.");
      setSelected(null);
      await data.reload?.();
    } catch (error) {
      saveOperatorDraft({ type: "proof_to_paid_invoice", title: `Draft invoice for ${titleOf(job)}`, fields: payload, status: "backend_needs_review", error: error.message });
      setNotice("Backend did not accept invoice creation yet, so Churvox saved it as an owner-review draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="op-workspace">
      <section className="op-workspace-head">
        <div>
          <p>PROOF TO PAID</p>
          <h1>Completed work ready to invoice.</h1>
          <span>Review worker notes, job proof and AI wording before creating draft invoices.</span>
        </div>
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}

      <section className="op-list">
        {!jobs.length ? (
          <EmptyState title="No completed jobs waiting" body="When workers complete jobs, Churvox will move them here for invoice review." />
        ) : (
          jobs.map((job, index) => (
            <button className="op-row" key={job.id || job._id || index} onClick={() => setSelected(job)}>
              <div>
                <strong>{titleOf(job, `Completed job ${index + 1}`)}</strong>
                <small>{clientOf(job)} · {moneyOf(job)} · Ready for invoice review</small>
              </div>
              <span className="op-status good">Completed</span>
            </button>
          ))
        )}
      </section>

      <DetailDrawer
        open={!!selected}
        title={titleOf(selected, "Completed job")}
        eyebrow="PROOF REVIEW"
        onClose={() => setSelected(null)}
        footer={
          <>
            <button onClick={() => setSelected(null)}>Close</button>
            <button className="primary" disabled={busy} onClick={() => createDraftInvoice(selected)}>
              {busy ? "Creating..." : "Create draft invoice"}
            </button>
          </>
        }
      >
        <section className="op-note">
          <strong>AI proof summary</strong>
          <p>{selected?.completion_summary || selected?.worker_notes || selected?.notes || selected?.description || "Completed work is ready for owner review. Add proof/photos before sending if needed."}</p>
        </section>

        <div className="op-detail-grid">
          <div><small>Client</small><b>{clientOf(selected)}</b></div>
          <div><small>Suggested value</small><b>{moneyOf(selected)}</b></div>
          <div><small>Action</small><b>Draft invoice only</b></div>
          <div><small>Guardrail</small><b>Owner approves before send</b></div>
        </div>
      </DetailDrawer>
    </main>
  );
}
