import { useState, useCallback, useRef } from "react";
import axios from "axios";
import { formatApiErrorDetail } from "../lib/utils";
import API_BASE from "../lib/apiBase";

axios.defaults.withCredentials = true;

const API_TIMEOUT_MS = 30000;
const MIN_LOADING_MS = 350;

function backendErrorMessage(data) {
  if (!data) return "Request failed";
  return data.error || data.detail || data.message || "Request failed";
}

function normalizeEndpoint(endpoint) {
  if (endpoint === "/team") return "/team/workers";
  if (endpoint === "/workers") return "/team/workers";
  if (endpoint === "/messages") return "/approved-notifications";
  if (endpoint === "/ai-review-items") return "/ai/actions";
  return endpoint;
}

function normalizeMessageBody(rawEndpoint, body) {
  if (rawEndpoint !== "/messages") return body;
  const rows = Array.isArray(body?.messages)
    ? body.messages
    : Array.isArray(body?.notifications)
      ? body.notifications
      : Array.isArray(body?.items)
        ? body.items
        : Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body)
            ? body
            : [];
  const messages = rows.map((item, index) => ({
    id: item.id || item._id || item.source_id || `message-${index}`,
    from: item.from || item.type || item.event_type || "Churvox",
    subject: item.subject || item.title || "Churvox update",
    detail: item.detail || item.message || item.body || "Owner update ready.",
    draft: item.draft || item.reply || "Review this update in Command if it needs an owner decision.",
    history: item.history || item.created_at || item.updated_at || "recent",
    client: item.client || item.client_name || "Business",
    job: item.job || item.job_title || item.route || "Churvox",
    priority: item.priority || (item.read || item.is_read ? "Read" : "Unread"),
    channel: item.channel || "Owner notification",
    ...item,
  }));
  return { success: true, messages, items: messages, data: messages };
}

function normalizeAiBody(rawEndpoint, body) {
  if (rawEndpoint !== "/ai/actions") return body;
  const rows = Array.isArray(body?.actions)
    ? body.actions
    : Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body)
          ? body
          : [];
  const actions = rows.map((item, index) => ({
    id: item.id || item._id || item.action_id || `command-${index}`,
    type: item.type || item.action || item.category || "Admin review",
    title: item.title || item.summary || item.label || "Prepared admin item",
    status: item.status || (item.preparedForApproval ? "Ready" : "Review"),
    owner: item.owner || item.recommended_action || "Approve",
    client: item.client || item.client_name || item.customer_name || item.payload?.client_name || item.payload?.customer_name || "Business",
    amount: item.amount || item.total || item.payload?.amount || item.payload?.price || 0,
    filled: item.filled || item.summary || item.description || item.payload?.description || "Prepared for owner review.",
    evidence: item.evidence || item.reason || item.match?.reason || "Prepared from live business records.",
    check: item.check || item.owner_check || "Approve, edit or park in Command.",
    ...item,
  }));
  return { success: true, actions, items: actions, data: actions };
}

function normalizeBody(rawEndpoint, body) {
  return normalizeAiBody(rawEndpoint, normalizeMessageBody(rawEndpoint, body));
}

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || value.job_id || value.invoice_id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function linkedJobId(invoice) {
  return normalizeId(invoice?.job_id || invoice?.linked_job_id || invoice?.source_job_id || invoice?.jobId || invoice?.job?.id || invoice?.job?._id || "");
}

function invoiceId(invoice) {
  return normalizeId(invoice?.id || invoice?._id || invoice?.invoice_id || invoice?.number || invoice?.invoice_number || "");
}

function listFromPayload(payload, key = "") {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  if (key && Array.isArray(data?.data?.[key])) return data.data[key];
  for (const name of ["invoices", "items", "records", "results", "data"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function invoiceRecord(payload) {
  const data = payload?.data ?? payload;
  const candidates = [
    data?.invoice,
    data?.record,
    data?.item,
    data?.data?.invoice,
    data?.data?.record,
    data?.data?.item,
    data?.data,
    data,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return candidate;
  }
  return {};
}

async function markJobInvoiced({ jobId, invoice, headers, timeout }) {
  const normalizedJobId = normalizeId(jobId);
  if (!normalizedJobId) return;
  const record = invoiceRecord(invoice);
  const normalizedInvoiceId = invoiceId(record) || invoiceId(invoice);
  try {
    await axios({
      method: "PATCH",
      url: `${API_BASE}/api/jobs/${normalizedJobId}`,
      headers,
      withCredentials: true,
      timeout: timeout || API_TIMEOUT_MS,
      data: {
        invoice_id: normalizedInvoiceId || null,
        linked_invoice_id: normalizedInvoiceId || null,
        invoice_number: record.invoice_number || record.number || null,
        invoice_status: record.status || "draft",
        invoice_ready: false,
        invoiced: true,
        invoice_created: true,
        invoice_generated_at: new Date().toISOString(),
      },
    });
  } catch {
    // Invoice creation stays successful even if the job marker cannot be written.
  }
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const request = useCallback(
    async (method, rawEndpoint, data = null, options = {}) => {
      const endpoint = normalizeEndpoint(rawEndpoint);
      setLoading(true);
      setError(null);
      try {
        const headers = {
          ...getAuthHeaders(),
          ...options.headers,
        };

        if (method === "POST" && endpoint === "/invoices" && data?.job_id) {
          try {
            const check = await axios({
              method: "GET",
              url: `${API_BASE}/api/invoices`,
              headers,
              withCredentials: true,
              timeout: options.timeout || API_TIMEOUT_MS,
            });
            const invoices = listFromPayload(check.data, "invoices");
            const duplicate = invoices.find((invoice) => linkedJobId(invoice) === normalizeId(data.job_id));
            if (duplicate) {
              await markJobInvoiced({ jobId: data.job_id, invoice: duplicate, headers, timeout: options.timeout });
              return { success: true, duplicate: true, status: 200, data: duplicate };
            }
          } catch {
            // Duplicate checking is best-effort only. Never block creating a draft invoice.
          }
        }

        const config = {
          method,
          url: `${API_BASE}/api${endpoint}`,
          headers,
          withCredentials: true,
          timeout: options.timeout || API_TIMEOUT_MS,
          ...options,
        };
        if (data) {
          config.data = data;
        }
        const response = await axios(config);
        const body = normalizeBody(rawEndpoint, response.data);

        if (method === "POST" && endpoint === "/invoices" && data?.job_id && body) {
          await markJobInvoiced({ jobId: data.job_id, invoice: invoiceRecord(body), headers, timeout: options.timeout });
        }

        if (body === "" || body === null || body === undefined) {
          const msg = `Empty response from API: ${method} ${endpoint}`;
          setError(msg);
          return {
            success: false,
            error: msg,
            status: response.status,
            headers: response.headers,
            data: body,
          };
        }

        if (body && body.success === false) {
          const msg = backendErrorMessage(body);
          setError(msg);
          return { success: false, error: msg, data: body, status: response.status };
        }

        return { success: true, data: body, status: response.status };
      } catch (err) {
        const detail = err.response?.data?.detail;
        const duplicateInvoiceId = detail?.invoice_id;
        if (method === "POST" && endpoint === "/invoices" && err.response?.status === 409 && duplicateInvoiceId) {
          try {
            const headers = {
              ...getAuthHeaders(),
              ...options.headers,
            };
            const duplicateRes = await axios({
              method: "GET",
              url: `${API_BASE}/api/invoices/${duplicateInvoiceId}`,
              headers,
              withCredentials: true,
              timeout: options.timeout || API_TIMEOUT_MS,
            });
            if (duplicateRes.data) {
              await markJobInvoiced({ jobId: data?.job_id, invoice: duplicateRes.data, headers, timeout: options.timeout });
              return { success: true, duplicate: true, status: 200, data: invoiceRecord(duplicateRes.data) };
            }
          } catch {}
          const fallbackDuplicate = { id: duplicateInvoiceId, invoice_number: detail?.invoice_number, job_id: data?.job_id, status: "draft" };
          const headers = {
            ...getAuthHeaders(),
            ...options.headers,
          };
          await markJobInvoiced({ jobId: data?.job_id, invoice: fallbackDuplicate, headers, timeout: options.timeout });
          return { success: true, duplicate: true, status: 200, data: fallbackDuplicate };
        }

        const isTimeout = err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "");
        const errorMessage = isTimeout
          ? "The server took too long to respond. Please refresh and try again."
          : formatApiErrorDetail(err.response?.data?.detail) || err.response?.data?.error || err.response?.data?.message || err.message;
        setError(errorMessage);
        return { success: false, error: errorMessage, timeout: isTimeout, data: err.response?.data };
      } finally {
        window.setTimeout(() => setLoading(false), MIN_LOADING_MS);
      }
    },
    [getAuthHeaders]
  );

  const get = useCallback((endpoint, options) => request("GET", endpoint, null, options), [request]);
  const post = useCallback((endpoint, data, options) => request("POST", endpoint, data, options), [request]);
  const patch = useCallback((endpoint, data, options) => request("PATCH", endpoint, data, options), [request]);
  const put = useCallback((endpoint, data, options) => request("PUT", endpoint, data, options), [request]);
  const del = useCallback((endpoint, options) => request("DELETE", endpoint, null, options), [request]);
  const stableApi = useRef(null);

  if (!stableApi.current) stableApi.current = {};
  Object.assign(stableApi.current, { get, post, patch, put, del, loading, error, setError });

  return stableApi.current;
}
