import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, statusSlug, toArray } from "./api";

export const PLAN_TIERS = [
  { id: "solo", name: "Solo", price: 39, clients: 20, users: 1, myob: "No MYOB", blocks: "No extra blocks" },
  { id: "team", name: "Team", price: 89, clients: 30, users: 5, myob: "No MYOB", blocks: "No extra blocks" },
  { id: "pro", name: "Pro", price: 159, clients: 40, users: 15, myob: "Optional MYOB add-on $39/month", blocks: "No extra blocks" },
  { id: "enterprise", name: "Enterprise", price: 299, clients: 50, users: 50, myob: "MYOB included", blocks: "$100 per extra 50 users" },
];

export const SMS_PACKS = [
  { id: "100", credits: 100, price: 10 },
  { id: "500", credits: 500, price: 45 },
  { id: "1000", credits: 1000, price: 80 },
];

async function safe(path, keys, fallback) {
  try {
    const payload = await apiFetch(path);
    return { data: keys ? toArray(payload, keys) : payload || fallback, ok: true };
  } catch (error) {
    return { data: fallback, ok: false, error: error.message };
  }
}

export function useOperatorData() {
  const [state, setState] = useState({
    loading: true,
    notice: "",
    jobs: [],
    clients: [],
    quotes: [],
    invoices: [],
    workers: [],
    billing: {},
    sms: {},
    myob: {},
    aiActions: [],
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, notice: "" }));

    const [jobs, clients, quotes, invoices, workers, billing, sms, myob, aiActions] = await Promise.all([
      safe("/jobs", ["jobs"], []),
      safe("/clients", ["clients"], []),
      safe("/quotes", ["quotes"], []),
      safe("/invoices", ["invoices"], []),
      safe("/team/workers", ["workers", "team"], []),
      safe("/billing/status", null, {}),
      safe("/sms/balance", null, {}),
      safe("/myob/status", null, {}),
      safe("/ai/operator/actions", ["actions"], []),
    ]);

    const failed = [jobs, clients, quotes, invoices, workers, billing, sms, myob, aiActions].some((x) => !x.ok);

    setState({
      loading: false,
      notice: failed ? "Live data is syncing. Churvox is still usable." : "",
      jobs: jobs.data,
      clients: clients.data,
      quotes: quotes.data,
      invoices: invoices.data,
      workers: workers.data,
      billing: billing.data,
      sms: sms.data,
      myob: myob.data,
      aiActions: aiActions.data,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const derived = useMemo(() => {
    const jobs = state.jobs || [];
    const invoices = state.invoices || [];
    const quotes = state.quotes || [];
    const workers = state.workers || [];

    const completedJobs = jobs.filter((j) => ["completed", "done", "closed"].includes(statusSlug(j)));
    const activeJobs = jobs.filter((j) => !["completed", "done", "closed", "cancelled"].includes(statusSlug(j)));

    const unassignedJobs = activeJobs.filter(
      (j) => !j.assigned_worker_id && !j.worker_id && !j.assigned_to && !j.assigned_worker_name && !j.worker_name
    );

    const unpaidInvoices = invoices.filter((i) =>
      ["draft", "sent", "unpaid", "pending", "overdue", "open"].includes(statusSlug(i, "draft"))
    );

    const overdueInvoices = invoices.filter((i) => statusSlug(i, "").includes("overdue"));

    const openQuotes = quotes.filter((q) =>
      ["open", "sent", "pending", "waiting", "draft"].includes(statusSlug(q, "open"))
    );

    const availableWorkers = workers.filter((w) =>
      ["active", "available", "ready", "worker", ""].includes(statusSlug(w, "active"))
    );

    const currentPlan =
      state.billing?.plan ||
      state.billing?.current_plan ||
      state.billing?.subscription_plan ||
      localStorage.getItem("churvox_plan") ||
      "none";

    return {
      completedJobs,
      activeJobs,
      unassignedJobs,
      unpaidInvoices,
      overdueInvoices,
      openQuotes,
      availableWorkers,
      currentPlan,
      planStatus:
        state.billing?.plan_status ||
        state.billing?.subscription_status ||
        state.billing?.status ||
        "not selected",
      smsBalance: Number(state.sms?.balance ?? state.sms?.credits ?? 0),
      myobConnected: Boolean(state.myob?.connected || state.myob?.is_connected || state.myob?.status === "connected"),
    };
  }, [state]);

  return { ...state, ...derived, reload: load };
}
