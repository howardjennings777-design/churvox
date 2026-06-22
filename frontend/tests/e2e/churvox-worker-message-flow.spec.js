
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

async function login(page, email, password) {
  await page.goto("/login");
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /log in|login|sign in/i }).first().click();
  await page.waitForURL(/dashboard|plans|setup|guide|worker/i, { timeout: 35000 }).catch(() => null);
  await page.waitForLoadState("domcontentloaded").catch(() => null);
  await page.waitForTimeout(800);
}

async function getJson(request, url) {
  const res = await request.get(apiUrl(url));
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function postJson(request, url, data) {
  const res = await request.post(apiUrl(url), { data });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function patchJson(request, url, data) {
  const res = await request.patch(apiUrl(url), { data });
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

    await login(ownerPage, OWNER_EMAIL, OWNER_PASSWORD);
    const ownerRequest = ownerContext.request;

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

    await login(workerPage, WORKER_EMAIL, WORKER_PASSWORD);
    const workerRequest = workerContext.request;

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
      () => patchJson(ownerRequest, "/api/worker/jobs/" + encodeURIComponent(jobId) + "/field-update", sendBackPayload),
      () => patchJson(ownerRequest, "/api/jobs/" + encodeURIComponent(jobId), sendBackPayload),
      () => postJson(ownerRequest, "/api/worker/jobs/" + encodeURIComponent(jobId) + "/send-back", sendBackPayload),
      () => postJson(ownerRequest, "/api/jobs/" + encodeURIComponent(jobId) + "/send-back", sendBackPayload),
    ];

    let sendBack = null;
    for (const attempt of sendBackAttempts) {
      const res = await attempt();
      if (res.ok && res.body?.success !== false) {
        sendBack = res;
        break;
      }
    }

    expect(sendBack, "boss send-back endpoint exists and succeeds").toBeTruthy();

    const workerSeesSendBack = await getJob(workerRequest, jobId, bossToken + " sent back");
    expect(textHas(workerSeesSendBack, bossToken + " sent back"), "worker receives boss sent-back message").toBeTruthy();

    await workerPage.goto("/worker/jobs/" + encodeURIComponent(jobId));
    await expect(workerPage.locator("body")).toContainText(/Boss sent this back|Owner needs fix|sent back/i, { timeout: 15000 });

    await ownerContext.close();
    await workerContext.close();
  });
});
