import { buildAiActions } from "./aiActions";

function normaliseBackendAction(action) {
  return {
    ...action,
    id: action.id || action._id || action.action_key,
    type: action.category || action.type || action.action_type || "AI ACTION",
    execute: action.action_type || action.execute,
    fields: action.suggested_payload || action.fields || {},
    summary: action.summary || action.description || "",
    risk: action.risk || action.risk_level || "low",
    backend_action: true,
  };
}

function actionsFromData(data = {}) {
  const backendActions = Array.isArray(data.aiActions)
    ? data.aiActions.map(normaliseBackendAction)
    : [];

  return backendActions.length ? backendActions : buildAiActions(data);
}

function moneyNumber(item) {
  const raw =
    item?.total ??
    item?.amount ??
    item?.balance ??
    item?.price ??
    item?.job_price ??
    item?.fixed_price ??
    item?.invoice_total ??
    0;

  const number = Number(raw);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "—";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(number);
}

function riskWeight(action) {
  const risk = String(action?.risk || "").toLowerCase();
  if (risk.includes("high")) return 45;
  if (risk.includes("medium")) return 30;
  if (risk.includes("needs")) return 25;
  if (risk.includes("low")) return 10;
  return 15;
}

function typeWeight(action) {
  const type = String(action?.type || "").toLowerCase();
  if (type.includes("money") || type.includes("invoice")) return 40;
  if (type.includes("proof")) return 36;
  if (type.includes("dispatch")) return 34;
  if (type.includes("quote")) return 24;
  if (type.includes("myob")) return 20;
  if (type.includes("system") || type.includes("setup")) return 18;
  return 12;
}

function statusWeight(action) {
  const status = String(action?.status || "").toLowerCase();
  if (status.includes("ready")) return 25;
  if (status.includes("needs")) return 10;
  return 15;
}

function fieldMoney(action) {
  const fields = action?.fields || {};
  const raw = fields.amount || fields.total || fields.price || fields.value || 0;
  const number = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

export function prioritiseAiActions(actions = []) {
  return [...actions]
    .map((action, index) => {
      const existingScore = Number(action.priority_score);
      const score = Number.isFinite(existingScore) && existingScore > 0
        ? existingScore
        : riskWeight(action) +
          typeWeight(action) +
          statusWeight(action) +
          Math.min(25, fieldMoney(action) / 100) -
          index;

      const existingConfidence = action.confidence ? String(action.confidence).replaceAll("_", " ") : "";
      let confidence = existingConfidence || "Medium";

      if (!existingConfidence) {
        if (score >= 85) confidence = "High";
        if (score < 50) confidence = "Needs data";
      }

      return {
        ...action,
        priority_score: Math.round(score),
        confidence,
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function sum(items = []) {
  return items.reduce((total, item) => total + moneyNumber(item), 0);
}

function dataQuality(data = {}) {
  const checks = [
    {
      key: "clients",
      ok: count(data.clients) > 0,
      label: "Client data",
      fix: "Add or import clients",
    },
    {
      key: "workers",
      ok: count(data.workers) > 0,
      label: "Crew data",
      fix: "Add workers with regions and skills",
    },
    {
      key: "jobs",
      ok: count(data.jobs) > 0,
      label: "Job history",
      fix: "Create or import jobs",
    },
    {
      key: "pricing",
      ok: [...(data.jobs || []), ...(data.invoices || []), ...(data.quotes || [])].some((item) => moneyNumber(item) > 0),
      label: "Pricing data",
      fix: "Add prices to jobs, quotes, or invoices",
    },
  ];

  const passed = checks.filter((item) => item.ok).length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    score,
    checks,
    missing: checks.filter((item) => !item.ok),
  };
}

function bestBriefing(bestAction, metrics, quality) {
  if (bestAction) {
    return {
      title: bestAction.title || "Review next AI action",
      summary: bestAction.summary || "AI has prepared work for owner approval.",
      reason: bestAction.why?.[0] || "This is the strongest next move based on current business data.",
      nav: "queue",
    };
  }

  if (quality.missing.length) {
    return {
      title: quality.missing[0].fix,
      summary: "AI needs stronger business data before it can prepare the day properly.",
      reason: `${quality.missing[0].label} is incomplete.`,
      nav: quality.missing[0].key === "workers" ? "crew" : quality.missing[0].key === "clients" ? "clients" : "jobs",
    };
  }

  return {
    title: "No urgent owner approval needed",
    summary: "Churvox is watching jobs, invoices, quotes, crew and payment follow-ups.",
    reason: "No high-priority action was detected.",
    nav: "queue",
  };
}

export function computeOperatorCommandCore(data = {}) {
  const actions = prioritiseAiActions(actionsFromData(data));

  const metrics = {
    preparedActions: actions.length,
    dispatchGaps: count(data.unassignedJobs),
    proofToPaid: count(data.completedJobs),
    unpaidInvoices: count(data.unpaidInvoices),
    openQuotes: count(data.openQuotes),
    moneyWaiting: sum(data.unpaidInvoices || []),
    proofValue: sum(data.completedJobs || []),
    quotePipeline: sum(data.openQuotes || []),
    smsBalance: Number(data.smsBalance || 0),
    myobConnected: Boolean(data.myobConnected),
  };

  const quality = dataQuality(data);
  const bestAction = actions[0] || null;
  const briefing = bestBriefing(bestAction, metrics, quality);

  const lanes = [
    {
      key: "money",
      label: "Money waiting",
      value: metrics.unpaidInvoices,
      money: formatMoney(metrics.moneyWaiting),
      status: metrics.unpaidInvoices ? "Reminder draft ready" : "Clear",
      nav: "invoices",
    },
    {
      key: "dispatch",
      label: "Jobs needing crew",
      value: metrics.dispatchGaps,
      money: "",
      status: metrics.dispatchGaps ? "Assignment decision needed" : "Covered",
      nav: "jobs",
    },
    {
      key: "proof",
      label: "Completed work",
      value: metrics.proofToPaid,
      money: formatMoney(metrics.proofValue),
      status: metrics.proofToPaid ? "Draft invoice ready" : "Clear",
      nav: "proof",
    },
    {
      key: "quotes",
      label: "Quotes to follow up",
      value: metrics.openQuotes,
      money: formatMoney(metrics.quotePipeline),
      status: metrics.openQuotes ? "Follow-up draft ready" : "Clear",
      nav: "quotes",
    },
  ];

  const guardrails = [
    "AI prepares, owner approves",
    "No customer messages sent automatically",
    "No payroll changes without approval",
    "No MYOB/accounting writes without approval",
    "No customer charges without approval",
  ];

  return {
    actions,
    bestAction,
    briefing,
    metrics,
    lanes,
    quality,
    guardrails,
  };
}
