import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

async function tryFetchJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim());
  }
  return res.json().catch(() => ({}));
}

export default function EmergencyJobCreatePage() {
  const navigate = useNavigate();
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState([]);

  const [form, setForm] = useState({
    title: "",
    client_id: "",
    client_name: "",
    address: "",
    scheduled_date: "",
    notes: "",
    is_recurring: false,
    recurring_frequency: "weekly",
    custom_repeat_days: "",
  });

  const apiBases = useMemo(() => {
    const envBase =
      process.env.REACT_APP_BACKEND_URL ||
      process.env.REACT_APP_API_URL ||
      "";
    return uniq([
      envBase,
      "",
      window.location.origin,
      "https://grassley-backend.onrender.com",
    ]);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadClients() {
      setLoadingClients(true);
      setError("");

      const paths = ["/api/clients", "/api/customers"];
      for (const base of apiBases) {
        for (const path of paths) {
          try {
            const data = await tryFetchJson(`${base}${path}`);
            const items = Array.isArray(data)
              ? data
              : Array.isArray(data?.clients)
              ? data.clients
              : Array.isArray(data?.customers)
              ? data.customers
              : Array.isArray(data?.items)
              ? data.items
              : [];

            if (alive) {
              setClients(items);
              setLoadingClients(false);
            }
            return;
          } catch (e) {}
        }
      }

      if (alive) {
        setClients([]);
        setLoadingClients(false);
      }
    }

    loadClients();
    return () => {
      alive = false;
    };
  }, [apiBases]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const selectedClient =
      (clients || []).find(
        (c) =>
          String(c.id || c._id || c.client_id || c.customer_id || "") ===
          String(form.client_id || "")
      ) || null;

    const clientId =
      form.client_id ||
      selectedClient?.id ||
      selectedClient?._id ||
      selectedClient?.client_id ||
      selectedClient?.customer_id ||
      "";

    const clientName =
      form.client_name ||
      selectedClient?.name ||
      selectedClient?.client_name ||
      selectedClient?.customer_name ||
      "";

    const payload = {
      title: form.title || "New Job",
      job_title: form.title || "New Job",
      description: form.notes || "",
      notes: form.notes || "",
      address: form.address || selectedClient?.address || "",
      scheduled_date: form.scheduled_date || null,
      date: form.scheduled_date || null,
      status: "assigned",

      client_id: clientId || null,
      customer_id: clientId || null,
      client_name: clientName || null,
      customer_name: clientName || null,

      is_recurring: !!form.is_recurring,
      recurring_frequency: form.is_recurring ? form.recurring_frequency : null,
      custom_repeat_days:
        form.is_recurring && form.recurring_frequency === "custom"
          ? Number(form.custom_repeat_days || 0)
          : null,
    };

    const paths = ["/api/jobs"];
    let lastErr = "Unable to create job";

    for (const base of apiBases) {
      for (const path of paths) {
        try {
          const created = await tryFetchJson(`${base}${path}`, {
            method: "POST",
            body: JSON.stringify(payload),
          });

          const newId =
            created?.id ||
            created?._id ||
            created?.job_id ||
            created?.data?.id ||
            created?.data?._id;

          if (newId) {
            navigate(`/jobs/${newId}`);
          } else {
            navigate("/jobs");
          }
          return;
        } catch (e) {
          lastErr = e.message || String(e);
        }
      }
    }

    setError(lastErr);
    setSaving(false);
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Create Job</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Safe fallback page so you can keep moving while the normal job form is being fixed.
      </p>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 10,
          }}
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <div>
          <label>Job title</label>
          <input
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Lawn mow"
            style={{ width: "100%", padding: 12, marginTop: 6 }}
            required
          />
        </div>

        <div>
          <label>Client</label>
          <select
            value={form.client_id}
            onChange={(e) => {
              const value = e.target.value;
              const selected = (clients || []).find(
                (c) =>
                  String(c.id || c._id || c.client_id || c.customer_id || "") ===
                  String(value)
              );
              updateField("client_id", value);
              updateField(
                "client_name",
                selected?.name ||
                  selected?.client_name ||
                  selected?.customer_name ||
                  ""
              );
              if (!form.address && selected?.address) {
                updateField("address", selected.address);
              }
            }}
            style={{ width: "100%", padding: 12, marginTop: 6 }}
          >
            <option value="">
              {loadingClients ? "Loading clients..." : "Select client"}
            </option>
            {(clients || []).map((c) => {
              const value =
                c.id || c._id || c.client_id || c.customer_id || "";
              const label =
                c.name || c.client_name || c.customer_name || "Unnamed client";
              return (
                <option key={String(value)} value={String(value)}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label>Or client name</label>
          <input
            value={form.client_name}
            onChange={(e) => updateField("client_name", e.target.value)}
            placeholder="Dave"
            style={{ width: "100%", padding: 12, marginTop: 6 }}
          />
        </div>

        <div>
          <label>Address</label>
          <input
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="37 Belmont Terrace"
            style={{ width: "100%", padding: 12, marginTop: 6 }}
          />
        </div>

        <div>
          <label>Scheduled date</label>
          <input
            type="datetime-local"
            value={form.scheduled_date}
            onChange={(e) => updateField("scheduled_date", e.target.value)}
            style={{ width: "100%", padding: 12, marginTop: 6 }}
          />
        </div>

        <div>
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Job notes"
            rows={4}
            style={{ width: "100%", padding: 12, marginTop: 6 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            id="is_recurring"
            type="checkbox"
            checked={form.is_recurring}
            onChange={(e) => updateField("is_recurring", e.target.checked)}
          />
          <label htmlFor="is_recurring">Recurring job</label>
        </div>

        {form.is_recurring ? (
          <>
            <div>
              <label>Repeat</label>
              <select
                value={form.recurring_frequency}
                onChange={(e) => updateField("recurring_frequency", e.target.value)}
                style={{ width: "100%", padding: 12, marginTop: 6 }}
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {form.recurring_frequency === "custom" ? (
              <div>
                <label>Custom repeat days</label>
                <input
                  type="number"
                  min="1"
                  value={form.custom_repeat_days}
                  onChange={(e) => updateField("custom_repeat_days", e.target.value)}
                  placeholder="30"
                  style={{ width: "100%", padding: 12, marginTop: 6 }}
                />
              </div>
            ) : null}
          </>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
          <button type="submit" disabled={saving} style={{ padding: "12px 16px" }}>
            {saving ? "Creating..." : "Create Job"}
          </button>
          <button
            type="button"
            onClick={() => { window.location.href="/emergency-job.html"; }}
            style={{ padding: "12px 16px" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
