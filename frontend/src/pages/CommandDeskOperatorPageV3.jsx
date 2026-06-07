import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const nzMoney = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });
const first = (...v) => v.find((x) => x !== undefined && x !== null && String(x).trim() !== "") || "";
const amount = (v) => Number(String(v || 0).replace(/[^0-9.-]/g, "")) || 0;
const oid = (v) => typeof v === "object" && v ? String(v.$oid || v.oid || v.id || v._id || "") : String(v || "").replace("[object Object]", "");
const itemId = (x) => oid(first(x?._id, x?.id, x?.job_id, x?.invoice_id, x?.quote_id, x?.client_id, x?.worker_id));
const status = (x) => String(first(x?.status, x?.job_status, x?.invoice_status, x?.quote_status, "")).toLowerCase();
const list = (res, keys = []) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  for (const k of [...keys, "jobs", "invoices", "quotes", "clients", "customers", "workers", "team", "users", "data", "items"]) {
    if (Array.isArray(d?.[k])) return d[k];
  }
  return [];
};
const jobDone = (j) => status(j).includes("complete") || status(j).includes("done") || j?.completed || j?.completed_at;
const cancelled = (x) => status(x).includes("cancel");
const cash = (x) => amount(first(x?.total, x?.amount_due, x?.balance_due, x?.amount, x?.price, x?.fixed_price, x?.subtotal, x?.quote_total, x?.invoice_total, 0));
const client = (x) => first(x?.client_name, x?.customer_name, x?.client?.name, x?.name, "");
const jobTitle = (j) => first(j?.title, j?.job_title, j?.job_name, j?.service_type, j?.job_type, "Untitled job");
const invoiceTitle = (i) => first(i?.invoice_number, i?.number, i?.title, "Invoice");
const quoteTitle = (q) => first(q?.quote_number, q?.number, q?.title, "Quote");
const workerTitle = (w) => first(w?.name, w?.full_name, w?.display_name, w?.email, "Unnamed worker");
const fieldWorkers = (ws) => ws.filter((w) => /worker|field|manager/.test(String(first(w?.role, w?.account_type, "worker")).toLowerCase()));
const workerJobs = (w, jobs) => {
  const id = itemId(w);
  const name = workerTitle(w).toLowerCase();
  return jobs.filter((j) => !jobDone(j) && !cancelled(j) && (
    oid(first(j.assigned_worker_id, j.worker_id, j.assigned_to_id)) === id ||
    String(first(j.assigned_worker_name, j.worker_name, j.assigned_to_name, j.assigned_to)).toLowerCase() === name
  )).length;
};
const pickWorker = (job, workers, jobs) => [...fieldWorkers(workers)].sort((a, b) => workerJobs(a, jobs) - workerJobs(b, jobs))[0] || null;
const isOverdue = (i) => {
  const s = status(i);
  if (s.includes("paid") || cancelled(i)) return false;
  if (s.includes("overdue")) return true;
  const due = first(i?.due_date, i?.date_due, i?.payment_due);
  if (!due) return false;
  const d = new Date(due);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
};
const addNote = (oldNote, label, note) => `${oldNote ? `${oldNote}\n\n` : ""}${label} ${new Date().toLocaleDateString("en-NZ")}: ${note || "Reviewed by owner"}`.trim();

const BOXES = [
  ["approvals", "Approvals", "All AI-prepared work waiting for yes, change, or no.", "/dashboard"],
  ["crew", "Crew dispatch", "Worker assignments and schedule decisions.", "/dispatch-board"],
  ["money", "Money", "Draft invoices, overdue invoices, and follow-ups.", "/invoices-board"],
  ["jobs", "Jobs needing info", "Missing price, client, address, or schedule.", "/jobs-board"],
  ["quotes", "Quotes", "Follow-ups and accepted quotes ready to convert.", "/quotes-board"],
  ["clients", "Clients", "Client contact details and CSV import setup.", "/clients-board"],
  ["workers", "Worker updates", "Completion notes, photos, and proof review.", "/team-board"],
  ["payroll", "Payroll/time", "Timesheet and job-time checks.", "/payroll-board"],
  ["setup", "Setup blockers", "Things blocking Churvox from doing more admin.", "/settings-board"],
].map(([key, title, text, href]) => ({ key, title, text, href }));

const boxMap = Object.fromEntries(BOXES.map((b) => [b.key, b]));

const AREA_CONTEXT = {
  approvals: {
    badge: "Approval slip",
    empty: "Nothing needs owner approval right now. This slip stays inside Approvals and shows what Churvox checked.",
    checked: "AI-prepared work from crew, money, jobs, quotes, clients, workers, payroll and setup blockers.",
    detail: "Approvals is the yes, change, or no desk. It shows owner decisions without dragging you away from Command."
  },
  crew: {
    badge: "Crew slip",
    empty: "No crew dispatch decision is waiting right now.",
    checked: "Unassigned jobs, worker load, dispatch notes, and schedule decisions.",
    detail: "Crew Dispatch stays focused on who should do the work, why, and what the owner needs to approve."
  },
  money: {
    badge: "Money slip",
    empty: "No money decision is waiting right now.",
    checked: "Draft invoices, overdue invoices, invoice wording, amounts, and follow-up notes.",
    detail: "Money slips stay focused on cash flow: invoice drafts, payment follow-ups, and owner approval before anything is sent."
  },
  jobs: {
    badge: "Jobs slip",
    empty: "No job information blocker is waiting right now.",
    checked: "Missing job price, client, address, schedule, status, and invoice blockers.",
    detail: "Jobs slips stay focused on the missing job detail Churvox needs before admin can move forward."
  },
  quotes: {
    badge: "Quotes slip",
    empty: "No quote decision is waiting right now.",
    checked: "Sent quotes needing follow-up and accepted quotes ready to become jobs.",
    detail: "Quote slips stay focused on converting or following up quote work without losing the job context."
  },
  clients: {
    badge: "Clients slip",
    empty: "No client contact blocker is waiting right now.",
    checked: "Missing client phone, email, name, notes, and client setup records.",
    detail: "Client slips stay focused on contact details Churvox needs for reminders, invoices, quotes, and follow-ups."
  },
  workers: {
    badge: "Worker slip",
    empty: "No worker update is waiting right now.",
    checked: "Worker completion notes, photos, proof review, and field updates.",
    detail: "Worker slips stay focused on what came back from the field and what the owner needs to review."
  },
  payroll: {
    badge: "Payroll slip",
    empty: "No payroll or time check is waiting right now.",
    checked: "Timesheets, job time, pause time, completed work time, and payroll review blockers.",
    detail: "Payroll slips stay focused on time and pay checks only. They do not mix with normal job completion approvals."
  },
  setup: {
    badge: "Setup slip",
    empty: "No setup blocker is waiting right now.",
    checked: "Missing setup pieces that stop Churvox from preparing better admin work.",
    detail: "Setup slips stay focused on what needs to be added before Command can do more for the owner."
  }
};

const areaContext = (key) => AREA_CONTEXT[key] || {
  badge: "Command slip",
  empty: "Nothing needs owner approval right now.",
  checked: "This Command area has been checked.",
  detail: "This slip stays inside the box you opened."
};

const act = (x) => ({
  kind: "approval",
  href: boxMap[x.box]?.href || "/dashboard",
  fields: [],
  facts: [],
  ...x,
  id: `${x.type}-${first(x.form?.job_id, x.form?.invoice_id, x.form?.quote_id, x.form?.client_id, x.title)}`
});
const setup = (x) => ({
  kind: "setup",
  href: boxMap[x.box]?.href || "/settings-board",
  approveLabel: "Open area",
  declineLabel: "Ignore for now",
  fields: [],
  facts: [],
  ...x,
  id: `${x.type}-${x.box}`
});

function build(data) {
  const { jobs, invoices, quotes, clients, workers } = data;
  const out = [];
  const invoicedJobIds = new Set(invoices.map((i) => oid(first(i.job_id, i.linked_job_id, i.jobId))).filter(Boolean));

  jobs.filter((j) => !jobDone(j) && !cancelled(j) && !first(j.assigned_worker_id, j.worker_id, j.assigned_to, j.assigned_worker_name)).slice(0, 8).forEach((j) => {
    const w = pickWorker(j, workers, jobs);
    out.push(act({
      box: "crew",
      type: "assign_worker",
      title: `Assign ${w ? workerTitle(w) : "worker"} to ${jobTitle(j)}`,
      found: "This job has no worker assigned.",
      prepared: w ? `Churvox recommends ${workerTitle(w)}.` : "Churvox needs a worker selected first.",
      why: w ? `${workerTitle(w)} has ${workerJobs(w, jobs)} open job${workerJobs(w, jobs) === 1 ? "" : "s"}.` : "There is no safe worker recommendation yet.",
      approveLabel: "Approve assignment",
      declineLabel: "Decline assignment",
      ownerText: "Approving assigns this worker to the job. Change the worker first if needed.",
      form: {
        job_id: itemId(j),
        worker_id: w ? itemId(w) : "",
        worker_name: w ? workerTitle(w) : "",
        dispatch_note: first(j.dispatch_note, j.notes, "Ready to dispatch")
      },
      facts: [["Job", jobTitle(j)], ["Client", client(j) || "No client saved"], ["Address", first(j.address, j.site_address, j.location, "No address saved")]],
      fields: [["worker_name", "Worker"], ["worker_id", "Worker ID"], ["dispatch_note", "Dispatch note", "textarea"]]
    }));
  });

  jobs.filter((j) => jobDone(j) && !invoicedJobIds.has(itemId(j))).slice(0, 8).forEach((j) => {
    const price = cash(j);
    out.push(act({
      box: price ? "money" : "jobs",
      type: price ? "draft_invoice" : "missing_price",
      title: price ? `Draft invoice ready for ${jobTitle(j)}` : `Add price for ${jobTitle(j)}`,
      found: "Completed job has not been invoiced.",
      prepared: price ? `Churvox prepared a draft invoice for ${nzMoney.format(price)}.` : "Churvox found the blocker: price is missing.",
      why: "After price and wording are approved, Churvox can create the draft invoice.",
      approveLabel: price ? "Approve draft invoice" : "Save price + draft invoice",
      declineLabel: "Decline invoice draft",
      ownerText: "Approving creates a draft invoice only. It does not send it to the customer.",
      form: {
        job_id: itemId(j),
        client_id: oid(first(j.client_id, j.customer_id)),
        client_name: client(j),
        customer_email: first(j.customer_email, j.client_email, j.email),
        job_price: price || "",
        invoice_description: first(j.invoice_description, j.description, j.notes, `${jobTitle(j)} completed`)
      },
      facts: [["Job", jobTitle(j)], ["Client", client(j) || "No client saved"], ["Price", price ? nzMoney.format(price) : "Missing"]],
      fields: [["job_price", "Price"], ["invoice_description", "Invoice wording", "textarea"]]
    }));
  });

  invoices.filter((i) => status(i) === "draft" || isOverdue(i)).slice(0, 8).forEach((i) => {
    const late = isOverdue(i);
    out.push(act({
      box: "money",
      type: late ? "invoice_follow_up" : "approve_invoice",
      title: late ? `Follow up ${invoiceTitle(i)}` : `Approve ${invoiceTitle(i)}`,
      found: late ? "Invoice is overdue or past due." : "Draft invoice is waiting for review.",
      prepared: late ? "Churvox prepared a payment follow-up note." : "Churvox prepared the invoice approval step.",
      why: late ? "The customer may need a reminder, but owner approval comes first." : "Amount and wording should be checked before marking sent.",
      approveLabel: late ? "Approve follow-up" : "Approve invoice",
      declineLabel: late ? "Decline follow-up" : "Decline invoice",
      ownerText: late ? "Approving saves the follow-up note. It does not auto-send." : "Approving marks the invoice as sent. It does not charge the customer.",
      form: {
        invoice_id: itemId(i),
        amount: cash(i),
        due_date: first(i.due_date, i.date_due),
        invoice_message: late ? `Friendly reminder for ${client(i) || "the customer"} about ${invoiceTitle(i)}.` : first(i.message, i.notes, "Invoice reviewed and ready to send"),
        internal_note: first(i.internal_note, i.notes)
      },
      facts: [["Invoice", invoiceTitle(i)], ["Client", client(i) || "No client saved"], ["Amount", cash(i) ? nzMoney.format(cash(i)) : "Missing"]],
      fields: [["amount", "Amount"], ["due_date", "Due date"], ["invoice_message", late ? "Follow-up note" : "Invoice message", "textarea"]]
    }));
  });

  quotes.filter((q) => (status(q) === "sent" || status(q).includes("accept")) && !first(q.converted_job_id, q.job_id, q.linked_job_id)).slice(0, 8).forEach((q) => {
    const accepted = status(q).includes("accept");
    out.push(act({
      box: "quotes",
      type: accepted ? "convert_quote" : "quote_follow_up",
      title: accepted ? `Convert ${quoteTitle(q)} to job` : `Follow up ${quoteTitle(q)}`,
      found: accepted ? "Accepted quote has not become a job." : "Sent quote has not converted yet.",
      prepared: accepted ? "Churvox prepared the quote-to-job decision." : "Churvox prepared a customer follow-up message.",
      why: accepted ? "Accepted work should become a job so it does not get lost." : "Follow-up helps convert work without hunting through quotes.",
      approveLabel: accepted ? "Approve convert to job" : "Approve follow-up",
      declineLabel: accepted ? "Decline conversion" : "Decline follow-up",
      ownerText: accepted ? "Approving creates a job from this quote." : "Approving saves the follow-up note. It does not auto-send.",
      form: {
        quote_id: itemId(q),
        quote_value: cash(q),
        message: `Hi ${client(q) || "there"}, just checking whether you had any questions about your quote.`,
        scope: first(q.scope, q.description, q.job_description)
      },
      facts: [["Quote", quoteTitle(q)], ["Client", client(q) || "No client saved"], ["Value", cash(q) ? nzMoney.format(cash(q)) : "Missing"]],
      fields: [["quote_value", "Value"], ["message", "Message", "textarea"], ["scope", "Scope", "textarea"]]
    }));
  });

  clients.filter((c) => !first(c.phone, c.customer_phone, c.mobile, c.email, c.customer_email)).slice(0, 8).forEach((c) => out.push(act({
    box: "clients",
    type: "client_contact",
    title: `Fix contact for ${client(c) || "client"}`,
    found: "Client is missing phone or email.",
    prepared: "Churvox opened the contact fields needed for reminders and invoices.",
    why: "Without phone or email, reminders and invoice follow-ups cannot work properly.",
    approveLabel: "Approve client update",
    declineLabel: "Decline client fix",
    ownerText: "Approving saves the client contact update.",
    form: {
      client_id: itemId(c),
      client_name: client(c),
      customer_phone: first(c.phone, c.customer_phone, c.mobile),
      customer_email: first(c.email, c.customer_email),
      client_note: first(c.notes)
    },
    facts: [["Client", client(c) || "Unnamed client"], ["Phone", first(c.phone, c.customer_phone, c.mobile, "Missing")], ["Email", first(c.email, c.customer_email, "Missing")]],
    fields: [["client_name", "Client"], ["customer_phone", "Phone"], ["customer_email", "Email"], ["client_note", "Client note", "textarea"]]
  })));

  if (!clients.length) out.push(setup({
    box: "clients",
    type: "setup_clients",
    title: "Add or import clients",
    found: "No client records were found.",
    prepared: "Churvox cannot prepare client admin yet, so this is the next setup step.",
    why: "Clients are needed before reminders, invoices, quotes, and job follow-ups can be prepared.",
    approveLabel: "Open Clients",
    ownerText: "No record changes from this slip. Open Clients to add one manually or use CSV import.",
    form: { first_client_name: "", client_phone: "", client_email: "", setup_note: "Add or import clients so Churvox can prepare real admin work." },
    facts: [["Missing", "Client records"], ["Next step", "Add client or import CSV"], ["After that", "Churvox can prepare job, invoice and quote admin"]],
    fields: [["first_client_name", "First client name"], ["client_phone", "Phone"], ["client_email", "Email"], ["setup_note", "Setup note", "textarea"]]
  }));

  if (!workers.length) out.push(setup({
    box: "setup",
    type: "setup_workers",
    title: "Add first worker",
    found: "No worker records were found.",
    prepared: "Churvox cannot suggest crew assignments yet, so this is the next setup step.",
    why: "Crew dispatch needs worker records before AI can assign or recommend people.",
    approveLabel: "Open Team",
    ownerText: "No record changes from this slip. Open Team to add or invite workers.",
    href: "/team-board",
    form: { worker_name: "", worker_email: "", setup_note: "Add workers so Churvox can suggest job assignments." },
    facts: [["Missing", "Worker records"], ["Next step", "Add worker"], ["After that", "Crew dispatch can recommend workers"]],
    fields: [["worker_name", "Worker name"], ["worker_email", "Worker email"], ["setup_note", "Setup note", "textarea"]]
  }));

  if (!jobs.length) out.push(setup({
    box: "jobs",
    type: "setup_jobs",
    title: "Create first job",
    found: "No job records were found.",
    prepared: "Churvox cannot prepare job admin yet, so this is the next setup step.",
    why: "Jobs drive dispatch, invoices, worker updates, and payroll time.",
    approveLabel: "Create Job",
    ownerText: "No record changes from this slip. Open the job form to create the first job.",
    href: "/jobs/new",
    form: { job_title: "", client_name: "", setup_note: "Create a job so Command can start preparing admin." },
    facts: [["Missing", "Job records"], ["Next step", "Create a job"], ["After that", "Churvox can prepare invoices and dispatch"]],
    fields: [["job_title", "Job title"], ["client_name", "Client"], ["setup_note", "Setup note", "textarea"]]
  }));

  return out;
}

function validation(a, f) {
  if (!a || a.kind === "setup") return "";
  if (a.type === "assign_worker" && !first(f.worker_id, f.worker_name)) return "Pick or enter a worker first.";
  if (["draft_invoice", "missing_price"].includes(a.type) && amount(f.job_price) <= 0) return "Add the job price first.";
  if (a.type === "approve_invoice" && amount(f.amount) <= 0) return "Check the invoice amount first.";
  if (a.type === "invoice_follow_up" && !first(f.invoice_message)) return "Add the follow-up note first.";
  if (a.type === "quote_follow_up" && !first(f.message)) return "Add the quote follow-up message first.";
  if (a.type === "client_contact" && !first(f.customer_phone, f.customer_email)) return "Add phone or email first.";
  return "";
}

function Field({ spec, form, setForm }) {
  const [key, label, type] = spec;
  return (
    <label className={type === "textarea" ? "cxField cxWide" : "cxField"}>
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea value={form[key] || ""} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} />
      ) : (
        <input value={form[key] || ""} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} />
      )}
    </label>
  );
}

function Badge({ tone = "dark", children }) {
  return <span className={`cxBadge ${tone}`}>{children}</span>;
}

function Metric({ label, value, text }) {
  return <article className="cxMetric"><b>{label}</b><strong>{value}</strong><span>{text}</span></article>;
}

function Box({ box, actions, open }) {
  const item = actions[0];
  const ctx = areaContext(box.key);
  return (
    <button type="button" className="cxBox" onClick={() => open(box.key, item || null)}>
      <i />
      <div><b>{box.title}</b><strong>{actions.length}</strong></div>
      <p>{box.text}</p>
      <em>{item ? item.title : `${ctx.badge}: all clear right now.`}</em>
      <small>Open {box.title} slip</small>
    </button>
  );
}

function EmptySlip({ box, close }) {
  const ctx = areaContext(box.key);
  return (
    <section className="cxSlip" data-area={box.key}>
      <header>
        <div>
          <div className="cxContextLine"><Badge tone="green">All clear</Badge><span>Command / {box.title}</span></div>
          <h1>{box.title}</h1>
          <p>{ctx.empty}</p>
        </div>
        <button onClick={close}>Close</button>
      </header>
      <main className="cxEmpty">
        <section className="cxPanel">
          <h2>{box.title} is clear.</h2>
          <p className="cxAreaNote">{ctx.detail}</p>
          <div className="cxFacts">
            <div><b>This slip checks</b><span>{ctx.checked}</span></div>
            <div><b>AI prepared</b><span>No owner approval needed in {box.title} right now.</span></div>
            <div><b>Next</b><span>Stay here, open the {box.title} area, or go back to Command.</span></div>
          </div>
        </section>
        <aside className="cxControls">
          <h2>{box.title} controls</h2>
          <p>This slip stays in the {box.title} context. Nothing else has been opened or changed.</p>
          <Link to={box.href} onClick={close}>Open {box.title} area</Link>
          <button className="dark" onClick={close}>Back to Command</button>
        </aside>
      </main>
    </section>
  );
}

function DecisionSlip({ box, action, close, approve, decline, save, busy }) {
  const [form, setForm] = React.useState(action.form || {});
  React.useEffect(() => setForm(action.form || {}), [action]);

  const missing = validation(action, form);
  const setupMode = action.kind === "setup";
  const ctx = areaContext(box.key);
  const workBox = boxMap[action.box] || box;
  const sameArea = workBox.key === box.key;

  return (
    <section className="cxSlip" data-area={box.key}>
      <header>
        <div>
          <div className="cxContextLine">
            <Badge tone={setupMode ? "amber" : missing ? "red" : "green"}>{setupMode ? "Setup needed" : missing ? "Needs fix" : "Ready"}</Badge>
            <span>Command / {box.title}</span>
          </div>
          <h1>{action.title}</h1>
          <p>{setupMode ? `This setup slip stays inside ${box.title}. ${box.text}` : `This approval slip stays inside ${box.title}. ${box.text}`}</p>
        </div>
        <button onClick={close}>Close</button>
      </header>
      <main className="cxSlipGrid">
        <section className="cxLeft">
          <article className="cxPanel">
            <div className="cxRow">
              <Badge>{box.title} slip</Badge>
              {!sameArea ? <Badge tone="amber">Work area: {workBox.title}</Badge> : null}
              <Badge tone={setupMode ? "amber" : missing ? "red" : "green"}>{setupMode ? "Open setup" : missing || "Ready to approve"}</Badge>
            </div>
            <h2>{box.title}</h2>
            <p className="cxAreaNote">{ctx.detail}</p>
            <div className="cxFacts">
              <div><b>This slip checks</b><span>{ctx.checked}</span></div>
              {!sameArea ? <div><b>Record area</b><span>{workBox.title} — {workBox.text}</span></div> : null}
              <div><b>AI found</b><span>{action.found}</span></div>
              <div><b>AI prepared</b><span>{action.prepared}</span></div>
              <div><b>Why</b><span>{action.why}</span></div>
              {(action.facts || []).map(([k, v]) => <div key={`${k}-${String(v)}`}><b>{k}</b><span>{v || "Not saved"}</span></div>)}
            </div>
          </article>
          <article className="cxPanel">
            <h2>Editable details</h2>
            <p className="cxHelp">Only the fields needed for this {box.title} slip.</p>
            <div className="cxFields">
              {(action.fields || []).map((field) => <Field key={field[0]} spec={field} form={form} setForm={setForm} />)}
            </div>
          </article>
        </section>
        <aside className="cxControls">
          <h2>{setupMode ? `${box.title} setup` : `${box.title} controls`}</h2>
          <p>{action.ownerText}</p>
          {!setupMode && (missing ? <div className="cxWarn">{missing}</div> : <div className="cxOk">Ready for owner approval.</div>)}
          {!setupMode ? <button className="save" onClick={() => save(action, form)} disabled={busy}>Save edit</button> : null}
          {setupMode ? (
            <Link className="approve" to={action.href || workBox.href} onClick={close}>{action.approveLabel || `Open ${workBox.title}`}</Link>
          ) : (
            <button className="approve" onClick={() => approve(action, form)} disabled={busy || Boolean(missing)}>{busy ? "Approving..." : action.approveLabel}</button>
          )}
          <button className="decline" onClick={() => decline(action)} disabled={busy}>{action.declineLabel || (setupMode ? "Ignore for now" : "Decline")}</button>
          <Link to={action.href || workBox.href} onClick={close}>Open {workBox.title}</Link>
          <button className="dark" onClick={close}>Back to Command</button>
        </aside>
      </main>
    </section>
  );
}

function Slip({ open, actions, close, approve, decline, save, busy }) {
  if (!open) return null;
  const box = boxMap[open.box] || boxMap.approvals;
  const action = open.action || actions.find((x) => open.box === "approvals" ? x.kind === "approval" : x.box === open.box);
  return (
    <div className="cxOverlay" data-area={box.key}>
      {action ? <DecisionSlip box={box} action={action} close={close} approve={approve} decline={decline} save={save} busy={busy} /> : <EmptySlip box={box} close={close} />}
    </div>
  );
}

function Style() {
  return <style>{`
    .cxRoot,.cxRoot *{box-sizing:border-box}
    .cxRoot{position:fixed;inset:0;z-index:2147483000;overflow-y:auto;background:radial-gradient(circle at 8% 0%,rgba(249,115,22,.10),transparent 28%),#f6f1e7;color:#0f172a;font-family:Inter,system-ui,sans-serif}
    .cxWrap{max-width:1380px;margin:0 auto;padding:24px 28px 120px}
    .cxHeroGrid{display:grid;grid-template-columns:minmax(0,1fr)360px;gap:20px}
    .cxHero,.cxRight,.cxMetric,.cxBox{background:#0b1018;color:#fff;border:1px solid rgba(255,255,255,.10);box-shadow:0 22px 62px rgba(2,6,23,.24)}
    .cxHero{border-radius:34px;padding:34px}
    .cxPill{display:inline-flex;border-radius:999px;padding:8px 14px;background:rgba(251,146,60,.14);border:1px solid rgba(251,191,36,.28);color:#fbbf24;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.20em}
    .cxHero h1{margin:18px 0 12px;color:white;font-size:clamp(48px,6vw,86px);line-height:.88;letter-spacing:-.08em;font-weight:1000}
    .cxHero p,.cxRight p{color:#d1d5db;font-size:16px;font-weight:850;line-height:1.55}
    .cxHeroActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
    .cxBtn{border-radius:16px;border:0;padding:13px 18px;font-size:15px;font-weight:1000;text-decoration:none}
    .cxBtn.orange{background:#f59e0b;color:#111827}
    .cxBtn.dark{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:white}
    .cxRight{border-radius:34px;padding:24px}
    .cxRight h2{color:white;font-size:42px;line-height:.94;letter-spacing:-.06em;font-weight:1000;margin:14px 0}
    .cxMetrics,.cxBoxes{display:grid;gap:20px;margin-top:20px}
    .cxMetrics{grid-template-columns:repeat(4,minmax(0,1fr))}
    .cxBoxes{grid-template-columns:repeat(3,minmax(0,1fr))}
    .cxMetric{border-radius:28px;padding:20px}
    .cxMetric b{display:block;color:#fbbf24;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.18em}
    .cxMetric strong{display:block;color:white;font-size:42px;line-height:.9;margin:8px 0}
    .cxMetric span{color:#d1d5db;font-weight:850}
    .cxBox{position:relative;min-height:238px;overflow:hidden;border-radius:32px;padding:22px;text-align:left;display:grid;gap:12px;cursor:pointer}
    .cxBox i{position:absolute;left:0;top:0;bottom:0;width:8px;background:#f97316}
    .cxBox div{display:flex;justify-content:space-between;gap:12px}
    .cxBox b{color:white;font-size:28px;line-height:.96;letter-spacing:-.05em;font-weight:1000}
    .cxBox strong{background:rgba(255,255,255,.10);border-radius:999px;padding:6px 10px}
    .cxBox p{color:#d1d5db;font-weight:850;line-height:1.45;margin:0}
    .cxBox em{font-style:normal;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10);border-radius:18px;padding:13px;color:#f8fafc;font-weight:900;line-height:1.4}
    .cxBox small{justify-self:start;border-radius:15px;padding:10px 14px;background:#fbbf24;color:#111827;font-weight:1000}
    .cxOverlay{position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.88);backdrop-filter:blur(8px);display:flex;align-items:stretch;justify-content:center;padding:16px 22px 16px 286px;overflow:hidden}
    .cxSlip{width:min(1580px,calc(100vw - 322px));max-height:calc(100vh - 32px);display:grid;grid-template-rows:auto minmax(0,1fr);background:#f6f1e7;border-radius:34px;overflow:hidden;box-shadow:0 38px 120px rgba(2,6,23,.48)}
    .cxSlip header{background:linear-gradient(135deg,#121823,#090d14 62%,#17110d);border-left:8px solid #f97316;color:white;padding:24px 30px;display:flex;justify-content:space-between;gap:18px}
    .cxSlip header h1{margin:10px 0 6px;color:white;font-size:clamp(42px,4.6vw,76px);line-height:.88;letter-spacing:-.075em;font-weight:1000}
    .cxSlip header p{margin:0;color:#e5e7eb;font-weight:850;line-height:1.45}
    .cxSlip header button{height:max-content;background:white;color:#111827;border:0;border-radius:16px;padding:12px 18px;font-weight:1000}
    .cxContextLine{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .cxContextLine span{color:#fed7aa;font-size:12px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}
    .cxBadge{display:inline-flex;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase;background:#111827;color:white}
    .cxBadge.green{background:#dcfce7;color:#065f46}
    .cxBadge.red{background:#fee2e2;color:#991b1b}
    .cxBadge.amber{background:#fef3c7;color:#92400e}
    .cxSlipGrid,.cxEmpty{min-height:0;display:grid;grid-template-columns:minmax(0,1fr)340px;gap:16px;padding:16px;overflow:hidden;background:#f6f1e7}
    .cxLeft{min-height:0;overflow-y:auto;display:grid;grid-template-columns:minmax(330px,.9fr) minmax(430px,1.1fr);gap:14px;align-content:start}
    .cxPanel,.cxControls{background:#fffdf7;color:#111827;border:1px solid rgba(15,23,42,.13);border-radius:26px;padding:18px;box-shadow:0 14px 38px rgba(15,23,42,.10)}
    .cxRow{display:flex;gap:8px;flex-wrap:wrap}
    .cxPanel h2,.cxControls h2{color:#111827;font-size:34px;line-height:.95;letter-spacing:-.06em;font-weight:1000;margin:14px 0}
    .cxAreaNote,.cxHelp{color:#475569;font-weight:850;line-height:1.45;margin:0 0 14px}
    .cxFacts{display:grid;gap:10px}
    .cxFacts div{background:#f8f3ea;border:1px solid rgba(15,23,42,.11);border-radius:18px;padding:13px}
    .cxFacts b,.cxField span{display:block;color:#9a3412;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:1000;margin-bottom:6px}
    .cxFacts span,.cxControls p{display:block;color:#273447;font-size:15px;line-height:1.45;font-weight:850}
    .cxFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .cxField.cxWide{grid-column:1/-1}
    .cxField input,.cxField textarea{width:100%;background:#fff;color:#111827;-webkit-text-fill-color:#111827;border:1px solid rgba(15,23,42,.16);border-radius:16px;padding:12px 14px;font-size:15px;font-weight:900;outline:none;box-shadow:inset 0 1px 0 rgba(15,23,42,.04)}
    .cxField textarea{min-height:94px;resize:vertical}
    .cxControls{align-self:start;position:sticky;top:0;display:grid;gap:10px}
    .cxControls button,.cxControls a{display:block;width:100%;min-height:48px;border-radius:16px;border:0;padding:13px 15px;text-align:center;text-decoration:none;font-size:15px;font-weight:1000;cursor:pointer}
    .cxControls .save{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}
    .cxControls .approve{background:#22c55e;color:#052e16}
    .cxControls .approve:disabled{opacity:.55;cursor:not-allowed}
    .cxControls .decline{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
    .cxControls a:not(.approve){background:white;color:#111827;border:1px solid #e2e8f0}
    .cxControls .dark{background:#111827;color:white}
    .cxWarn,.cxOk{border-radius:16px;padding:12px 14px;font-weight:1000;line-height:1.45}
    .cxWarn{background:#fee2e2;color:#991b1b}
    .cxOk{background:#dcfce7;color:#065f46}
    .cxEmpty{grid-template-columns:minmax(0,1fr)320px}
    .cxEmpty .cxPanel{min-height:260px}
    @media(max-width:1200px){.cxWrap{padding:16px 16px 110px}.cxHeroGrid,.cxMetrics,.cxBoxes{grid-template-columns:1fr}.cxOverlay{padding:12px}.cxSlip{width:100%}.cxSlipGrid,.cxEmpty{grid-template-columns:1fr;overflow-y:auto}.cxLeft{grid-template-columns:1fr;overflow:visible}.cxControls{position:static}}
    @media(max-width:760px){.cxHero h1,.cxSlip header h1{font-size:38px}.cxFields{grid-template-columns:1fr}.cxField.cxWide{grid-column:auto}}
  `}</style>;
}

export default function CommandDeskOperatorPageV3() {
  const { get, post, patch } = useApi();
  const [data, setData] = React.useState({ jobs: [], invoices: [], quotes: [], clients: [], workers: [] });
  const [actions, setActions] = React.useState([]);
  const [hidden, setHidden] = React.useState([]);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const [jobs, invoices, quotes, clients, workers] = await Promise.allSettled([
        get("/jobs"),
        get("/invoices"),
        get("/quotes"),
        get("/clients"),
        get("/team/workers")
      ]);
      const next = {
        jobs: jobs.status === "fulfilled" ? list(jobs.value, ["jobs"]) : [],
        invoices: invoices.status === "fulfilled" ? list(invoices.value, ["invoices"]) : [],
        quotes: quotes.status === "fulfilled" ? list(quotes.value, ["quotes"]) : [],
        clients: clients.status === "fulfilled" ? list(clients.value, ["clients", "customers"]) : [],
        workers: workers.status === "fulfilled" ? list(workers.value, ["workers", "team", "users"]) : []
      };
      setData(next);
      setActions(build(next));
    } finally {
      setBusy(false);
    }
  }, [get]);

  React.useEffect(() => { refresh(); }, [refresh]);

  async function approve(action, form) {
    const err = validation(action, form);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      let res = { success: true };
      if (action.type === "assign_worker") res = await post(`/jobs/${encodeURIComponent(form.job_id)}/assign`, { worker_id: form.worker_id, worker_name: form.worker_name, dispatch_note: form.dispatch_note });
      if (["draft_invoice", "missing_price"].includes(action.type)) res = await post("/invoices", { job_id: form.job_id, client_id: form.client_id || undefined, customer_name: form.client_name, customer_email: form.customer_email || undefined, subtotal: amount(form.job_price), description: form.invoice_description });
      if (action.type === "approve_invoice") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { status: "sent", amount: amount(form.amount), due_date: form.due_date, notes: form.invoice_message });
      if (action.type === "invoice_follow_up") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { notes: addNote(form.internal_note, "Follow-up prepared", form.invoice_message) });
      if (action.type === "quote_follow_up") res = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { notes: addNote(form.internal_note, "Follow-up prepared", form.message) });
      if (action.type === "convert_quote") res = await post(`/quotes/${encodeURIComponent(form.quote_id)}/convert`, {});
      if (action.type === "client_contact") res = await patch(`/clients/${encodeURIComponent(form.client_id)}`, { name: form.client_name, phone: form.customer_phone, email: form.customer_email, notes: form.client_note });
      if (!res?.success) throw new Error(res?.error || "Approval failed");
      toast.success("Approved and applied");
      setOpen(null);
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  async function save(action, form) {
    if (action.kind === "setup") return toast.success("Saved in this setup slip. Open the area when ready.");
    try {
      let res = { success: true };
      if (form.job_id) res = await patch(`/jobs/${encodeURIComponent(form.job_id)}`, { ...form });
      if (form.invoice_id) res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { ...form });
      if (form.quote_id) res = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { ...form });
      if (form.client_id) res = await patch(`/clients/${encodeURIComponent(form.client_id)}`, { name: form.client_name, phone: form.customer_phone, email: form.customer_email, notes: form.client_note });
      if (!res?.success) throw new Error(res?.error || "Save failed");
      toast.success("Edits saved");
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Could not save edits");
    }
  }

  function decline(action) {
    setHidden((old) => Array.from(new Set([...old, action.id])));
    setOpen(null);
    toast.success(action.kind === "setup" ? "Ignored for now" : "Declined and removed from Command");
  }

  const live = actions.filter((a) => !hidden.includes(a.id));
  const approvals = live.filter((a) => a.kind === "approval");
  const next = approvals[0] || live[0] || null;
  const forBox = (key) => key === "approvals" ? approvals : live.filter((a) => a.box === key);

  return (
    <main className="cxRoot" data-marker="CHURVOX_CLEAN_COMMAND_REBUILD">
      <Style />
      <section className="cxWrap">
        <section className="cxHeroGrid">
          <article className="cxHero">
            <span className="cxPill">AI approval desk</span>
            <h1>Churvox did the admin. You approve.</h1>
            <p>Clean rebuild. One prepared thing per slip. Every slip stays inside the box you opened.</p>
            <div className="cxHeroActions">
              <button className="cxBtn orange" onClick={refresh} disabled={busy}>{busy ? "Checking..." : "Refresh AI work"}</button>
              {next ? <button className="cxBtn dark" onClick={() => setOpen({ box: next.box, action: next })}>Open next slip</button> : null}
              <Link className="cxBtn dark" to="/jobs/new">Add job</Link>
            </div>
          </article>
          <aside className="cxRight">
            <span className="cxPill">Right now</span>
            <h2>{approvals.length} approvals</h2>
            <p>{next ? `${next.title}. ${next.prepared}` : "No owner approval waiting. Command will still show setup blockers."}</p>
          </aside>
        </section>
        <section className="cxMetrics">
          <Metric label="Jobs" value={data.jobs.length} text="Jobs checked" />
          <Metric label="Invoices" value={data.invoices.length} text="Invoices checked" />
          <Metric label="Quotes" value={data.quotes.length} text="Quotes checked" />
          <Metric label="Slips" value={live.length} text="Prepared or setup" />
        </section>
        <section className="cxBoxes">
          {BOXES.map((box) => <Box key={box.key} box={box} actions={forBox(box.key)} open={(boxKey, action) => setOpen({ box: boxKey, action })} />)}
        </section>
      </section>
      <Slip open={open} actions={live} close={() => setOpen(null)} approve={approve} decline={decline} save={save} busy={busy} />
    </main>
  );
}
