import React, { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CHURVOX_INVOICE_JOB_PREFILL_MARKER = "CHURVOX_INVOICE_JOB_LINK_BACK_20260525";

function getJobIdFromUrl() {
  const params = new URLSearchParams(window.location.search || "");
  return params.get("job_id") || params.get("jobId") || "";
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function moneyValue(job) {
  return firstValue(job?.subtotal, job?.invoice_amount, job?.job_price, job?.price, job?.fixed_price, job?.total, job?.amount);
}

function buildJobDescription(job) {
  return firstValue(
    job?.draft_invoice_description,
    job?.invoice_description,
    job?.completion_summary,
    job?.description,
    job?.notes,
    job?.title ? `${job.title}${job.address ? ` — ${job.address}` : ""}` : ""
  );
}

function getRecordId(record) {
  return record?.id || record?._id || record?.invoice_id || "";
}

export default function InvoiceCreateForm({ onSuccess, onCancel, submitLabel = "Create invoice" }) {
  const { get, post, patch, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [prefilledJobId, setPrefilledJobId] = useState("");
  const [prefillNotice, setPrefillNotice] = useState("");
  const [formData, setFormData] = useState({
    client_id: "",
    customer_name: "",
    customer_email: "",
    address: "",
    description: "",
    subtotal: "",
    gst_rate: 15,
    notes: "",
    job_id: "",
  });

  useEffect(() => {
    get("/clients").then((r) => setClients(r?.success ? r.data || [] : []));
  }, [get]);

  useEffect(() => {
    const jobId = getJobIdFromUrl();
    if (!jobId || prefilledJobId === jobId) return;

    let alive = true;
    const loadJob = async () => {
      const result = await get(`/jobs/${jobId}`);
      if (!alive) return;

      if (!result?.success || !result?.data) {
        setPrefillNotice("Could not load the reviewed job. You can still create the invoice manually.");
        setPrefilledJobId(jobId);
        return;
      }

      const job = result.data;
      const clientId = firstValue(job.client_id, job.customer_id);
      const client = clients.find((c) => String(c.id || c._id) === String(clientId));
      const amount = moneyValue(job);

      setFormData((prev) => ({
        ...prev,
        job_id: jobId,
        client_id: clientId || prev.client_id,
        customer_name: firstValue(job.client_name, job.customer_name, client?.name, client?.client_name, prev.customer_name),
        customer_email: firstValue(job.customer_email, job.client_email, client?.email, prev.customer_email),
        address: firstValue(job.address, job.site_address, job.job_address, client?.address, prev.address),
        description: buildJobDescription(job) || prev.description,
        subtotal: amount !== "" ? String(amount) : prev.subtotal,
        notes: firstValue(job.invoice_notes, job.completion_notes, prev.notes),
      }));

      setPrefillNotice("Invoice prefilled from the reviewed job. Check the amount before creating.");
      setPrefilledJobId(jobId);
    };

    loadJob();
    return () => {
      alive = false;
    };
  }, [get, clients, prefilledJobId]);

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleClientSelect = async (clientId) => {
    const c = clients.find((x) => String(x.id || x._id) === String(clientId));
    let description = "";
    if (clientId) {
      const draftRes = await get(`/invoices/description-draft?client_id=${encodeURIComponent(clientId)}`);
      description = draftRes?.description || draftRes?.data?.description || "";
    }
    setFormData((p) => ({
      ...p,
      client_id: clientId,
      customer_name: c?.name || c?.client_name || "",
      customer_email: c?.email || "",
      address: c?.address || "",
      description: description || p.description,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await post("/invoices", {
      ...formData,
      client_id: formData.client_id || null,
      job_id: formData.job_id || null,
      subtotal: Number(formData.subtotal),
      gst_rate: Number(formData.gst_rate),
    });

    if (res?.success) {
      const invoice = res.data || {};
      const invoiceId = getRecordId(invoice);
      if (formData.job_id && invoiceId) {
        await patch(`/jobs/${formData.job_id}`, {
          invoice_id: invoiceId,
          draft_invoice_id: invoiceId,
          invoiced: true,
          invoice_created_at: new Date().toISOString(),
          work_review_status: "invoiced",
          review_status: "invoiced",
        });
      }
      onSuccess?.(invoice);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="min-h-full flex flex-col" data-marker={CHURVOX_INVOICE_JOB_PREFILL_MARKER}>
      <div className="space-y-4 pb-28">
        {prefillNotice && (
          <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-sm font-semibold text-[#14532d]">
            {prefillNotice}
          </div>
        )}

        <div className="rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5 space-y-4">
          <div>
            <Label>Client</Label>
            <select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3]" value={formData.client_id} onChange={(e)=>handleClientSelect(e.target.value)}>
              <option value="">Select saved client</option>
              {clients.map((c)=><option key={c.id||c._id} value={c.id||c._id}>{c.name||c.client_name}</option>)}
            </select>
          </div>
          <div><Label>Customer Name *</Label><Input name="customer_name" value={formData.customer_name} onChange={handleChange} required/></div>
          <div><Label>Customer Email</Label><Input name="customer_email" type="email" value={formData.customer_email} onChange={handleChange}/></div>
          <div><Label>Address</Label><Input name="address" value={formData.address} onChange={handleChange}/></div>
          <div><Label>Description *</Label><Textarea name="description" value={formData.description} onChange={handleChange} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Subtotal *</Label><Input name="subtotal" type="number" step="0.01" value={formData.subtotal} onChange={handleChange} required/></div>
            <div><Label>GST %</Label><Input name="gst_rate" type="number" value={formData.gst_rate} onChange={handleChange}/></div>
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 mt-auto border-t border-[#d8e3f3] bg-white/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3">
        <button type="button" className="px-button-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="px-button-primary" disabled={loading}>{loading?"Saving...":submitLabel}</button>
      </div>
    </form>
  );
}
