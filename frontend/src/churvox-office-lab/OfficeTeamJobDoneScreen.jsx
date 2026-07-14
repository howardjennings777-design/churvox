import React, { useEffect, useMemo, useState } from "react";
import { createBackendCommandSlip } from "./OfficeTeamCommandApi";
import { jobDoneCandidates, moneyLabel, numberValue, shortDate, signatureOwnerRoute, useOfficeTeamSignatureData } from "./OfficeTeamSignatureData";
import "./OfficeTeamSignatureFlows.css";

const CLOSEOUT_STEPS = [
  ["completion", "Record completion", "Keep the internal completion draft ready for owner approval."],
  ["customer", "Prepare customer update", "Prepare customer wording but do not send it."],
  ["invoice", "Prepare invoice draft", "Use the checked amount and extras in an internal invoice draft."],
  ["worker", "Prepare worker time", "Carry the reviewed time into a payroll review draft only."],
  ["accounting", "Prepare accounting handoff", "Prepare the record for a later owner-approved accounting step."],
];

export default function OfficeTeamJobDoneScreen({ appMode = "lab", go = () => {} }) {
  const ownerRoute = signatureOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const snapshot = useOfficeTeamSignatureData({ allowFallback });
  const jobs = useMemo(() => jobDoneCandidates(snapshot), [snapshot]);
  const [selectedId, setSelectedId] = useState("");
  const selected = jobs.find((job) => job.id === selectedId) || jobs[0] || null;
  const [fields, setFields] = useState(() => fieldsForJob(selected));
  const [steps, setSteps] = useState(() => Object.fromEntries(CLOSEOUT_STEPS.map(([key]) => [key, true])));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [prepared, setPrepared] = useState(false);

  useEffect(() => {
    if (!jobs.length) {
      setSelectedId("");
      return;
    }
    if (!jobs.some((job) => job.id === selectedId)) setSelectedId(jobs[0].id);
  }, [jobs, selectedId]);

  useEffect(() => {
    setFields(fieldsForJob(selected));
    setNotice("");
    setPrepared(false);
  }, [selected?.id]);

  const readyCount = jobs.filter((job) => job.ready).length;
  const blockedCount = jobs.filter((job) => job.blockers.length > 0).length;
  const waitingValue = jobs.filter((job) => !job.invoice).reduce((sum, job) => sum + job.value, 0);
  const selectedSteps = CLOSEOUT_STEPS.filter(([key]) => steps[key]);

  function updateField(key, value) {
    setFields((current) => ({ ...current, [key]: value }));
    setPrepared(false);
  }

  function toggleStep(key) {
    setSteps((current) => ({ ...current, [key]: !current[key] }));
    setPrepared(false);
  }

  async function prepareJobDone() {
    if (!selected || busy) return;
    setBusy(true);
    setNotice("Preparing one owner-controlled Job Done card…");
    const blockers = [...selected.blockers];
    if (!numberValue(fields.invoiceTotal, 0)) blockers.push("Invoice total still needs an owner-entered amount");
    if (!selectedSteps.length) blockers.push("No closeout step has been selected");
    const evidence = [
      `Completion status: ${selected.status.replace(/_/g, " ")}`,
      `Proof photos: ${selected.proofCount}`,
      `Checklist: ${selected.checklist.completed}/${selected.checklist.total || selected.checklist.completed}`,
      `Worker time: ${selected.actualHours || 0} hours`,
      `Existing invoice: ${selected.invoice ? `${selected.invoice.number} (${selected.invoice.status})` : "not found"}`,
    ];
    const selectedLabels = selectedSteps.map(([, label]) => label);
    const safeSteps = selectedLabels.length ? selectedLabels : ["Owner must choose the closeout steps"];
    try {
      await createBackendCommandSlip({
        area: "job-done",
        record: [shortDate(selected.completedAt), selected.title, selected.blockers.length ? "Needs closeout check" : "Ready for owner review", selected.client],
        action: "Prepare Job Done closeout",
        slip: {
          source_type: "job_done_closeout",
          action_type: "owner_review_job_done",
          source_id: `job-done-${selected.id}`,
          title: `Job Done: ${selected.title}`,
          found: `${selected.title} is marked complete. Churvox checked the proof, checklist, worker time, invoice position, extras, recurring work and accounting handoff.`,
          prepared: `A single Job Done closeout draft is ready with ${safeSteps.join(", ")}. Nothing was sent, synced, charged, paid or changed.`,
          why: blockers.length
            ? "The job is complete, but the owner must correct the missing or uncertain closeout information before approving the internal draft."
            : "The closeout evidence is present. The owner still decides which internal drafts are approved and whether any later external action should happen.",
          urgency: blockers.length ? "Needs check" : "Owner review",
          payload: {
            office_role: "Office Manager",
            job_id: selected.id,
            prepared_form: {
              job: selected.title,
              client: selected.client,
              worker: selected.worker,
              completed_at: shortDate(selected.completedAt),
              completion_proof: `${selected.proofCount} photo${selected.proofCount === 1 ? "" : "s"}`,
              checklist: `${selected.checklist.completed}/${selected.checklist.total || selected.checklist.completed} complete`,
              worker_time: `${selected.actualHours || 0} hours`,
              estimated_time: selected.estimatedHours ? `${selected.estimatedHours} hours` : "Not found — owner must enter",
              invoice_total: moneyLabel(numberValue(fields.invoiceTotal, 0)),
              extras: moneyLabel(numberValue(fields.extraAmount, 0)),
              estimated_profit: moneyLabel(numberValue(fields.invoiceTotal, 0) - selected.actualCost),
              customer_update: fields.customerUpdate || "Not found — owner must enter",
              next_booking: fields.nextDate || "No next booking prepared",
              owner_note: fields.ownerNote || "Owner reviewed the Job Done closeout.",
              selected_closeout_steps: safeSteps.join(" · "),
            },
            evidence,
            missing: blockers,
            confidence: {
              score: blockers.length ? Math.max(35, 88 - blockers.length * 12) : 92,
              why: blockers.length ? ["Completion was found", "Some closeout facts are missing or uncertain"] : ["Completion, proof, time and value were found", "No critical closeout fact is marked missing"],
            },
            owner_question: blockers.length
              ? "Correct the missing facts, ask the worker, approve only the safe internal draft, or park this closeout?"
              : "Approve the selected Job Done drafts, ask the worker, or park this closeout?",
            actions: ["Approve Job Done draft", "Ask worker", "Park"],
            will_do: [
              "Save one owner-approved internal closeout draft",
              ...selectedLabels.map((label) => `Prepare: ${label}`),
              "Keep customer sending, invoice sending, accounting sync, payroll payment, tax filing and record changes locked",
              "Record the owner approval trail",
            ],
            source: "job_done_signature_flow",
            prepared_only: true,
            owner_review_only: true,
            no_auto_send: true,
            no_auto_sync: true,
            no_auto_charge: true,
            no_auto_record_change: true,
            no_auto_payroll: true,
            no_auto_tax: true,
          },
        },
      });
      setPrepared(true);
      setNotice("Job Done is waiting in Command. The owner can edit the full closeout before approving any internal draft.");
    } catch (error) {
      setPrepared(false);
      setNotice(`Job Done could not be prepared. Nothing was sent, synced, charged, paid or changed. ${error?.message || ""}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cvSiteScreen cvSignatureFlow cvJobDoneFlow" data-version="CHURVOX_JOB_DONE_V1_20260714">
      <header className="cvSignatureHero">
        <div>
          <span>Signature workflow · {snapshot.label}</span>
          <h2>Job Done</h2>
          <p>From finished work to ready-to-approve admin. Churvox checks proof, time, extras, invoice readiness, worker hours, recurring work and accounting handoff—then creates one owner decision.</p>
        </div>
        <div className="cvSignatureHeroMetrics" aria-label="Job Done summary">
          <article><strong>{jobs.length}</strong><small>Completed</small></article>
          <article><strong>{readyCount}</strong><small>Ready to close</small></article>
          <article><strong>{blockedCount}</strong><small>Need a check</small></article>
          <article><strong>{moneyLabel(waitingValue)}</strong><small>Not yet invoiced</small></article>
        </div>
      </header>

      {jobs.length ? (
        <div className="cvSignatureWorkspace">
          <section className="cvSignatureList" aria-label="Completed jobs">
            <header><div><span>Completed work</span><strong>Choose a closeout</strong></div><small>{jobs.length} found</small></header>
            {jobs.map((job) => (
              <button key={job.id} type="button" className={selected?.id === job.id ? "active" : ""} onClick={() => setSelectedId(job.id)}>
                <span>{shortDate(job.completedAt)}</span>
                <strong>{job.title}</strong>
                <small>{job.client} · {job.worker}</small>
                <em className={job.ready ? "good" : "warn"}>{job.ready ? "Ready for owner" : `${job.blockers.length} check${job.blockers.length === 1 ? "" : "s"}`}</em>
              </button>
            ))}
          </section>

          <section className="cvSignatureDetail" aria-label="Selected Job Done closeout">
            <header>
              <div><span>{selected?.client}</span><h3>{selected?.title}</h3><p>{selected?.notes}</p></div>
              <em className={selected?.ready ? "good" : "warn"}>{selected?.ready ? "Closeout ready" : "Owner check needed"}</em>
            </header>

            <div className="cvJobDoneChecks">
              <Check label="Completion" value={selected?.completed ? "Recorded" : "Not confirmed"} ok={selected?.completed} />
              <Check label="Proof" value={`${selected?.proofCount || 0} photo${selected?.proofCount === 1 ? "" : "s"}`} ok={Boolean(selected?.proofCount)} />
              <Check label="Checklist" value={`${selected?.checklist.completed || 0}/${selected?.checklist.total || selected?.checklist.completed || 0}`} ok={!selected?.checklist.total || selected?.checklist.completed >= selected?.checklist.total} />
              <Check label="Worker time" value={`${selected?.actualHours || 0} hrs`} ok={Boolean(selected?.actualHours)} />
              <Check label="Invoice" value={selected?.invoice ? `${selected.invoice.number} · ${selected.invoice.status}` : "Not found"} ok={Boolean(selected?.invoice || numberValue(fields.invoiceTotal, 0))} />
              <Check label="Recurring" value={selected?.recurrence || "One-off / not found"} ok />
            </div>

            {selected?.blockers.length ? <section className="cvSignatureBlockers"><span>Needs attention before approval</span>{selected.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}</section> : <section className="cvSignatureReady"><strong>All core closeout evidence found</strong><p>The owner still reviews every field and decides what internal drafts Churvox may prepare.</p></section>}

            <div className="cvJobDoneFields">
              <label>Invoice total<input type="number" min="0" step="0.01" value={fields.invoiceTotal} onChange={(event) => updateField("invoiceTotal", event.target.value)} /></label>
              <label>Extras<input type="number" min="0" step="0.01" value={fields.extraAmount} onChange={(event) => updateField("extraAmount", event.target.value)} /></label>
              <label>Next booking<input type="date" value={fields.nextDate} onChange={(event) => updateField("nextDate", event.target.value)} /></label>
              <label className="wide">Customer update<textarea rows="3" value={fields.customerUpdate} onChange={(event) => updateField("customerUpdate", event.target.value)} /></label>
              <label className="wide">Owner note<textarea rows="2" value={fields.ownerNote} onChange={(event) => updateField("ownerNote", event.target.value)} /></label>
            </div>

            <section className="cvJobDoneSteps" aria-label="Closeout steps">
              <header><span>What should Churvox prepare?</span><small>Internal drafts only</small></header>
              {CLOSEOUT_STEPS.map(([key, label, detail]) => (
                <button key={key} type="button" aria-pressed={Boolean(steps[key])} className={steps[key] ? "active" : ""} onClick={() => toggleStep(key)}>
                  <strong>{label}</strong><small>{detail}</small><em>{steps[key] ? "Selected" : "Not selected"}</em>
                </button>
              ))}
            </section>

            <footer className="cvSignatureActions">
              <button type="button" className="primary" disabled={busy} onClick={prepareJobDone}>{busy ? "Preparing…" : "Prepare Job Done card"}</button>
              <button type="button" onClick={() => go("work")}>Back to Jobs</button>
              {prepared ? <button type="button" onClick={() => go("command")}>Open Command</button> : null}
              <small>Nothing sends, syncs, charges, pays, files tax or changes a live record from this screen.</small>
            </footer>
            {notice ? <p className="cvSignatureNotice" role="status" aria-live="polite">{notice}</p> : null}
          </section>
        </div>
      ) : (
        <article className="cvSignatureEmpty">
          <strong>{snapshot.source === "loading" ? "Checking completed work" : "No completed jobs ready for Job Done"}</strong>
          <p>{snapshot.source === "loading" ? "Churvox is checking the live jobs, invoices and payroll records." : "Completed jobs will appear here when the live job record says the work is finished. No example records are shown in the owner workspace."}</p>
          <button type="button" onClick={() => go("work")}>Open Jobs</button>
        </article>
      )}
    </section>
  );
}

function Check({ label, value, ok }) {
  return <article className={ok ? "good" : "warn"}><span>{label}</span><strong>{value}</strong><small>{ok ? "Checked" : "Needs owner"}</small></article>;
}

function fieldsForJob(job) {
  if (!job) return { invoiceTotal: "", extraAmount: "", customerUpdate: "", ownerNote: "", nextDate: "" };
  const invoiceTotal = job.invoice?.total || job.value || job.quotedAmount + job.extraAmount || 0;
  return {
    invoiceTotal: invoiceTotal ? String(invoiceTotal) : "",
    extraAmount: job.extraAmount ? String(job.extraAmount) : "0",
    customerUpdate: `Thanks — ${job.title} is complete. We have recorded the work and will send any approved paperwork separately.`,
    ownerNote: "",
    nextDate: normalizeDateInput(job.nextDate),
  };
}

function normalizeDateInput(value) {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}
