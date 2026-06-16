import { useState, useCallback } from "react";
import axios from "axios";
import { formatApiErrorDetail } from "../lib/utils";
import API_BASE from "../lib/apiBase";

axios.defaults.withCredentials = true;

const API_TIMEOUT_MS = 15000;
const MIN_LOADING_MS = 350;

function backendErrorMessage(data) {
  if (!data) return "Request failed";
  return data.error || data.detail || data.message || "Request failed";
}

function linkedJobId(invoice) {
  return String(invoice?.job_id || invoice?.jobId || invoice?.job?.id || invoice?.job?._id || "");
}

function invoiceId(invoice) {
  return String(invoice?.id || invoice?._id || "");
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const request = useCallback(
    async (method, endpoint, data = null, options = {}) => {
      setLoading(true);
      setError(null);
      try {
        const headers = {
          ...getAuthHeaders(),
          ...options.headers,
        };

        if (method === "POST" && endpoint === "/invoices" && data?.job_id) {
          const check = await axios({
            method: "GET",
            url: `${API_BASE}/api/invoices`,
            headers,
            withCredentials: true,
            timeout: options.timeout || API_TIMEOUT_MS,
          });
          const invoices = Array.isArray(check.data) ? check.data : [];
          const duplicate = invoices.find((invoice) => linkedJobId(invoice) === String(data.job_id));
          if (duplicate) {
            const msg = `This job already has invoice ${duplicate.invoice_number || invoiceId(duplicate) || "linked"}. No duplicate draft was created.`;
            setError(msg);
            return { success: false, error: msg, duplicate: true, status: 409, data: duplicate };
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
        const body = response.data;

        if (method === "POST" && endpoint === "/invoices" && data?.job_id && body) {
          try {
            await axios({
              method: "PATCH",
              url: `${API_BASE}/api/jobs/${data.job_id}`,
              headers,
              withCredentials: true,
              timeout: options.timeout || API_TIMEOUT_MS,
              data: {
                invoice_id: invoiceId(body),
                invoice_number: body.invoice_number || null,
                invoiced: true,
                invoice_created: true,
              },
            });
          } catch {
            // Invoice creation stays successful even if the job marker cannot be written.
          }
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

  return { get, post, patch, put, del, loading, error, setError };
}
