import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Save, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";

function getWorkerId(worker) {
  return worker?.worker_id || worker?.id || worker?.user_id || worker?._id || worker?.email || worker?.name;
}

function getWorkerName(worker) {
  return worker?.name || worker?.worker_name || worker?.email || "Worker";
}

export default function WorkerRatesPage() {
  const { get, post } = useApi();
  const [workers, setWorkers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    const res = await get("/payroll/workers");
    const rows = res?.success ? res.data?.workers || [] : [];
    setWorkers(rows);
    setDrafts((current) => {
      const next = { ...current };
      rows.forEach((worker) => {
        const id = getWorkerId(worker);
        if (!id || next[id]) return;
        next[id] = {
          hourly_rate: String(worker.hourly_rate ?? worker.pay_rate ?? worker.payroll_rate ?? worker.rate ?? ""),
          pay_type: worker.pay_type || "hourly",
          notes: worker.payroll_notes || worker.rate_notes || "",
        };
      });
      return next;
    });
    setLoading(false);
  }, [get]);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);

  const updateDraft = (worker, field, value) => {
    const id = getWorkerId(worker);
    if (!id) return;
    setDrafts((current) => ({
      ...current,
      [id]: {
        hourly_rate: "",
        pay_type: "hourly",
        notes: "",
        ...(current[id] || {}),
        [field]: value,
      },
    }));
  };

  const saveRate = async (worker) => {
    const id = getWorkerId(worker);
    if (!id) return toast.error("Worker not found");
    const draft = drafts[id] || {};
    const rate = Number(draft.hourly_rate || 0);
    if (Number.isNaN(rate) || rate < 0) return toast.error("Enter a valid worker rate");

    setSaving((state) => ({ ...state, [id]: true }));
    try {
      const res = await post(`/payroll/workers/${id}/rate`, {
        hourly_rate: rate,
        pay_type: draft.pay_type || "hourly",
        payroll_notes: draft.notes || "",
      });
      if (!res?.success) return toast.error(res?.error || "Could not save worker rate");
      toast.success("Worker rate saved");
      await loadWorkers();
    } finally {
      setSaving((state) => ({ ...state, [id]: false }));
    }
  };

  return (
    <Layout>
      <div className="cx-page space-y-6">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-white via-[#f6f9ff] to-[#eef6ff] p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Internal rates</p>
          <h1 className="cx-page-title mt-2">Worker Rates</h1>
          <p className="cx-page-subtitle max-w-4xl">
            Set internal worker cost rates for timesheet estimates and exports. This does not run full payroll, file tax, create payslips, or pay staff.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Rates used by Timesheets</h2>
              <p className="text-sm text-slate-500">These rates are owner/admin only and are used for labour cost estimates and export files.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              <UsersRound size={14} /> {workers.length} workers
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {loading ? <p className="text-sm text-slate-500">Loading workers...</p> : null}
            {!loading && !workers.length ? <p className="text-sm text-slate-500">No workers found yet. Invite workers from Team first.</p> : null}
            {workers.map((worker) => {
              const id = getWorkerId(worker);
              const draft = drafts[id] || { hourly_rate: "", pay_type: "hourly", notes: "" };
              const rate = Number(draft.hourly_rate || 0);
              return (
                <div key={id || getWorkerName(worker)} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-slate-950">{getWorkerName(worker)}</p>
                      <p className="text-xs text-slate-500">{worker.email || worker.role || "Team member"}</p>
                    </div>
                    <span className={rate > 0 ? "cx-status-badge cx-status-badge--green" : "cx-status-badge cx-status-badge--amber"}>{rate > 0 ? `Rate ${formatCurrency(rate)}/h` : "Needs rate"}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="text-sm font-bold text-slate-700">
                      Hourly rate
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.hourly_rate}
                        onChange={(event) => updateDraft(worker, "hourly_rate", event.target.value)}
                        placeholder="0.00"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>
                    <label className="text-sm font-bold text-slate-700">
                      Type
                      <select
                        value={draft.pay_type || "hourly"}
                        onChange={(event) => updateDraft(worker, "pay_type", event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="salary">Salary</option>
                        <option value="contractor">Contractor</option>
                      </select>
                    </label>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => saveRate(worker)}
                        disabled={!id || saving[id]}
                        className="cx-button-primary w-full justify-center"
                      >
                        <Save size={14} className="mr-2" />{saving[id] ? "Saving..." : "Save rate"}
                      </button>
                    </div>
                  </div>

                  <label className="mt-3 block text-sm font-bold text-slate-700">
                    Notes
                    <input
                      value={draft.notes}
                      onChange={(event) => updateDraft(worker, "notes", event.target.value)}
                      placeholder="Optional note for accountant/bookkeeper"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Layout>
  );
}
