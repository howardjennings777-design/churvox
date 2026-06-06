const MIN_LOADING_MS = 350;
import { useState, useCallback } from "react";
import axios from "axios"
axios.defaults.withCredentials = true;
import { formatApiErrorDetail } from "../lib/utils";

import API_BASE from "../lib/apiBase";

const API_TIMEOUT_MS = 15000;

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
        const config = {
          method,
          url: `${API_BASE}/api${endpoint}`,
          headers: {
            ...getAuthHeaders(),
            ...options.headers,
          },
          withCredentials: true,
          timeout: options.timeout || API_TIMEOUT_MS,
          ...options,
        };
        if (data) {
          config.data = data;
        }
        const response = await axios(config);
        return { success: true, data: response.data };
      } catch (err) {
        const isTimeout = err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "");
        const errorMessage = isTimeout
          ? "The server took too long to respond. Please refresh and try again."
          : formatApiErrorDetail(err.response?.data?.detail) || err.message;
        setError(errorMessage);
        return { success: false, error: errorMessage, timeout: isTimeout };
      } finally {
        setLoading(false);
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
