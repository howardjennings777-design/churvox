import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Inline form fields for each well-known automation action type.
 * Falls back to a raw JSON textarea when the action type is unknown
 * or when the user toggles "Advanced JSON".
 *
 * Props:
 *  - type: action type string
 *  - config: current config object
 *  - onChange: (newConfig) => void
 *  - advanced: boolean
 *  - setAdvanced: (bool) => void
 */
export function ActionForm({ type, config, onChange, advanced, setAdvanced }) {
  const cfg = config || {};
  const set = (patch) => onChange({ ...cfg, ...patch });

  const JobStatusOptions = [
    "assigned", "acknowledged", "in_progress", "paused", "completed", "cancelled",
  ];
  const InvoiceStatusOptions = ["draft", "sent", "paid", "cancelled"];

  const KNOWN = new Set([
    "create_notification", "create_job_note", "update_job_status", "create_invoice_stub", "send_sms",
  ]);

  const renderJSON = () => (
    <div>
      <Label className="text-[11px] uppercase tracking-wide text-slate-500">Config JSON</Label>
      <textarea
        className="w-full h-24 font-mono text-xs border border-slate-200 rounded-md p-2 mt-1"
        placeholder='{"key":"value"}'
        defaultValue={JSON.stringify(cfg, null, 2)}
        onBlur={(e) => {
          try { onChange(JSON.parse(e.target.value || "{}")); }
          catch { /* keep last valid */ }
        
      />
      <p className="text-[11px] text-slate-400 mt-1">
        Use <code className="font-mono">{"path"}</code> to inject event values (e.g. <code>{"job.id"}</code>).
      </p>
    </div>
  );

  // Advanced mode or unknown type → raw JSON
  if (advanced || !KNOWN.has(type)) {
    return (
      <div className="space-y-2">
        {renderJSON()}
        {KNOWN.has(type) && (
          <button
            type="button"
            onClick={() => setAdvanced(false)}
            className="text-xs text-blue-600 hover:underline"
          >
            ← Back to simple form
          </button>
        )}
      </div>
    );
  }

  const AdvancedToggle = () => (
    <button
      type="button"
      onClick={() => setAdvanced(true)}
      className="text-[11px] text-slate-400 hover:text-blue-600 hover:underline"
    >
      Advanced JSON
    </button>
  );

  // --- create_notification ---
  if (type === "create_notification") {
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Recipient (user_id)" hint="Leave blank to default to actor. Use tokens e.g. job.worker_id">
            <Input
              value={cfg.user_id || ""}
              onChange={(e) => set({ user_id: e.target.value })}
              placeholder="job.worker_id"
            />
          </Field>
          <Field label="Type" hint="Short label used for grouping">
            <Input
              value={cfg.notification_type || ""}
              onChange={(e) => set({ notification_type: e.target.value })}
              placeholder="automation"
            />
          </Field>
        </div>
        <Field label="Title">
          <Input
            value={cfg.title || ""}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Job completed: job.title"
          />
        </Field>
        <Field label="Message">
          <Input
            value={cfg.message || ""}
            onChange={(e) => set({ message: e.target.value })}
            placeholder="Worker marked the job complete."
          />
        </Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Deep link route" hint="Where tapping the notification goes">
            <Input
              value={cfg.route || ""}
              onChange={(e) => set({ route: e.target.value })}
              placeholder="/jobs/job.id"
            />
          </Field>
          <Field label="Target type">
            <Input
              value={cfg.target_type || ""}
              onChange={(e) => set({ target_type: e.target.value })}
              placeholder="job"
            />
          </Field>
          <Field label="Target id">
            <Input
              value={cfg.target_id || ""}
              onChange={(e) => set({ target_id: e.target.value })}
              placeholder="job.id"
            />
          </Field>
        </div>
        <div className="flex justify-end"><AdvancedToggle /></div>
      </div>
    );
  }

  // --- create_job_note ---
  if (type === "create_job_note") {
    return (
      <div className="space-y-3">
        <Field label="Job id" hint="Defaults to event's job.id if blank">
          <Input
            value={cfg.job_id || ""}
            onChange={(e) => set({ job_id: e.target.value })}
            placeholder="job.id"
          />
        </Field>
        <Field label="Note text">
          <textarea
            className="w-full h-20 border border-slate-200 rounded-md p-2 text-sm"
            value={cfg.text || ""}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Auto-note: trigger fired on job.title"
          />
        </Field>
        <div className="flex justify-end"><AdvancedToggle /></div>
      </div>
    );
  }

  // --- update_job_status ---
  if (type === "update_job_status") {
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Job id" hint="Defaults to event's job.id if blank">
            <Input
              value={cfg.job_id || ""}
              onChange={(e) => set({ job_id: e.target.value })}
              placeholder="job.id"
            />
          </Field>
          <Field label="New status">
            <select
              value={cfg.status || ""}
              onChange={(e) => set({ status: e.target.value })}
              className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
            >
              <option value="">Select...</option>
              {JobStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end"><AdvancedToggle /></div>
      </div>
    );
  }

  // --- create_invoice_stub ---
  if (type === "create_invoice_stub") {
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Job id">
            <Input
              value={cfg.job_id || ""}
              onChange={(e) => set({ job_id: e.target.value })}
              placeholder="job.id"
            />
          </Field>
          <Field label="Client id">
            <Input
              value={cfg.client_id || ""}
              onChange={(e) => set({ client_id: e.target.value })}
              placeholder="job.client_id"
            />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Total ($)">
            <Input
              type="number"
              value={cfg.total ?? ""}
              onChange={(e) => set({ total: Number(e.target.value || 0) })}
              placeholder="0"
            />
          </Field>
          <Field label="Status">
            <select
              value={cfg.status || "draft"}
              onChange={(e) => set({ status: e.target.value })}
              className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
            >
              {InvoiceStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes (optional)">
          <Input
            value={cfg.notes || ""}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Auto-generated draft"
          />
        </Field>
        <div className="flex justify-end"><AdvancedToggle /></div>
      </div>
    );
  }

  // --- send_sms ---
  if (type === "send_sms") {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
          SMS actions send a real text via your ClickSend account. Make sure <code className="font-mono">CLICKSEND_*</code> env vars are configured.
        </div>
        <Field label="To (phone, AU/NZ)" hint="E.164 or local format. Use job.worker_id only if you store phone on the worker.">
          <Input
            value={cfg.to || ""}
            onChange={(e) => set({ to: e.target.value })}
            placeholder="+64 21 123 4567 or actor.phone"
          />
        </Field>
        <Field label="Message">
          <textarea
            className="w-full h-20 border border-slate-200 rounded-md p-2 text-sm"
            value={cfg.message || ""}
            onChange={(e) => set({ message: e.target.value })}
            placeholder="Hi! job.title is scheduled for job.scheduled_date."
          />
        </Field>
        <Field label="Sender label (optional)">
          <Input
            value={cfg.source || ""}
            onChange={(e) => set({ source: e.target.value })}
            placeholder="Churvox"
          />
        </Field>
        <div className="flex justify-end"><AdvancedToggle /></div>
      </div>
    );
  }

  return renderJSON();
}

function Field({ label, hint, children }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wide text-slate-500">{label}</Label>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export default ActionForm;
