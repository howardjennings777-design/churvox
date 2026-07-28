from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import re


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one exact anchor, found {count}")
    file.write_text(text.replace(old, new, 1))
    print(f"patched: {label}")


def regex_once(path: str, pattern: str, replacement: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected one regex anchor, found {count}")
    file.write_text(updated)
    print(f"patched: {label}")


for path in [
    "frontend/tests/e2e/churvox-live-launch-human-audit-v2.spec.js",
    "frontend/tests/e2e/churvox-current-human-owner-worker-flow.spec.js",
]:
    replace_once(
        path,
        "page.getByRole('button', { name: /sign in|log in/i }).first().click();",
        "page.getByRole('button', { name: /open churvox|sign in|log in/i }).first().click();",
        f"current login selector in {path}",
    )

worker_path = "frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx"
replace_once(
    worker_path,
    '  const showWork = viewKey === "today" || viewKey === "jobs";\n',
    '  const showToday = viewKey === "today";\n  const showJobs = viewKey === "jobs";\n',
    "split Worker Today and Jobs modes",
)
replace_once(
    worker_path,
    '    if (!selectedProofNames.length && !String(note || "").trim()) {',
    '    if (!proofNames.length && !String(note || "").trim()) {',
    "proof requires actual evidence or note",
)
replace_once(
    worker_path,
    '      await sendFieldSlip("job_proof", String(note || "Worker added job proof.").trim(), selectedProofNames);',
    '      await sendFieldSlip("job_proof", String(note || "Worker added job proof.").trim(), proofNames);',
    "send complete proof evidence set",
)
replace_once(worker_path, "        {showWork ? <>", "        {showToday ? <>", "Today owns field actions")
jobs_block = '''        {showJobs ? <section className="cvWorkerJobsWorkspace" aria-label="Assigned jobs workspace">
            <header><div><span>Assigned work</span><h3>Job queue</h3></div><strong>{rows.length} job{rows.length === 1 ? "" : "s"}</strong></header>
            <div className="cvWorkerRouteQueue cvWorkerJobsQueue">{hasWork ? <>{visibleJobRows.map((row) => <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button"><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small></button>)}{rows.length > 8 ? <button className="cvWorkerQueueToggle" type="button" onClick={() => setShowAllJobs((value) => !value)}>{showAllJobs ? "Show fewer jobs" : `Show all ${rows.length} jobs`}{hiddenJobCount && !showAllJobs ? ` · ${hiddenJobCount} more` : ""}</button> : null}</> : <p>No assigned jobs.</p>}</div>
            {hasWork ? <article className="cvWorkerJobsSelected"><small>Selected job</small><h3>{title}</h3><p>{detail}</p><div><span>{badge}</span><span>{type}</span></div><Link className="cvWorkerJobsOpenToday" to="/worker/today">Open field actions in Today</Link></article> : null}
          </section> : null}

'''
replace_once(
    worker_path,
    "        {showMessages ? <>",
    jobs_block + "        {showMessages ? <>",
    "give Worker Jobs a dedicated queue screen",
)

worker_css = Path("frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.css")
css = worker_css.read_text()
marker = "/* CHURVOX_DISTINCT_WORKER_JOBS_20260728 */"
if marker not in css:
    css += '''

/* CHURVOX_DISTINCT_WORKER_JOBS_20260728 */
.cvWorkerJobsWorkspace { display:grid; gap:16px; padding:18px; }
.cvWorkerJobsWorkspace > header { display:flex; align-items:end; justify-content:space-between; gap:14px; padding-bottom:13px; border-bottom:1px solid rgba(23,28,24,.14); }
.cvWorkerJobsWorkspace > header div { display:grid; gap:3px; }
.cvWorkerJobsWorkspace > header span { color:#687068; font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.cvWorkerJobsWorkspace > header h3 { margin:0; font-size:24px; letter-spacing:-.04em; }
.cvWorkerJobsWorkspace > header strong { color:#f36b21; font-size:13px; }
.cvWorkerJobsQueue { display:grid; gap:8px; }
.cvWorkerJobsQueue > button { min-height:52px; }
.cvWorkerJobsSelected { display:grid; gap:9px; padding:18px; border-left:4px solid #f36b21; background:#f2eee4; }
.cvWorkerJobsSelected > small { color:#737b73; font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.cvWorkerJobsSelected h3,.cvWorkerJobsSelected p { margin:0; }
.cvWorkerJobsSelected p { color:#596159; font-size:13px; line-height:1.5; }
.cvWorkerJobsSelected > div { display:flex; flex-wrap:wrap; gap:7px; }
.cvWorkerJobsSelected > div span { padding:6px 9px; border-radius:999px; background:#fff; font-size:10px; font-weight:800; }
.cvWorkerJobsOpenToday { display:inline-flex; align-items:center; justify-content:center; width:fit-content; min-height:44px; padding:0 14px; border-radius:10px; background:#171b18; color:#fff; font-size:12px; font-weight:800; text-decoration:none; }
@media (max-width:520px) { .cvWorkerJobsWorkspace { padding:14px; } .cvWorkerJobsSelected { padding:15px; } }
'''
    worker_css.write_text(css)
    print("patched: distinct Worker Jobs styling")

replace_once(
    "frontend/src/churvox-studio/ChurvoxStudioApp.jsx",
    '<button type="button" className="create" onClick={openCreate}><Plus size={18} /><span>Create</span></button>',
    '<button type="button" className="create" aria-label="Create a record" onClick={openCreate}><Plus size={18} /><span>Create</span></button>',
    "accessible global create control",
)

pages = "frontend/src/churvox-studio/StudioPages.jsx"
replace_once(
    pages,
    '''  const columns = [
    ["Unassigned", (job) => /unassigned/i.test(job.worker)],
    ["Ready", (job) => !/unassigned/i.test(job.worker) && /assigned|ready|acknowledged/i.test(job.status)],
    ["Moving", (job) => /progress|working|travel/i.test(job.status)],
    ["Done", (job) => /complete/i.test(job.status)],
  ];''',
    '''  const columns = [
    ["Unassigned", (job) => /unassigned/i.test(job.worker), "New work appears here until a worker is chosen."],
    ["Ready", (job) => !/unassigned/i.test(job.worker) && /assigned|ready|acknowledged/i.test(job.status), "Assigned jobs wait here until field work begins."],
    ["Moving", (job) => /progress|working|travel/i.test(job.status), "Started and travelling jobs appear here while they are active."],
    ["Done", (job) => /complete/i.test(job.status), "Completed jobs stay here ready for owner review and invoicing."],
  ];''',
    "distinct Work lane explanations",
)
replace_once(pages, "columns.map(([label, match]) =>", "columns.map(([label, match, emptyText]) =>", "read Work lane explanation")
replace_once(
    pages,
    'text="Jobs move into this lane automatically as their state changes."',
    "text={emptyText}",
    "remove repeated Work empty-state copy",
)

studio_css = "frontend/src/churvox-studio/churvoxStudio.css"
replace_once(
    studio_css,
    ".cvsEmpty button { display: inline-flex; align-items: center; gap: 6px; width: fit-content; margin-top: 5px; padding: 0; border: 0; background: transparent; color: var(--cvs-orange-deep); cursor: pointer; font-size: 11px; font-weight: 800; }",
    ".cvsEmpty button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: fit-content; min-height: 44px; margin-top: 7px; padding: 0 12px; border: 1px solid rgba(217,79,23,.28); border-radius: 9px; background: rgba(255,255,255,.62); color: var(--cvs-orange-deep); cursor: pointer; font-size: 11px; font-weight: 800; }",
    "touch-sized empty-state actions",
)
replace_once(
    studio_css,
    ".cvsDecisionLane footer button { display: inline-flex; align-items: center; gap: 7px; padding: 0; border: 0; background: transparent; color: var(--cvs-orange-deep); cursor: pointer; font-size: 11px; font-weight: 800; }",
    ".cvsDecisionLane footer button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; color: var(--cvs-orange-deep); cursor: pointer; font-size: 11px; font-weight: 800; }",
    "touch-sized decision action",
)

flow_path = "frontend/tests/e2e/churvox-current-human-owner-worker-flow.spec.js"
new_client_helper = r'''async function createCurrentClient(ownerPage, request, ownerToken, clientName) {
  await ownerPage.goto(`${BASE_URL}/dashboard#clients`, { waitUntil: 'domcontentloaded' });
  await expect(ownerPage.locator('.cvOwnerReady')).toBeVisible({ timeout: 20_000 });
  await ownerPage.getByRole('button', { name: 'Add client', exact: true }).click();
  const dialog = ownerPage.getByRole('dialog', { name: /Create client/i });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.getByLabel('Name', { exact: true }).fill(clientName);
  await dialog.getByLabel('Phone', { exact: true }).fill('021 555 0101');
  await dialog.getByLabel('Email', { exact: true }).fill(`human-current-${Date.now()}@example.com`);
  await dialog.getByLabel('Address', { exact: true }).fill('1 Human Audit Street, Wellington');
  await dialog.getByLabel('Access notes', { exact: true }).fill(`Human audit access note ${clientName}`);
  const responsePromise = ownerPage.waitForResponse(
    (response) => /\/api\/clients(?:\/create)?$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST',
    { timeout: 25_000 },
  );
  await dialog.getByRole('button', { name: 'Create record', exact: true }).click();
  const response = await responsePromise;
  const body = await bodyOf(response);
  expect(response.ok(), `Current client drawer failed ${response.status()}: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
  let clientId = idOf(body.client || body.record || body.data?.client || body.data?.record || body.data || body);
  if (!clientId) {
    await expect.poll(async () => {
      const listed = await api(request, 'get', `/api/clients?ts=${Date.now()}`, ownerToken);
      const found = rowsFrom(listed.body).find((row) => contains(row, clientName));
      clientId = idOf(found);
      return Boolean(clientId);
    }, { timeout: 20_000, intervals: [500, 900, 1500, 2500] }).toBe(true);
  }
  await expect(ownerPage.getByText(clientName).first()).toBeVisible({ timeout: 20_000 });
  return clientId;
}'''
regex_once(
    flow_path,
    r"async function fillCurrentClientForm\(ownerPage, token\) \{.*?\n\}\n\n(?=async function clickWorkerStep)",
    new_client_helper + "\n\n",
    "current client drawer lifecycle test",
)
insert_cleanup = r'''async function cleanupClient(request, ownerToken, clientId, clientName) {
  let id = clientId;
  if (!id) {
    const listed = await api(request, 'get', `/api/clients?ts=${Date.now()}`, ownerToken);
    id = idOf(rowsFrom(listed.body).find((row) => contains(row, clientName)));
  }
  if (!id) return;
  let result = await api(request, 'delete', `/api/clients/${encodeURIComponent(id)}`, ownerToken);
  if (result.response.ok() || result.response.status() === 404) return;
  result = await api(request, 'patch', `/api/clients/${encodeURIComponent(id)}`, ownerToken, { archived: true, status: 'archived', archive_reason: 'human current audit cleanup' });
  expect(result.response.ok() || result.response.status() === 404, `Could not clean test client: ${result.response.status()} ${JSON.stringify(result.body).slice(0, 500)}`).toBeTruthy();
}

'''
replace_once(
    flow_path,
    "async function cleanupJob(request, ownerToken, jobId) {",
    insert_cleanup + "async function cleanupJob(request, ownerToken, jobId) {",
    "client cleanup helper",
)
replace_once(
    flow_path,
    "    const preparedToken = `HUMAN CURRENT PREPARED CLIENT ${run}`;",
    "    const preparedToken = `HUMAN CURRENT CLIENT ${run}`;",
    "align client and assigned job",
)
replace_once(flow_path, "    let preparedSlipId = '';", "    let clientId = '';", "track created client")
old_step = '''      await test.step('Owner logs in and prepares a real current client Command slip', async () => {
        await seedVerifiedSession(ownerPage, ownerToken, OWNER_EMAIL, 'owner');
        preparedSlipId = await fillCurrentClientForm(ownerPage, preparedToken);
        await ownerPage.goto(`${BASE_URL}/dashboard#command`, { waitUntil: 'domcontentloaded' });
        await expect.poll(async () => (await ownerPage.locator('body').innerText()).includes(preparedToken), {
          message: 'Prepared client slip did not appear in owner Command',
          timeout: 25_000,
          intervals: [500, 900, 1500, 2500],
        }).toBe(true);
      });'''
new_step = '''      await test.step('Owner logs in and creates a real client through the current drawer', async () => {
        await seedVerifiedSession(ownerPage, ownerToken, OWNER_EMAIL, 'owner');
        clientId = await createCurrentClient(ownerPage, request, ownerToken, preparedToken);
      });'''
replace_once(flow_path, old_step, new_step, "current owner client UI step")
replace_once(
    flow_path,
    '''      if (preparedSlipId) {
        await api(request, 'post', `/api/command/slips/${encodeURIComponent(preparedSlipId)}/ignore`, ownerToken, { action: 'Ignore', note: 'Human audit cleanup' });
      }
      await cleanupJob(request, ownerToken, jobId);''',
    '''      await cleanupClient(request, ownerToken, clientId, preparedToken);
      await cleanupJob(request, ownerToken, jobId);''',
    "clean current client and job records",
)

replace_once(
    "backend/server/__init__.py",
    "_force_install_final_command_patch()\n_remove_route('/api/command-fast-load/boot', 'GET')",
    "_force_install_final_command_patch()\n# Reassert the owner-visible worker Command response after the final legacy Command patch.\n_install_launch_patch('churvox_worker_command_visibility_patch')\n_remove_route('/api/command-fast-load/boot', 'GET')",
    "real Render wrapper owns current Command slips response",
)

stamp = datetime.now(timezone.utc).isoformat()
Path("backend/RENDER_RESTART_20260615.txt").write_text(
    f"render-restart-current-full-user-repair-20260728\nTriggered: {stamp}\nPurpose: current full owner-worker user-test repairs and final Command route ownership\n"
)
Path("frontend/public/render-deploy-marker.txt").write_text(
    f"churvox-current-full-user-repair-20260728\n{stamp}\n"
)
print("updated Render deployment markers")
