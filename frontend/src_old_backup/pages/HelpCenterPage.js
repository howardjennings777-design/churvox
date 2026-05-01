import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const articles = [
  ["Getting started", "Create your first client, job, quote, and invoice.", "/jobs"],
  ["Jobs", "Assign workers, track notes, photos, and time.", "/jobs"],
  ["Quotes and invoices", "Use public links and manual MYOB sync.", "/invoices"],
  ["Payroll", "Review and export only. No bank/tax submission.", "/timesheets"],
  ["Automation", "Approval-first templates and safe retry.", "/automation"],
  ["Troubleshooting", "If blank screen, hard refresh then contact support.", "/support"],
];

export default function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => articles.filter(([t, b]) => `${t} ${b}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <Layout><section className="cx-page space-y-4"><h1 className="text-3xl font-black text-slate-950">Help Centre</h1><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />{visible.map(([t, b, href]) => <article key={t} className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-lg font-black text-slate-950">{t}</h2><p className="mt-1 text-sm font-semibold text-slate-700">{b}</p><Link to={href} className="mt-2 inline-flex text-xs font-black text-blue-700">Open related page</Link></article>)}</section></Layout>;
}
