
const { test, expect } = require("@playwright/test");

const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL || "";
const OWNER_PASSWORD = process.env.CHURVOX_E2E_PASSWORD || "";
const WORKER_EMAIL = process.env.CHURVOX_E2E_WORKER_EMAIL || "";
const WORKER_PASSWORD = process.env.CHURVOX_E2E_WORKER_PASSWORD || "";
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || "https://grassley-backend.onrender.com").replace(/\/+$/, "");
function apiUrl(url) { return `${API_BASE}${url.startsWith("/api") ? url : `/api${url}`}`; }

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function idOf(x) {
  if (!x) return "";
  if (typeof x === "string" || typeof x === "number") return String(x);
  return String(x.id || x._id || x.$oid || x.oid || x.worker_id || x.user_id || x.team_member_id || x.job_id || "");
}

function listFrom(payload, keys = []) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  for (const key of ["workers", "team", "members", "jobs", "notifications", "items", "records", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function textHas(value, token) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(token || "").toLowerCase());
}

async function login(page, email, password, label = "user") {
  await page.goto("/login");
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /log in|login|sign in/i }).first().click();
  await page.waitForURL(/dashboard|plans|setup|guide|worker/i, { timeout: 35000 }).catch(() => null);
  await page.waitForLoadState("domcontentloaded").catch(() => null);
  await page.waitForTimeout(1200);

  const token = await page.evaluate(() => window.localStorage.getItem("token") || "");
  const body = await page.locator("body").innerText().catch(() => "");
  console.log(`${label.toUpperCase()}_LOGIN_URL`, page.url());
  console.log(`${label.toUpperCase()}_TOKEN_PRESENT`, Boolean(token));

  if (!token) {
    throw new Error(`${label} login did not produce a token. URL=${page.url()} BODY=${body.slice(0, 700)}`);
  }
}

async function apiSession(page) {
  const token = await page.evaluate(() => window.localStorage.getItem("token") || "");
  return { request: page.context().request, token };
}

function apiOptions(session, extra = {}) {
  return {
    ...extra,
    headers: {
      ...(extra.headers || {}),
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
  };
}

async function getJson(session, url) {
  const res = await session.request.get(apiUrl(url), apiOptions(session));
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function postJson(session, url, data) {
  const res = await session.request.post(apiUrl(url), apiOptions(session, { data }));
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function patchJson(session, url, data) {
  const res = await session.request.patch(apiUrl(url), apiOptions(session, { data }));
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function findWorker(ownerRequest) {
  const endpoints = ["/api/team/workers", "/api/team", "/api/workers", "/api/worker/live-status"];
  for (const endpoint of endpoints) {
    const res = await getJson(ownerRequest, endpoint + "?ts=" + Date.now());
    if (!res.ok) continue;
    const workers = listFrom(res.body, ["workers", "team", "members"]);
    const wanted = workers.find((w) => String(w.email || w.worker_email || "").toLowerCase() === WORKER_EMAIL.toLowerCase());
    if (wanted) return wanted;
  }
  throw new Error("Could not find worker by CHURVOX_E2E_WORKER_EMAIL. Check Team has that worker.");
}

async function getJob(request, jobId, titleToken = "") {
  const direct = await getJson(request, "/api/jobs/" + encodeURIComponent(jobId));
  if (direct.ok && textHas(direct.body, jobId)) return direct.body.job || direct.body.data?.job || direct.body.data || direct.body;

  const list = await getJson(request, "/api/jobs?ts=" + Date.now());
  const jobs = listFrom(list.body, ["jobs"]);
  return jobs.find((job) => idOf(job) === String(jobId) || textHas(job, titleToken)) || null;
}

test.describe("Churvox worker boss message loop", () => {
  test.setTimeout(180000);

  test("boss to worker and worker to boss messages arrive", async ({ browser }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, "Set owner login env vars.");
    test.skip(!WORKER_EMAIL || !WORKER_PASSWORD, "Set worker login env vars.");

    const id = stamp();
    const bossToken = "Boss to worker test " + id;
    const workerHelpToken = "Worker to boss help " + id;
    const workerDoneToken = "Worker finished message " + id;

    const ownerContext = await browser.newContext();
    const workerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const workerPage = await workerContext.newPage();

    await login(ownerPage, OWNER_EMAIL, OWNER_PASSWORD, "owner");
    const ownerRequest = await apiSession(ownerPage);

    const worker = await findWorker(ownerRequest);
    const workerId = idOf(worker);

    expect(workerId, "worker id").toBeTruthy();

    const createJob = await postJson(ownerRequest, "/api/jobs", {
      title: "Playwright worker message job " + id,
      job_type: "other",
      customer_name: "Playwright Worker Message Customer",
      address: "1 Test Street, Wellington",
      scheduled_date: new Date().toISOString(),
      scheduled_time: "09:00",
      estimated_duration: 60,
      price: 0,
      assigned_worker_id: workerId,
      worker_instructions: bossToken,
      notes: bossToken,
    });

    expect(createJob.ok, "owner can create assigned worker job: " + JSON.stringify(createJob.body)).toBeTruthy();

    let job = createJob.body.job || createJob.body.data?.job || createJob.body.data || createJob.body;
    let jobId = idOf(job);

    if (!jobId) {
      job = await getJob(ownerRequest, "", bossToken);
      jobId = idOf(job);
    }

    expect(jobId, "created job id").toBeTruthy();

    await login(workerPage, WORKER_EMAIL, WORKER_PASSWORD, "worker");
    const workerRequest = await apiSession(workerPage);
    console.log("WORKER_SESSION_TOKEN_PRESENT", Boolean(workerRequest.token));
    const workerMe = await getJson(workerRequest, "/api/auth/me");
    console.log("WORKER_ME_STATUS", workerMe.status);
    console.log("WORKER_ME_BODY", JSON.stringify(workerMe.body, null, 2).slice(0, 1500));

    
    console.log("CREATED_JOB_ID", jobId);
    console.log("WORKER_ID", workerId);
    console.log("WORKER_RECORD", JSON.stringify(worker, null, 2).slice(0, 1200));
    console.log("OWNER_CREATED_JOB", JSON.stringify(job, null, 2).slice(0, 1800));

    const workerJobsRaw = await getJson(workerRequest, "/api/jobs?ts=" + Date.now());
    console.log("WORKER_JOBS_STATUS", workerJobsRaw.status);
    console.log("WORKER_JOBS_BODY", JSON.stringify(workerJobsRaw.body, null, 2).slice(0, 4000));

    const ownerJobRaw = await getJson(ownerRequest, "/api/jobs/" + encodeURIComponent(jobId));
    console.log("OWNER_JOB_DIRECT_STATUS", ownerJobRaw.status);
    console.log("OWNER_JOB_DIRECT_BODY", JSON.stringify(ownerJobRaw.body, null, 2).slice(0, 3000));

    const workerDirectRaw = await getJson(workerRequest, "/api/jobs/" + encodeURIComponent(jobId));
    console.log("WORKER_JOB_DIRECT_STATUS", workerDirectRaw.status);
    console.log("WORKER_JOB_DIRECT_BODY", JSON.stringify(workerDirectRaw.body, null, 2).slice(0, 3000));

    const workerSeesJob = await getJob(workerRequest, jobId, bossToken);
    expect(workerSeesJob, "worker can load assigned job").toBeTruthy();
    expect(textHas(workerSeesJob, bossToken), "worker receives boss instructions").toBeTruthy();

    const office = await postJson(workerRequest, "/api/worker/contact-office", {
      message: workerHelpToken,
      job_id: jobId,
      job_title: "Playwright worker message job " + id,
    });

    expect(office.ok && office.body?.success !== false, "worker contact-office post succeeds: " + JSON.stringify(office.body)).toBeTruthy();

    const notifications = await getJson(ownerRequest, "/api/notifications?limit=80&ts=" + Date.now());
    expect(notifications.ok, "owner notifications load").toBeTruthy();
    expect(textHas(notifications.body, workerHelpToken), "boss receives worker help message in notifications").toBeTruthy();

    const fieldUpdate = await patchJson(workerRequest, "/api/worker/jobs/" + encodeURIComponent(jobId) + "/field-update", {
      worker_notes: workerDoneToken,
    });
    expect(fieldUpdate.ok && fieldUpdate.body?.success !== false, "worker note save succeeds: " + JSON.stringify(fieldUpdate.body)).toBeTruthy();

    const complete = await postJson(workerRequest, "/api/worker/jobs/" + encodeURIComponent(jobId) + "/complete", {
      worker_notes: workerDoneToken,
      photos: [],
      completed_by_worker: true,
      work_review_status: "ready_for_review",
      review_status: "ready_for_review",
      owner_review_status: "ready_for_review",
    });
    expect(complete.ok && complete.body?.success !== false, "worker complete sends to owner: " + JSON.stringify(complete.body)).toBeTruthy();

    const ownerSeesDone = await getJob(ownerRequest, jobId, workerDoneToken);
    expect(textHas(ownerSeesDone, workerDoneToken), "boss receives worker completion message").toBeTruthy();

    const sendBackPayload = {
      owner_note: bossToken + " sent back",
      boss_note: bossToken + " sent back",
      send_back_note: bossToken + " sent back",
      work_review_status: "sent_back",
      review_status: "sent_back",
      owner_review_status: "sent_back",
      worker_action_required: true,
      status: "assigned",
    };

    const sendBackAttempts = [
      ["worker send-back", () => postJson(ownerRequest, "/api/worker/jobs/" + encodeURIComponent(jobId) + "/send-back", sendBackPayload)],
      ["job send-back", () => postJson(ownerRequest, "/api/jobs/" + encodeURIComponent(jobId) + "/send-back", sendBackPayload)],
    ];

    let sendBack = null;
    for (const [label, attempt] of sendBackAttempts) {
      const res = await attempt();
      console.log("SEND_BACK_ATTEMPT", label, res.status, JSON.stringify(res.body, null, 2).slice(0, 1200));
      if (res.ok && res.body?.success !== false && textHas(res.body, bossToken + " sent back")) {
        sendBack = res;
        break;
      }
    }

    expect(sendBack, "real boss send-back endpoint saves and returns the note").toBeTruthy();

    const workerSeesSendBack = await getJob(workerRequest, jobId, bossToken + " sent back");
    expect(textHas(workerSeesSendBack, bossToken + " sent back"), "worker receives boss sent-back message").toBeTruthy();

    await workerPage.goto("/worker/jobs/" + encodeURIComponent(jobId));
    await expect(workerPage.locator("body")).toContainText(/Boss sent this back|Owner needs fix|sent back/i, { timeout: 15000 });

    await ownerContext.close();
    await workerContext.close();
  });
});
