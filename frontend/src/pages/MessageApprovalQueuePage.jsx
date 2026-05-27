// CHURVOX_MESSAGE_APPROVAL_QUEUE_PAGE_20260528
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAiAuditLog } from "../concept-c/churvoxTopTierApi";
import "./MessageApprovalQueuePage.css";

const API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function getToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

async function fetchJson(path) {
  const token = getToken();
  const res = await fetch(`${cleanBase(API_BASE)}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.message || `Request failed ${res.status}`);
  return data;
}

export default function MessageApprovalQueuePage() {
  const [state, setState] = useState({ loading: true, error: "", actions: [], audit: [] });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [actionsRes, auditRes] = await Promise.allSettled([
          fetchJson("/api/ai-operator/actions"),
          getAiAuditLog(),
        ]);

        if (!alive) return;

        const actionPayload = actionsRes.status === "fulfilled" ? actionsRes.value : {};
        const actionItems =
          actionPayload.items ||
          actionPayload.actions ||
          actionPayload.data ||
          [];

        setState({
          loading: false,
          error: "",
          actions: Array.isArray(actionItems) ? actionItems : [],
          audit: auditRes.status === "fulfilled" ? auditRes.value.items || [] : [],
        });
      } catch (err) {
        if (!alive) return;
        setState({ loading: false, error: err?.message || "Could not load message queue", actions: [], audit: [] });
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const messages = useMemo(() => {
    const actionMessages = state.actions.filter((item) => {
      const text = `${item.type || ""} ${item.title || ""} ${item.summary || ""} ${item.generated_message || ""} ${item.draft_message || ""}`.toLowerCase();
      return text.includes("message") || text.includes("sms") || text.includes("email") || text.includes("follow");
    });

    const auditMessages = state.audit.filter((item) => {
      const text = `${item.action || ""} ${item.note || ""} ${item.target_type || ""}`.toLowerCase();
      return text.includes("message") || text.includes("draft") || text.includes("email") || text.includes("sms");
    });

    return [...actionMessages, ...auditMessages].slice(0, 80);
  }, [state.actions, state.audit]);

  return (
    <main className="cmq-shell" data-version="CHURVOX_MESSAGE_APPROVAL_QUEUE_PAGE_20260528">
      <section className="cmq-hero">
        <div>
          <p>MESSAGE APPROVAL QUEUE</p>
          <h1>Customer messages stay approval-first.</h1>
          <span>
            Churvox can prepare reminders, updates and follow-ups, but nothing should send until the owner approves.
          </span>
        </div>
        <aside>
          <small>Status</small>
          <b>{state.loading ? "Loading" : `${messages.length} drafts`}</b>
          <em>{state.error || "Nothing auto-sends"}</em>
        </aside>
      </section>

      <section className="cmq-list">
        {messages.length ? messages.map((item, index) => (
          <article className="cmq-card" key={item.id || item._id || index}>
            <small>{item.type || item.action || "draft"}</small>
            <h2>{item.title || item.summary || item.action || "Prepared message"}</h2>
            <p>{item.generated_message || item.draft_message || item.message || item.note || "Prepared for owner review."}</p>
            <span>Review inside the Work Slip before sending.</span>
          </article>
        )) : (
          <article className="cmq-card">
            <small>Clear</small>
            <h2>No message drafts waiting</h2>
            <p>When Churvox prepares customer updates, quote follow-ups or invoice reminders, they will appear here.</p>
          </article>
        )}
      </section>

      <footer className="cmq-footer">
        <Link to="/dashboard">Back to Command Floor</Link>
        <Link to="/operator-tools">Open AI Operator tools</Link>
      </footer>
    </main>
  );
}
