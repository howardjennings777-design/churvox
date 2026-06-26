from pathlib import Path
from html import escape
from datetime import datetime, timezone
import csv

root = Path(".")
deploy = root / "frontend/public/deploy-checks"
testdata = root / "frontend/public/test-data"
deploy.mkdir(parents=True, exist_ok=True)
testdata.mkdir(parents=True, exist_ok=True)

stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

csv_files = {
    "churvox-test-clients.csv": {
        "headers": ["name", "email", "phone", "address", "notes"],
        "rows": [
            ["E2E Test Client One", "e2e.client.one@example.com", "+64210000001", "10 Test Street, Wellington", "Human test client - regular mowing"],
            ["E2E Test Client Two", "e2e.client.two@example.com", "+64210000002", "20 Test Road, Lower Hutt", "Human test client - quote follow-up"],
            ["E2E Missing Email Client", "", "+64210000003", "30 Proof Lane, Upper Hutt", "Used to test missing customer details"],
        ],
    },
    "churvox-test-team.csv": {
        "headers": ["name", "email", "phone", "role", "hourly_rate", "notes"],
        "rows": [
            ["E2E Test Worker", "e2e.worker@example.com", "+64210000111", "Worker", "32", "Use for worker proof/time test"],
            ["E2E Test Admin", "e2e.admin@example.com", "+64210000112", "Admin", "35", "Use for office/admin test"],
        ],
    },
    "churvox-test-jobs.csv": {
        "headers": ["client_name", "job_title", "address", "scheduled_date", "scheduled_time", "assigned_to", "price", "status", "notes"],
        "rows": [
            ["E2E Test Client One", "E2E One-off lawn tidy", "10 Test Street, Wellington", "2026-06-28", "09:00", "E2E Test Worker", "85", "Scheduled", "Create, assign, complete, invoice-ready"],
            ["E2E Test Client One", "E2E recurring fortnightly mow", "10 Test Street, Wellington", "2026-06-29", "10:30", "E2E Test Worker", "65", "Scheduled", "Use to test recurring job flow"],
            ["E2E Missing Email Client", "E2E proof required cleanup", "30 Proof Lane, Upper Hutt", "2026-06-30", "13:00", "E2E Test Worker", "120", "Scheduled", "Use to test missing proof/details"],
        ],
    },
    "churvox-test-quotes.csv": {
        "headers": ["client_name", "quote_title", "description", "amount", "status", "notes"],
        "rows": [
            ["E2E Test Client Two", "E2E hedge trim quote", "Trim front hedge and remove green waste", "180", "Draft", "Review, send/approve, convert to job"],
            ["E2E Test Client One", "E2E garden reset quote", "Garden reset with follow-up visit", "240", "Accepted", "Test accepted quote to job flow"],
        ],
    },
    "churvox-test-invoices.csv": {
        "headers": ["client_name", "invoice_number", "description", "amount", "status", "due_date", "notes"],
        "rows": [
            ["E2E Test Client One", "E2E-INV-001", "One-off lawn tidy", "85", "Draft", "2026-07-05", "Review draft invoice"],
            ["E2E Test Client Two", "E2E-INV-002", "Hedge trim quote deposit", "90", "Unpaid", "2026-07-06", "Test unpaid/admin debt"],
        ],
    },
}

for filename, spec in csv_files.items():
    with (testdata / filename).open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(spec["headers"])
        writer.writerows(spec["rows"])

sections = [
    {
        "title": "0. Test rules",
        "goal": "Keep the test clean and safe.",
        "steps": [
            ("Use only E2E test names/data", "No real customers, workers, invoices, or private info are used."),
            ("Open the live site on desktop and phone/tablet", "You can compare desktop and mobile behaviour."),
            ("Use the test CSV files from /test-data/", "Imports use safe test records only."),
            ("If something fails, write the exact page + button + error", "Fixes are faster because the issue is clear."),
        ],
    },
    {
        "title": "1. Public site, login, session",
        "goal": "Make sure the app starts cleanly and auth does not confuse users.",
        "steps": [
            ("Open https://www.churvox.com", "Main site loads without blank screen."),
            ("Open /login", "Login page loads with Churvox branding."),
            ("Log in as owner/test user", "You land inside the app without refresh loops."),
            ("Refresh the page", "Session remains active."),
            ("Log out", "You return to login."),
            ("Log in again", "Session works a second time."),
            ("Test forgot password page/link if available", "User sees a helpful reset flow or message."),
        ],
    },
    {
        "title": "2. Smart Hub daily flow",
        "goal": "Owner should instantly know what matters today.",
        "steps": [
            ("Open Smart Hub / dashboard", "Page loads and feels like the starting point."),
            ("Check Today / This Week / Needs Attention areas", "Owner can see jobs, late work, approvals, and money/admin items."),
            ("Use mobile quick actions", "New job, Add client, Approve buttons are visible and tappable."),
            ("Use Ask Churvox from Smart Hub", "Typing 'new job for E2E Test Client One' opens/starts the correct flow."),
            ("Tap items/cards", "Details open in a modal/sheet, not a confusing full-page jump."),
        ],
    },
    {
        "title": "3. Business setup/settings",
        "goal": "Owner can make the workspace feel real.",
        "steps": [
            ("Open Settings", "Settings page loads cleanly."),
            ("Update business name/test details", "Save works or gives a clear reason if blocked."),
            ("Check branding/logo area if present", "Mobile layout is readable."),
            ("Check GST/tax rate fields if present", "Values are understandable and save safely."),
            ("Check language/region fields if present", "No broken controls or hidden text."),
        ],
    },
    {
        "title": "4. Clients",
        "goal": "Owner can create and manage customers easily.",
        "steps": [
            ("Open Clients", "Clients list loads with empty/loading states if no clients."),
            ("Create E2E Test Client One manually", "Client saves and appears in list."),
            ("Open client details", "Details open in modal/sheet."),
            ("Edit phone/address/notes", "Changes save and persist after refresh."),
            ("Create E2E Missing Email Client", "Client can exist, but missing email should be obvious later."),
            ("Import churvox-test-clients.csv", "CSV import accepts test clients or shows clear import result."),
            ("Search/filter clients if available", "E2E clients can be found."),
        ],
    },
    {
        "title": "5. Team / workers",
        "goal": "Owner can add workers and worker view stays simple.",
        "steps": [
            ("Open Team", "Team page loads cleanly."),
            ("Create E2E Test Worker manually", "Worker saves and appears."),
            ("Check invite email/help text", "Copy is clear and not scary."),
            ("Edit worker role/rate/details", "Save works or error is clear."),
            ("Import churvox-test-team.csv", "CSV import creates/updates workers or clearly reports result."),
            ("Check worker-only view if available", "Worker does not see owner-only controls like pricing/admin."),
        ],
    },
    {
        "title": "6. Jobs",
        "goal": "Job creation, assignment, details, and completion are the core flow.",
        "steps": [
            ("Open Jobs", "Jobs page loads without blank screen."),
            ("Create E2E One-off lawn tidy", "Job saves with client, address, date/time, worker, and price."),
            ("Open job details", "Details open in modal/sheet."),
            ("Edit job notes/price/status", "Changes persist after refresh."),
            ("Assign E2E Test Worker", "Assigned worker is visible on the job."),
            ("Create E2E recurring fortnightly mow", "Recurring/repeat option saves or gives clear message."),
            ("Import churvox-test-jobs.csv", "CSV import accepts jobs or gives clear result."),
            ("Complete one test job", "Job becomes Completed and does not stay stuck In Progress."),
        ],
    },
    {
        "title": "7. Worker proof / time",
        "goal": "Worker can prove work happened without confusion.",
        "steps": [
            ("Open worker view / Worker Proof", "Worker sees assigned jobs only."),
            ("Acknowledge assigned E2E job", "Acknowledged state saves."),
            ("Start job timer", "Timer starts without network error."),
            ("Pause job timer", "Timer pauses and state is visible."),
            ("Resume job timer", "Timer resumes."),
            ("Add worker note", "Note saves and owner can see it."),
            ("Add/upload photo if available", "Photo/proof is visible or clear if upload unavailable."),
            ("Complete job", "Completed state saves and owner sees proof/time context."),
            ("Refresh after completion", "Status and proof remain."),
        ],
    },
    {
        "title": "8. Quotes",
        "goal": "Quotes should lead naturally into jobs.",
        "steps": [
            ("Open Quotes", "Quotes page loads cleanly."),
            ("Create E2E hedge trim quote", "Quote saves with client, amount, and description."),
            ("Open quote details", "Details open cleanly."),
            ("Edit quote", "Changes persist."),
            ("Mark/handle accepted quote", "Accepted quote status is clear."),
            ("Convert or continue quote to job if available", "Job is created or next step is clear."),
            ("Import churvox-test-quotes.csv", "Quote import works or clearly reports result."),
        ],
    },
    {
        "title": "9. Invoices / money",
        "goal": "Completed work should become invoice-ready and money should be easy to track.",
        "steps": [
            ("Open Invoices/Money", "Invoices page loads cleanly."),
            ("Create invoice from E2E completed job if available", "Draft invoice uses client/job/price details."),
            ("Create E2E draft invoice manually if needed", "Draft saves and appears."),
            ("Open invoice details", "Details open in modal/sheet."),
            ("Check draft/review wording", "Nothing says it sent automatically."),
            ("Mark/test unpaid/overdue state", "Money/admin debt is visible."),
            ("Import churvox-test-invoices.csv", "Invoice import works or clearly reports result."),
            ("Refresh after invoice actions", "Invoice states persist."),
        ],
    },
    {
        "title": "10. Command approval desk",
        "goal": "Churvox should prepare admin, then wait for owner approval.",
        "steps": [
            ("Open Command", "Command loads without white/washed-out cards."),
            ("Run Check for work", "Command finds or prepares relevant test admin items."),
            ("Open one Command slip", "Slip shows found/prepared/why/proof/next step."),
            ("Review prepared form", "Preview is readable and not too long."),
            ("Approve safe item", "Approval succeeds or gives clear reason if blocked."),
            ("Mark item Needs edit", "State updates and does not break list."),
            ("Park item for now", "Item parks without deleting records."),
            ("Refresh Command", "Queue remains consistent."),
        ],
    },
    {
        "title": "11. Owner Health Check",
        "goal": "Health layer should support the whole site, not feel like builder notes.",
        "steps": [
            ("Open Owner Health Check inside Command", "It uses customer-safe language, not Top 9/build wording."),
            ("Open health checks", "Checklist is readable and tickable."),
            ("Tick several checks", "Progress updates."),
            ("Refresh page", "Ticks remain saved locally."),
            ("Open Health report", "Report uses owner/customer-safe wording."),
            ("Copy health report", "Clipboard or fallback save message works."),
        ],
    },
    {
        "title": "12. Accounting sync / Xero",
        "goal": "Accounting sync must feel safe and owner-controlled.",
        "steps": [
            ("Open Accounting Sync/Xero page", "Page loads cleanly."),
            ("Check wording", "It says draft sync only / owner-approved where relevant."),
            ("Check connect/disconnect buttons", "Buttons are clear and disabled only for a clear reason."),
            ("Check CSV/bookkeeper pack buttons", "Downloads work or show clear result."),
            ("Check payment refresh/status", "No automatic paid marking unless accounting confirms it."),
        ],
    },
    {
        "title": "13. Plans/pricing",
        "goal": "Pricing should feel clear, honest, and not trapped.",
        "steps": [
            ("Open Plans", "Plans page loads."),
            ("Check Start/Crew/Operator/Command prices", "Prices match locked pricing."),
            ("Check Operator recommended/Most Popular", "Recommended plan is clear."),
            ("Check Command Growth Pack", "Growth Pack wording is clear."),
            ("Check Accounting Sync Add-on wording", "No confusing public MYOB wording."),
            ("Start checkout flow if safe", "Selected plan/add-on is correct before payment."),
            ("Return/cancel flow if tested", "Current plan display does not become stale/wrong."),
        ],
    },
    {
        "title": "14. Imports/exports",
        "goal": "A real business can move from spreadsheets without pain.",
        "steps": [
            ("Open Imports", "Imports page loads."),
            ("Download each template", "Clients, Team, Jobs, Quotes, Invoices templates download."),
            ("Import clients CSV", "Comma CSV works."),
            ("Import team CSV", "Team CSV works."),
            ("Import jobs CSV", "Jobs CSV works or gives clear required field message."),
            ("Try semicolon/tab CSV if available", "Parser handles alternate delimiters."),
            ("Open Exports", "Export options are clear and download if available."),
        ],
    },
    {
        "title": "15. Help/support/messages",
        "goal": "Users should not feel stuck.",
        "steps": [
            ("Open Help/Support", "Page loads and copy feels human."),
            ("Create support/help note if available", "Support request saves or gives clear next step."),
            ("Open Messages if available", "Messages/inbox loads without owner-only confusion."),
            ("Use support from Owner Health Check", "Support note appears or Command refreshes."),
        ],
    },
    {
        "title": "16. Mobile/tablet pass",
        "goal": "Tradies use phones. This must feel good.",
        "steps": [
            ("Open site on phone/tablet", "No horizontal overflow or broken layout."),
            ("Use bottom nav", "Buttons are tappable and active state is clear."),
            ("Open More menu", "More menu scrolls and closes properly."),
            ("Open job/client/invoice modal", "Modal fits screen and scrolls."),
            ("Try worker timer buttons", "Buttons are not blocked by bottom nav."),
            ("Try Command slip controls", "Approve/edit/park buttons are visible and tappable."),
        ],
    },
    {
        "title": "17. Public/customer links",
        "goal": "Customer-facing views should not expose owner tools.",
        "steps": [
            ("Open public quote/client portal link if available", "Page loads without owner nav."),
            ("Check customer copy", "Customer sees quote/invoice/proof info only."),
            ("Try approval/payment action if available", "Action is clear and safe."),
        ],
    },
    {
        "title": "18. Final trust check",
        "goal": "Make sure Churvox feels trustworthy.",
        "steps": [
            ("Look for washed-out/hidden text", "Text is readable without highlighting."),
            ("Look for demo/fake data on owner pages", "No fake numbers pretending to be real."),
            ("Check every dangerous action", "Delete/send/sync/payroll/accounting actions require clear owner intent."),
            ("Confirm promise", "The product feels like: Job done. Admin prepared. Owner approves."),
        ],
    },
]

txt_lines = []
txt_lines.append("Churvox Human End-to-End Test Pass")
txt_lines.append(f"Generated: {stamp}")
txt_lines.append("")
txt_lines.append("Use this to create every core thing in Churvox using safe E2E test data.")
txt_lines.append("Do not use real customers for this pass.")
txt_lines.append("")
txt_lines.append("Live app: https://www.churvox.com")
txt_lines.append("Test data files:")
for name in csv_files:
    txt_lines.append(f"- https://www.churvox.com/test-data/{name}")
txt_lines.append("")
txt_lines.append("Manual test sections:")
for section in sections:
    txt_lines.append("")
    txt_lines.append("=" * 80)
    txt_lines.append(section["title"])
    txt_lines.append(f"Goal: {section['goal']}")
    txt_lines.append("-" * 80)
    for index, (action, expected) in enumerate(section["steps"], 1):
        txt_lines.append(f"[ ] {index}. {action}")
        txt_lines.append(f"    Expected: {expected}")
txt_lines.append("")
txt_lines.append("=" * 80)
txt_lines.append("Final pass rule")
txt_lines.append("If any job, worker, proof, invoice, Command, mobile, pricing, or support flow feels confusing, fix that before heavy marketing.")
txt_lines.append("The launch promise is: Job done. Admin prepared. Owner approves.")
txt_lines.append("")

(deploy / "churvox-human-e2e-test-pass-20260627.txt").write_text("\n".join(txt_lines), encoding="utf-8")

section_html = []
total = 0
for s_idx, section in enumerate(sections):
    section_html.append(f"<section class='testSection'><header><span>{escape(section['title'])}</span><p>{escape(section['goal'])}</p></header><div class='steps'>")
    for step_idx, (action, expected) in enumerate(section["steps"]):
        total += 1
        key = f"s{s_idx}-step{step_idx}"
        section_html.append(
            "<label class='step' data-key='{key}' data-title='{title}' data-action='{action}' data-expected='{expected}'>"
            "<input type='checkbox' data-key='{key}' />"
            "<b>{num}. {action}</b>"
            "<small>Expected: {expected}</small>"
            "<textarea placeholder='Notes / issue found...'></textarea>"
            "</label>".format(
                key=escape(key),
                title=escape(section["title"]),
                num=step_idx + 1,
                action=escape(action),
                expected=escape(expected),
            )
        )
    section_html.append("</div></section>")

csv_links = "\n".join(
    f"<a href='/test-data/{escape(name)}' download>{escape(name)}</a>"
    for name in csv_files
)

html = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Churvox Human E2E Test Pass</title>
  <style>
    :root { color-scheme: light; --ink:#111827; --muted:#64748b; --orange:#f97316; --cream:#fff7ed; --line:rgba(15,23,42,.10); --green:#166534; --red:#991b1b; }
    * { box-sizing:border-box; }
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f6f1ea; color:var(--ink); }
    main { max-width:1180px; margin:0 auto; padding:22px; }
    .hero { padding:22px; border-radius:28px; background:#111827; color:white; box-shadow:0 22px 55px rgba(15,23,42,.22); }
    .hero span { display:inline-flex; padding:6px 10px; border-radius:999px; background:rgba(249,115,22,.22); color:#fed7aa; font-size:11px; font-weight:1000; letter-spacing:.08em; text-transform:uppercase; }
    .hero h1 { margin:10px 0 8px; font-size:clamp(28px,4vw,54px); line-height:.95; letter-spacing:-.06em; }
    .hero p { max-width:850px; margin:0; color:#fed7aa; font-weight:850; line-height:1.45; }
    .barWrap { position:sticky; top:0; z-index:20; margin:14px 0; padding:12px; border-radius:20px; background:rgba(255,255,255,.92); border:1px solid var(--line); backdrop-filter: blur(14px); box-shadow:0 12px 30px rgba(15,23,42,.10); }
    .barTop { display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
    .score { font-weight:1000; font-size:18px; }
    .progress { height:12px; border-radius:999px; background:#fed7aa; overflow:hidden; margin-top:10px; }
    .progress span { display:block; height:100%; width:0%; background:var(--orange); transition:width .2s ease; }
    .actions { display:flex; gap:8px; flex-wrap:wrap; }
    button, .linkButton { min-height:38px; border:0; border-radius:999px; padding:0 13px; font-weight:1000; cursor:pointer; background:var(--orange); color:#111827; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
    button.secondary, .linkButton.secondary { background:#111827; color:white; }
    button.light { background:#fff; border:1px solid var(--line); color:#111827; }
    .csvBox { margin:14px 0; padding:14px; border-radius:20px; background:white; border:1px solid var(--line); }
    .csvBox b { display:block; margin-bottom:8px; }
    .csvLinks { display:flex; gap:8px; flex-wrap:wrap; }
    .csvLinks a { display:inline-flex; padding:8px 10px; border-radius:999px; background:#fff7ed; color:#9a3412; font-size:12px; font-weight:1000; text-decoration:none; border:1px solid rgba(249,115,22,.18); }
    .testSection { margin:14px 0; padding:14px; border-radius:24px; background:white; border:1px solid var(--line); box-shadow:0 12px 28px rgba(15,23,42,.08); }
    .testSection header { display:flex; gap:10px; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:10px; }
    .testSection header span { font-size:18px; font-weight:1000; letter-spacing:-.03em; }
    .testSection header p { margin:0; color:var(--muted); font-size:13px; font-weight:850; text-align:right; max-width:520px; }
    .steps { display:grid; gap:8px; }
    .step { display:grid; grid-template-columns:auto 1fr; gap:4px 10px; padding:12px; border-radius:17px; background:#f8fafc; border:1px solid rgba(15,23,42,.06); }
    .step input { width:18px; height:18px; margin-top:2px; accent-color:var(--orange); }
    .step b { font-size:14px; line-height:1.25; }
    .step small { grid-column:2; color:var(--muted); font-size:12px; font-weight:850; }
    .step textarea { grid-column:2; width:100%; min-height:42px; border:1px solid rgba(15,23,42,.10); border-radius:12px; padding:9px; resize:vertical; font:inherit; font-size:12px; }
    .step.done { background:#ecfdf5; border-color:rgba(22,101,52,.18); }
    .step.done b, .step.done small { color:var(--green); }
    .reportBox { margin-top:14px; padding:14px; border-radius:20px; background:#111827; color:white; display:none; }
    .reportBox.show { display:block; }
    .reportBox textarea { width:100%; min-height:360px; border:0; border-radius:16px; padding:12px; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:12px; line-height:1.45; color:#111827; }
    .note { margin-top:8px; color:#fed7aa; font-size:12px; font-weight:900; }
    @media (max-width:720px) {
      main { padding:12px; }
      .hero { border-radius:22px; }
      .testSection header { display:grid; }
      .testSection header p { text-align:left; }
      .step { grid-template-columns:1fr; }
      .step input { order:-1; }
      .step small, .step textarea { grid-column:1; }
      .actions, button, .linkButton { width:100%; }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <span>Churvox full human test</span>
      <h1>Create everything. Test everything.</h1>
      <p>This pass walks through the whole product like a real owner: setup, clients, team, jobs, worker proof, quotes, invoices, Command approvals, money, imports, support, mobile, public links, and final trust checks. Use safe E2E test data only.</p>
    </section>

    <section class="barWrap">
      <div class="barTop">
        <div>
          <div class="score" id="score">0 / __TOTAL__ checked</div>
          <small id="verdict">Start with login, then move through the whole customer journey.</small>
        </div>
        <div class="actions">
          <a class="linkButton secondary" href="https://www.churvox.com/dashboard" target="_blank" rel="noreferrer">Open Churvox</a>
          <button type="button" class="light" id="copyReport">Copy report</button>
          <button type="button" class="light" id="toggleReport">Show report</button>
          <button type="button" class="secondary" id="reset">Reset</button>
        </div>
      </div>
      <div class="progress"><span id="progress"></span></div>
    </section>

    <section class="csvBox">
      <b>Safe CSV test data</b>
      <div class="csvLinks">
        __CSV_LINKS__
      </div>
    </section>

    __SECTIONS__

    <section class="reportBox" id="reportBox">
      <h2>Human test report</h2>
      <textarea id="report" readonly></textarea>
      <p class="note" id="copyNote"></p>
    </section>
  </main>

  <script>
    const KEY = "churvox:human-e2e-test-pass:20260627";
    const NOTE_KEY = "churvox:human-e2e-test-notes:20260627";
    const total = __TOTAL__;
    const boxes = Array.from(document.querySelectorAll("input[type='checkbox'][data-key]"));
    const steps = Array.from(document.querySelectorAll(".step"));
    const score = document.getElementById("score");
    const verdict = document.getElementById("verdict");
    const progress = document.getElementById("progress");
    const report = document.getElementById("report");
    const reportBox = document.getElementById("reportBox");
    const copyNote = document.getElementById("copyNote");

    function read(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
    }
    function write(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }

    let checked = read(KEY, {});
    let notes = read(NOTE_KEY, {});

    function stepReportLine(step) {
      const box = step.querySelector("input");
      const note = step.querySelector("textarea").value.trim();
      const mark = box.checked ? "x" : " ";
      const title = step.dataset.title || "";
      const action = step.dataset.action || "";
      const expected = step.dataset.expected || "";
      return `[${mark}] ${title} — ${action}\\n    Expected: ${expected}${note ? "\\n    Note: " + note : ""}`;
    }

    function buildReport() {
      const done = boxes.filter((box) => box.checked).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      const lines = [];
      lines.push("Churvox Human End-to-End Test Report");
      lines.push("Generated: " + new Date().toLocaleString());
      lines.push("Progress: " + done + "/" + total + " (" + pct + "%)");
      lines.push("");
      lines.push("Promise being tested: Job done. Admin prepared. Owner approves.");
      lines.push("");
      steps.forEach((step) => lines.push(stepReportLine(step)));
      lines.push("");
      if (pct >= 90) lines.push("Verdict: Strong. Ready for controlled outreach if no critical notes are open.");
      else if (pct >= 70) lines.push("Verdict: Close. Fix rough flows before bigger marketing.");
      else lines.push("Verdict: Keep testing. Too many flows are not confirmed yet.");
      return lines.join("\\n");
    }

    function update() {
      boxes.forEach((box) => {
        box.checked = Boolean(checked[box.dataset.key]);
        const step = box.closest(".step");
        if (step) step.classList.toggle("done", box.checked);
      });

      document.querySelectorAll(".step textarea").forEach((ta) => {
        const key = ta.closest(".step")?.dataset.key;
        if (key && notes[key] !== undefined && ta.value !== notes[key]) ta.value = notes[key];
      });

      const done = boxes.filter((box) => box.checked).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      score.textContent = done + " / " + total + " checked";
      progress.style.width = pct + "%";
      verdict.textContent = pct >= 90 ? "Strong pass. Check notes, then controlled outreach is realistic." : pct >= 70 ? "Close. Fix rough flows before pushing marketing harder." : "Keep going through the full site flow.";
      report.value = buildReport();
    }

    boxes.forEach((box) => {
      box.addEventListener("change", () => {
        checked[box.dataset.key] = box.checked;
        write(KEY, checked);
        update();
      });
    });

    document.querySelectorAll(".step textarea").forEach((ta) => {
      const key = ta.closest(".step")?.dataset.key;
      if (key && notes[key]) ta.value = notes[key];
      ta.addEventListener("input", () => {
        const step = ta.closest(".step");
        if (!step) return;
        notes[step.dataset.key] = ta.value;
        write(NOTE_KEY, notes);
        update();
      });
    });

    document.getElementById("reset").addEventListener("click", () => {
      if (!confirm("Reset all checked items and notes for this human test pass?")) return;
      checked = {};
      notes = {};
      write(KEY, checked);
      write(NOTE_KEY, notes);
      document.querySelectorAll(".step textarea").forEach((ta) => ta.value = "");
      update();
    });

    document.getElementById("toggleReport").addEventListener("click", () => {
      reportBox.classList.toggle("show");
      document.getElementById("toggleReport").textContent = reportBox.classList.contains("show") ? "Hide report" : "Show report";
      update();
    });

    document.getElementById("copyReport").addEventListener("click", async () => {
      update();
      try {
        await navigator.clipboard.writeText(report.value);
        copyNote.textContent = "Report copied.";
        reportBox.classList.add("show");
        document.getElementById("toggleReport").textContent = "Hide report";
      } catch {
        copyNote.textContent = "Clipboard blocked. Open the report and copy it manually.";
        reportBox.classList.add("show");
        document.getElementById("toggleReport").textContent = "Hide report";
      }
    });

    update();
  </script>
</body>
</html>
"""
html = html.replace("__TOTAL__", str(total)).replace("__CSV_LINKS__", csv_links).replace("__SECTIONS__", "\n".join(section_html))

(deploy / "churvox-human-e2e-test-pass-20260627.html").write_text(html, encoding="utf-8")

marker = f"""Churvox deploy marker:
- Full human E2E test pack created.
- Creates safe CSV test data.
- Provides clickable human checklist for the whole site.
- Covers setup, clients, team, jobs, worker proof, quotes, invoices, Command, money, imports, plans, support, mobile, public links, and final trust checks.
Generated: {stamp}
"""
(deploy / "churvox-human-e2e-test-marker-20260627.txt").write_text(marker, encoding="utf-8")

print("Created human E2E test pack.")
print(f"Sections: {len(sections)}")
print(f"Steps: {total}")
print("Files:")
print("- frontend/public/deploy-checks/churvox-human-e2e-test-pass-20260627.html")
print("- frontend/public/deploy-checks/churvox-human-e2e-test-pass-20260627.txt")
print("- frontend/public/deploy-checks/churvox-human-e2e-test-marker-20260627.txt")
for name in csv_files:
    print(f"- frontend/public/test-data/{name}")
