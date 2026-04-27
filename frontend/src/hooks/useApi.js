const MIN_LOADING_MS = 350;
import { useState, useCallback } from "react";
import axios from "axios"
axios.defaults.withCredentials = true;
import { formatApiErrorDetail } from "../lib/utils";

import API_BASE from "../lib/apiBase";

function optionalEmptyEndpoint(method, endpoint) {
  if (String(method).toUpperCase() !== "GET") return null;
  const clean = String(endpoint || "");
  if (clean === "/follow-up-tasks" || clean.startsWith("/follow-up-tasks?")) return [];
  if (clean === "/tasks" || clean.startsWith("/tasks?")) return [];
  return null;
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
      const optionalEmpty = optionalEmptyEndpoint(method, endpoint);
      if (optionalEmpty !== null) {
        return { success: true, data: optionalEmpty };
      }

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
          ...options,
        };
        if (data !== null && data !== undefined) {
          config.data = data;
        }
        const response = await axios(config);
        return { success: true, data: response.data };
      } catch (err) {
        const errorMessage = formatApiErrorDetail(err.response?.data?.detail) || err.message;
        setError(errorMessage);
        return { success: false, error: errorMessage };
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
