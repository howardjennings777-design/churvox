const safeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const asMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, { style: "currency", currency: "AUD" });
};

const asDate = (value) => {
  if (!value) return "";
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return "";
  return dt.toLocaleDateString();
};

export const buildInvoiceReminderMessage = ({ client, invoice, business, channel = "email" }) => {
  const clientName = safeText(client?.name || invoice?.client_name || invoice?.customer_name, "there");
  const businessName = safeText(business?.name || business?.business_name, "our team");
  const invoiceNo = safeText(invoice?.invoice_number || invoice?.number || invoice?.title, "your invoice");
  const amount = asMoney(invoice?.balance_due ?? invoice?.amount_due ?? invoice?.total_due ?? invoice?.total ?? invoice?.amount);
  const paymentLink = safeText(invoice?.payment_link || invoice?.paymentLink || invoice?.public_payment_url, "");
  const overdue = Number(invoice?.overdue_days ?? invoice?.days_overdue) > 0 || String(invoice?.status || "").toLowerCase() === "overdue";
  if (channel === "sms") {
    return `Hi ${clientName}, reminder from ${businessName}: invoice ${invoiceNo} for ${amount} is still outstanding. Please let us know if you need the payment link resent.`;
  }
  if (overdue) {
    return `Hi ${clientName}, this is a friendly follow-up on overdue invoice ${invoiceNo} for ${amount}. Please let us know if payment has already been made or if you need the payment link resent.`;
  }
  return `Hi ${clientName}, just a friendly reminder that invoice ${invoiceNo} for ${amount} is still outstanding.${paymentLink ? ` You can pay here: ${paymentLink}.` : ""} Please let us know if you need anything from us.`;
};

export const buildQuoteFollowUpMessage = ({ client, quote, business, channel = "email" }) => {
  const clientName = safeText(client?.name || quote?.client_name || quote?.customer_name, "there");
  const businessName = safeText(business?.name || business?.business_name, "our team");
  const quoteNo = safeText(quote?.quote_number || quote?.number || quote?.title, "your quote");
  const amount = asMoney(quote?.total ?? quote?.amount ?? quote?.price);
  if (channel === "sms") {
    return `Hi ${clientName}, just checking in on quote ${quoteNo} from ${businessName}. Let us know if you'd like to go ahead or have any questions.`;
  }
  return `Hi ${clientName}, just checking in on quote ${quoteNo}${amount !== "—" ? ` for ${amount}` : ""}. Happy to answer any questions or adjust anything before we book the work in.`;
};

export const buildArrivalSmsMessage = ({ client, job, worker, business }) => {
  const clientName = safeText(client?.name || job?.client_name || job?.customer_name, "there");
  const businessName = safeText(business?.name || business?.business_name, "our team");
  const workerName = safeText(worker?.name || job?.assigned_worker_name, "");
  const address = safeText(job?.address || job?.location, "");
  if (!workerName) return `Hi ${clientName}, your contractor from ${businessName} is scheduled to arrive in about 30 minutes${address ? ` for your job at ${address}` : ""}.`;
  if (!address) return `Hi ${clientName}, ${workerName} from ${businessName} is scheduled to arrive in about 30 minutes.`;
  return `Hi ${clientName}, ${workerName} from ${businessName} is scheduled to arrive in about 30 minutes for your job at ${address}. Reply if you need to update anything.`;
};

export const buildJobUpdateMessage = ({ client, job, worker, business }) => {
  const clientName = safeText(client?.name || job?.client_name || job?.customer_name, "there");
  const workerName = safeText(worker?.name || job?.assigned_worker_name, "our team");
  const businessName = safeText(business?.name || business?.business_name, "our team");
  const title = safeText(job?.title || job?.name, "your job");
  const time = asDate(job?.scheduled_date || job?.scheduled_at || job?.date);
  return `Hi ${clientName}, ${workerName} from ${businessName} has an update on ${title}${time ? ` scheduled ${time}` : ""}. Reply if you have any questions.`;
};

export const buildInvoiceDescription = ({ job, client }) => {
  const preferred = [
    job?.ai_invoice_description,
    job?.invoice_description_draft,
    job?.completion_notes,
    job?.worker_completion_notes,
    job?.worker_notes,
    job?.job_notes,
    job?.notes,
    job?.description,
  ].map((v) => safeText(v, "")).find(Boolean);
  if (preferred) return preferred;
  const jobTitle = safeText(job?.title || job?.name, "Service");
  const clientName = safeText(client?.name || job?.client_name || job?.customer_name, "client");
  const address = safeText(job?.address || job?.location, "site");
  return `${jobTitle} service completed for ${clientName} at ${address}. Work has been marked complete and is ready for billing.`;
};
