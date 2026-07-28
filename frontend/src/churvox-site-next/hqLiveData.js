import API_BASE from "../lib/apiBase";

export const HQ_LIVE_DATA_BUILD = "churvox-hq-live-information-20260728-funnel";

if (typeof window !== "undefined") {
  window.__CHURVOX_HQ_LIVE_DATA_BUILD__ = HQ_LIVE_DATA_BUILD;
}

const SOURCES = Object.freeze([
  ["Launch", "/api/admin/owner/paid-launch-report"],
  ["Overview", "/api/admin/owner-overview"],
  ["Growth", "/api/admin/owner/growth-report"],
  ["Funnel", "/api/admin/owner/conversion-funnel"],
  ["Connection", "/api/admin/owner/connection"],
  ["Plans", "/api/admin/owner/plan-report"],
  ["Control", "/api/admin/owner/control-log"],
  ["Testers", "/api/admin/owner/testers"],
]);

function host() {
  const configured = String(API_BASE || "").replace(/\/+$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return String(window.location.origin || "").replace(/\/+$/, "");
  return "";
}

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function headers() {
  const currentToken = token();
  return {
    Accept: "application/json",
    ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
  };
}

function bodyOf(payload = {}) {
  const nested = payload?.data?.data ?? payload?.data;
  if (nested === undefined || nested === null) return payload;
  if (Array.isArray(nested)) return { ...payload, items: nested };
  if (typeof nested === "object") return { ...payload, ...nested };
  return payload;
}

function clean(value, fallback = "") {
  if (value === undefined || value === null || typeof value === "object") return fallback;
  const result = String(value).trim();
  return result || fallback;
}

function number(value, fallback = null) {
  if (value === "" || value === undefined || value === null) return fallback;
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function countOf(value) {
  if (Array.isArray(value)) return value.length;
  return number(value, null);
}

function nzNumber(value, fallback = "0") {
  const result = number(value, null);
  return result === null ? fallback : result.toLocaleString("en-NZ");
}

function nzMoney(value) {
  const result = number(value, null);
  if (result === null) return "MRR unavailable";
  return `${result.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 2 })} MRR`;
}

function sourceSummary(label, payload = {}) {
  const body = bodyOf(payload);

  if (label === "Launch") {
    const counts = body.counts || {};
    const paid = number(counts.verified_paid_users, 0);
    const trials = number(counts.verified_trial_users, 0);
    const needsCheck = number(counts.billing_needs_verification, 0);
    const mrr = number(body.billing?.actual_mrr_nzd, null);
    const ready = body.ready_to_take_payments;
    return {
      count: paid,
      value: ready === true ? "Ready to sell" : ready === false ? "Needs attention" : `${nzNumber(paid)} verified paid`,
      status: ready === true ? "Launch ready" : ready === false ? "Launch checks need attention" : "Launch report loaded",
      message: `${nzNumber(paid)} verified paid · ${nzNumber(trials)} verified trials · ${nzNumber(needsCheck)} need billing checks · ${nzMoney(mrr)}`,
      facts: { verifiedPaid: paid, trials, needsCheck, mrr, launchReady: ready },
    };
  }

  if (label === "Overview") {
    const metrics = body.metrics || {};
    const totalUsers = number(metrics.total_users, countOf(body.lists?.all_users) ?? 0);
    const businesses = number(metrics.total_businesses, countOf(body.lists?.businesses) ?? 0);
    const activeToday = number(metrics.active_today, countOf(body.lists?.active_today) ?? 0);
    const jobs = number(metrics.total_jobs, countOf(body.lists?.jobs) ?? 0);
    const invoices = number(metrics.total_invoices, countOf(body.lists?.invoices) ?? 0);
    const clients = number(metrics.total_clients, countOf(body.lists?.clients) ?? 0);
    return {
      count: totalUsers,
      value: `${nzNumber(totalUsers)} registered users`,
      status: "Platform overview live",
      message: `${nzNumber(businesses)} businesses · ${nzNumber(activeToday)} active today · ${nzNumber(jobs)} jobs · ${nzNumber(invoices)} invoices`,
      facts: { totalUsers, businesses, activeToday, jobs, invoices, clients },
    };
  }

  if (label === "Growth") {
    const counts = body.counts || {};
    const uniqueVisitors = number(counts.unique_total, countOf(body.visitors) ?? 0);
    const newVisitorsToday = number(counts.new_unique_today, 0);
    const signups = number(counts.signups_total, 0);
    const acceptedTesters = number(counts.accepted_testers, 0);
    const pageviews = number(counts.pageviews_total, 0);
    return {
      count: uniqueVisitors,
      value: `${nzNumber(uniqueVisitors)} public visitors`,
      status: "Growth activity live",
      message: `${nzNumber(newVisitorsToday)} new today · ${nzNumber(signups)} sign-ups · ${nzNumber(acceptedTesters)} accepted testers · ${nzNumber(pageviews)} pageviews`,
      facts: { uniqueVisitors, newVisitorsToday, signups, acceptedTesters, pageviews },
    };
  }

  if (label === "Funnel") {
    const counts = body.counts || {};
    const homepage = number(counts.homepage_viewed, 0);
    const pricing = number(counts.pricing_viewed, 0);
    const signup = number(counts.signup_started, 0);
    const verified = number(counts.email_verified, 0);
    const firstClient = number(counts.first_client_created, 0);
    const firstJob = number(counts.first_job_created, 0);
    const firstInvoice = number(counts.first_invoice_created, 0);
    return {
      count: homepage,
      value: `${nzNumber(homepage)} homepage visitors`,
      status: "Real conversion funnel live",
      message: `${nzNumber(pricing)} pricing · ${nzNumber(signup)} signup starts · ${nzNumber(verified)} verified · ${nzNumber(firstClient)} first clients · ${nzNumber(firstJob)} first jobs · ${nzNumber(firstInvoice)} first invoices`,
      facts: { funnelHomepage: homepage, funnelPricing: pricing, funnelSignup: signup, funnelVerified: verified, funnelFirstClient: firstClient, funnelFirstJob: firstJob, funnelFirstInvoice: firstInvoice },
    };
  }

  if (label === "Connection") {
    const collectionCount = countOf(body.collections_seen) ?? 0;
    const databaseConnected = body.database_connected === true || body.connected === true;
    const counts = body.counts || {};
    return {
      count: collectionCount,
      value: databaseConnected ? "Database live" : "Database unavailable",
      status: databaseConnected ? "Owner backend connected" : "Connection needs attention",
      message: `${nzNumber(collectionCount)} collections visible · ${nzNumber(counts.users)} user rows · ${nzNumber(counts.jobs)} job rows · ${nzNumber(counts.clients)} client rows`,
      facts: { databaseConnected, collections: collectionCount },
    };
  }

  if (label === "Plans") {
    const paid = number(body.paid_count, countOf(body.paid_users) ?? 0);
    const trials = number(body.trial_count, countOf(body.trial_users) ?? 0);
    const testers = number(body.free_tester_count, countOf(body.free_testers) ?? 0);
    const noPlan = number(body.no_plan_count, countOf(body.no_plan_users) ?? 0);
    const estimatedMrr = number(body.monthly_revenue_estimate, null);
    return {
      count: paid,
      value: `${nzNumber(paid)} paid plans`,
      status: "Plan report live",
      message: `${nzNumber(trials)} trials · ${nzNumber(testers)} free testers · ${nzNumber(noPlan)} without a plan · ${estimatedMrr === null ? "estimate unavailable" : `${nzMoney(estimatedMrr)} estimated`}`,
      facts: { planPaid: paid, planTrials: trials, planTesters: testers, noPlan, estimatedMrr },
    };
  }

  if (label === "Control") {
    const items = Array.isArray(body.items) ? body.items : [];
    const testers = Array.isArray(body.testers) ? body.testers : [];
    const total = number(body.count, items.length);
    const latest = clean(items[0]?.action || items[0]?.title || items[0]?.kind, "No recent owner action");
    return {
      count: total,
      value: `${nzNumber(total)} owner actions`,
      status: "Control log live",
      message: `${nzNumber(testers.length)} tester records · Latest: ${latest}`,
      facts: { controlActions: total },
    };
  }

  if (label === "Testers") {
    const counts = body.counts || {};
    const total = number(counts.total, countOf(body.testers) ?? countOf(body.items) ?? 0);
    const accepted = number(counts.accepted, countOf(body.accepted_testers) ?? 0);
    const active = number(counts.active, countOf(body.active_testers) ?? 0);
    const invited = number(counts.invited_not_accepted, countOf(body.invited_testers) ?? 0);
    const revoked = number(counts.revoked, countOf(body.revoked_testers) ?? 0);
    return {
      count: total,
      value: `${nzNumber(total)} testers`,
      status: "Tester records live",
      message: `${nzNumber(accepted)} accepted · ${nzNumber(active)} active · ${nzNumber(invited)} invited · ${nzNumber(revoked)} revoked`,
      facts: { testers: total, acceptedTesters: accepted, activeTesters: active, invitedTesters: invited, revokedTesters: revoked },
    };
  }

  const total = number(body.total ?? body.count, countOf(body.items) ?? 0);
  return {
    count: total,
    value: `${nzNumber(total)} records`,
    status: clean(body.status || body.state || body.health || body.result, "Available"),
    message: clean(body.message || body.detail || body.summary || body.source, `${label} source returned successfully.`),
    facts: {},
  };
}

async function fetchSource(label, path, signal) {
  const apiHost = host();
  if (!apiHost) return { label, path, state: "unavailable", count: 0, status: "Unavailable", message: "No API host was available.", facts: {} };

  try {
    const response = await fetch(`${apiHost}${path}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: headers(),
      signal,
    });
    const rawBody = await response.json().catch(() => ({}));
    const body = bodyOf(rawBody);
    if (response.status === 401 || response.status === 403) {
      return { label, path, state: "locked", count: 0, status: "Owner access required", message: clean(body.detail || body.message, "Platform owner access is required."), facts: {} };
    }
    if (response.status === 404) {
      return { label, path, state: "missing", count: 0, status: "Not connected", message: "This read endpoint is not registered.", facts: {} };
    }
    if (!response.ok || rawBody?.success === false || rawBody?.ok === false || body?.success === false || body?.ok === false) {
      return { label, path, state: "error", count: 0, status: `Error ${response.status}`, message: clean(body.detail || body.message || body.error, "The source failed safely."), facts: {} };
    }
    return { label, path, state: "live", ...sourceSummary(label, body), fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return { label, path, state: "error", count: 0, status: "Connection error", message: error?.message || "The source failed safely.", facts: {} };
  }
}

export async function loadHqLiveStatus({ signal } = {}) {
  const sources = await Promise.all(SOURCES.map(([label, path]) => fetchSource(label, path, signal)));
  const live = sources.filter((source) => source.state === "live").length;
  const locked = sources.some((source) => source.state === "locked");
  const summary = sources.reduce((combined, source) => ({ ...combined, ...(source.facts || {}) }), {});
  return {
    state: locked ? "locked" : live ? "live" : "unavailable",
    sources,
    summary,
    connected: live,
    total: sources.length,
    fetchedAt: new Date().toISOString(),
  };
}
