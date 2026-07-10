import React, { useMemo, useState } from "react";
import "./OfficeTeamCorePageIdentity.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import OfficeTeamWorkForms from "./OfficeTeamWorkForms";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const fallbackRows = [
  ["Draft", "Completed service invoice", "$185", "An extra-work amount needs an owner decision."],
  ["Sent", "Regular visit", "$89", "The invoice is waiting for payment."],
  ["Overdue", "Commercial clean", "$340", "A polite follow-up can be prepared."],
  ["Xero-ready", "End of week pack", "4 invoices", "Sync remains locked until owner approval."],
];

const filters = [
  ["all", "All"],
  ["draft", "Draft"],
  ["sent", "Sent"],
  ["overdue", "Overdue"],
  ["paid", "Paid"],
];

export default function OfficeTeamInvoicesWorkspace({ appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const live = useOfficeTeamRows("invoices", fallbackRows, { allowFallback, emptyMessage: "No live invoices found yet." });
  const [selected, setSelected] = useState(fallbackRows[0]);
  const [filter, setFilter] = useState("all");
  const rows = live.rows;
  const visibleRows = useMemo(() => rows.filter((row) => invoiceBucket(row) === filter || filter === "all"), [filter, rows]);
  const current = selectedRow(rows, selected, allowFallback ? fallbackRows : []);
  const total = rows.reduce((sum, row) => sum + parseMoney(row?.[2]), 0);
  const overdue = rows.filter((row) => invoiceBucket(row) === "overdue");
  const draft = rows.filter((row) => invoiceBucket(row) === "draft");

  return (
    <section className="cvSiteScreen cvInvoicesWorkspace">
      <header className="cvCorePageHero cvInvoicesHero">
        <div>
          <span>Invoice ledger</span>
          <h2>Know what is drafted, collectible and genuinely overdue.</h2>
          <p>Invoices are shown as a financial control surface, not a quote-style card grid. Churvox separates drafting, collection and accounting readiness so the owner can act without guessing.</p>
        </div>
        <div className="cvCoreHeroStats" aria-label="Invoice summary">
          <article><strong>{rows.length}</strong><small>Invoices loaded</small></article>
          <article><strong>{formatMoney(total)}</strong><small>Visible value</small></article>
          <article><strong>{overdue.length}</strong><small>Overdue checks</small></article>
        </div>
      </header>

      <div className="cvInvoiceAgingStrip" aria-label="Invoice status summary">
        <article><span>Draft</span><strong>{draft.length}</strong><small>Needs review before send</small></article>
        <article><span>Sent / due</span><strong>{rows.filter((row) => invoiceBucket(row) === "sent").length}</strong><small>Collectible but not overdue</small></article>
        <article className="attention"><span>Overdue</span><strong>{overdue.length}</strong><small>Follow-up only when truly due</small></article>
        <article><span>Paid</span><strong>{rows.filter((row) => invoiceBucket(row) === "paid").length}</strong><small>No reminder needed</small></article>
      </div>

      <div className="cvInvoiceControlBar">
        <div className="cvCoreFilterBar" aria-label="Invoice filters">
          {filters.map(([key, label]) => <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
        <small>{live.label}</small>
      </div>

      <div className="cvInvoiceLedgerLayout">
        <section className="cvInvoiceLedger" aria-label="Invoice ledger table">
          <header><span>Status</span><span>Invoice / client</span><span>Value</span><span>Latest detail</span></header>
          <div>
            {visibleRows.length ? visibleRows.map((row) => (
              <button key={rowKey(row)} type="button" className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
                <span><em className={invoiceBucket(row)}>{row[0]}</em></span>
                <strong>{row[1]}</strong>
                <b>{row[2]}</b>
                <small>{invoiceDetail(row, rows)}</small>
              </button>
            )) : <Empty title={rows.length ? "No invoices in this filter" : "No invoices yet"} text={rows.length ? "Choose another ledger filter." : ownerRoute ? "Create or import the first invoice draft below." : "Live invoices will appear here."} />}
          </div>
        </section>

        <aside className="cvInvoiceCollectionDesk">
          {rows.length ? (
            <>
              <div className="cvInvoiceSelectedTop"><span>Selected invoice</span><em className={invoiceBucket(current)}>{current[0]}</em></div>
              <h3>{current[1]}</h3>
              <strong className="cvInvoiceSelectedValue">{current[2] || "Value not found"}</strong>
              <p>{invoiceDetail(current, rows)}</p>
              <dl>
                <div><dt>Collection state</dt><dd>{collectionState(current)}</dd></div>
                <div><dt>Reminder rule</dt><dd>{reminderRule(current)}</dd></div>
                <div><dt>Accounting</dt><dd>No sync without a separate owner action</dd></div>
              </dl>
              <section className="cvInvoiceSafetyNote">
                <span>Financial guard</span>
                <p>A draft is not collectible. A sent invoice is not automatically overdue. Paid, void or future-due records must never produce a reminder.</p>
              </section>
              <OfficeTeamSafeControls area="invoices" record={current} primary="Prepare invoice draft" secondary="Prepare payment follow-up" command="Prepare accounting review" />
            </>
          ) : <Empty title="No invoice selected" text="The collection desk will open when a real invoice exists." />}
        </aside>
      </div>

      <section className="cvCoreWorkingDock cvInvoiceIntakeDock">
        <div><span>Invoice preparation</span><h3>Build the draft from real work</h3><p>Create or import invoice information. Sending, payment links, paid marking and accounting sync remain separate owner-controlled actions.</p></div>
        <OfficeTeamWorkForms area="invoices" title="Invoices" selectedRecord={current} />
      </section>
    </section>
  );
}

function invoiceBucket(row) {
  const status = String(row?.[0] || "").toLowerCase();
  if (/paid|settled|payment received|closed/.test(status) && !/unpaid/.test(status)) return "paid";
  if (/overdue|late|past due/.test(status)) return "overdue";
  if (/sent|issued|viewed|due|xero-ready/.test(status)) return "sent";
  return "draft";
}

function invoiceDetail(row, rows = []) {
  const detail = String(row?.[3] || "").trim();
  const title = String(row?.[1] || "This invoice").trim();
  const normalized = detail.toLowerCase().replace(/\s+/g, " ");
  const duplicateCount = detail
    ? rows.filter((candidate) => String(candidate?.[3] || "").trim().toLowerCase().replace(/\s+/g, " ") === normalized).length
    : 0;

  if (/invoice created from churvox launch audit/i.test(detail)) {
    return `${title} · Review this imported invoice record.`;
  }
  if (detail && duplicateCount < 2) return detail;
  if (detail) return `${title} · ${detail}`;
  return `${title} · ${collectionState(row)}`;
}

function collectionState(row) {
  const bucket = invoiceBucket(row);
  if (bucket === "paid") return "Closed — no collection action";
  if (bucket === "overdue") return "Check due date and balance before follow-up";
  if (bucket === "sent") return "Waiting within the collection process";
  return "Internal draft — not yet collectible";
}

function reminderRule(row) {
  const bucket = invoiceBucket(row);
  if (bucket === "overdue") return "Prepare only after confirming it is sent, due and unpaid";
  if (bucket === "paid") return "Never prepare another reminder";
  return "No overdue reminder from this state";
}

function parseMoney(value) {
  const raw = String(value || "").trim();
  if (!raw || (!raw.includes("$") && !/^-?\d[\d,.]*$/.test(raw))) return 0;
  const number = Number(raw.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return value ? `$${Math.round(value).toLocaleString()}` : "$0";
}

function Empty({ title, text }) {
  return <article className="cvSiteEmpty"><strong>{title}</strong><p>{text}</p></article>;
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
