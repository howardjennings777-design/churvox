import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Save, UserCog, X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const COUNTRY_OPTIONS = ["New Zealand", "Australia"];
const REGION_OPTIONS = {
  "New Zealand": ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"],
  Australia: ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"],
};

function getWorkerId(worker) {
  return worker?.id || worker?._id || worker?.worker_id || worker?.user_id || worker?.email;
}

function buildDraft(worker) {
  return {
    id: getWorkerId(worker) || "",
    name: worker?.name || "",
    email: worker?.email || "",
    phone: worker?.phone || "",
    country: worker?.country || "New Zealand",
    region: worker?.region || "",
    hourly_rate: String(worker?.hourly_rate ?? worker?.pay_rate ?? worker?.payroll_rate ?? worker?.rate ?? ""),
    pay_type: worker?.pay_type || "hourly",
    payroll_notes: worker?.payroll_notes || worker?.rate_notes || "",
  };
}

export default function TeamWorkerEditPanel() {
  const location = useLocation();
  const { get, patch, post } = useApi();
  const [open, setOpen] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(buildDraft(null));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onTeamPage = location.pathname === "/team" || location.pathname.startsWith("/team/");
  const selectedWorker = useMemo(() => workers.find((worker) => String(getWorkerId(worker)) === String(selectedId)) || null, [workers, selectedId]);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const res = await get("/team/workers");
      const rows = res?.success && Array.isArray(res.data) ? res.data : [];
      setWorkers(rows);
      if (!selectedId && rows[0]) {
        const firstId = getWorkerId(rows[0]);
        setSelectedId(firstId || "");
        setDraft(buildDraft(rows[0]));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !onTeamPage) return;
    loadWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onTeamPage]);

  useEffect(() => {
    if (selectedWorker) setDraft(buildDraft(selectedWorker));
  }, [selectedWorker]);

  if (!onTeamPage) return null;

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const saveWorker = async () => {
    const id = draft.id || selectedId;
    if (!id) return toast.error("Select a worker first");
    setSaving(true);
    try {
      const detailPayload = {
        name: String(draft.name || "").trim(),
        email: String(draft.email || "").trim(),
        phone: String(draft.phone || "").trim(),
        country: draft.country || "New Zealand",
        region: draft.region || "",
      };
      const detailRes = await patch(`/team/workers/${id}`, detailPayload);
      if (!detailRes?.success) return toast.error(detailRes?.error || "Could not save worker details");

      const rate = Number(draft.hourly_rate || 0);
      if (!Number.isNaN(rate) && rate >= 0) {
        await post(`/payroll/workers/${id}/rate`, {
          hourly_rate: rate,
          pay_type: draft.pay_type || "hourly",
          payroll_notes: draft.payroll_notes || "",
        });
      }

      toast.success("Worker details saved");
      await loadWorkers();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-[95] inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-xl shadow-blue-600/25 hover:bg-blue-700"
      >
        <UserCog size={17} /> Edit worker
      </button>

      {open ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm md:items-center">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Crew details</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Edit Worker</h2>
                <p className="text-sm text-slate-500">Update contact details, location, and internal timesheet rate.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                Select worker
                <select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">{loading ? "Loading workers..." : "Select worker"}</option>
                  {workers.map((worker) => {
                    const id = getWorkerId(worker);
                    return <option key={id || worker.email || worker.name} value={id}>{worker.name || worker.email || "Worker"}</option>;
                  })}
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-bold text-slate-700">Name<input value={draft.name} onChange={(event) => update("name", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
                <label className="text-sm font-bold text-slate-700">Email<input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
                <label className="text-sm font-bold text-slate-700">Phone<input value={draft.phone} onChange={(event) => update("phone", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
                <label className="text-sm font-bold text-slate-700">Country<select value={draft.country} onChange={(event) => update("country", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">{COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}</select></label>
                <label className="text-sm font-bold text-slate-700">Region / State<select value={draft.region} onChange={(event) => update("region", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"><option value="">Select region / state</option>{(REGION_OPTIONS[draft.country] || []).map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
                <label className="text-sm font-bold text-slate-700">Hourly rate<input type="number" min="0" step="0.01" value={draft.hourly_rate} onChange={(event) => update("hourly_rate", event.target.value)} placeholder="0.00" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
                <label className="text-sm font-bold text-slate-700">Pay type<select value={draft.pay_type} onChange={(event) => update("pay_type", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"><option value="hourly">Hourly</option><option value="salary">Salary</option><option value="contractor">Contractor</option></select></label>
                <label className="text-sm font-bold text-slate-700 md:col-span-2">Rate notes<input value={draft.payroll_notes} onChange={(event) => update("payroll_notes", event.target.value)} placeholder="Optional internal note" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={saveWorker} disabled={saving || !selectedId} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"><Save size={16} />{saving ? "Saving..." : "Save worker"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
