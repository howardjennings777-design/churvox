import React from "react";
import { Link } from "react-router-dom";
import WorkerSafeSettingsPage from "./worker/WorkerSafeSettingsPage";

function SetupCard({ title, copy }) {
  return <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><h2 className="text-xl font-black tracking-[-.04em] text-slate-950">{title}</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">{copy}</p></section>;
}

export function OnboardingCommandPage() {
  return <main className="min-h-screen bg-[#f7f3ea] p-4 text-slate-950 md:p-8 xl:pl-[320px]" data-marker="CHURVOX_SAFE_COMMAND_REST_JS_20260608"><section className="mx-auto max-w-5xl space-y-5"><article className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,.08)]"><div className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-amber-800">Setup Command</div><h1 className="mt-4 text-4xl font-black tracking-[-.07em] md:text-6xl">Get Churvox ready for real work.</h1><p className="mt-4 max-w-3xl text-base font-bold leading-7 text-slate-600">Set the business, add the first client, create the first job, invite the team and prepare the first invoice.</p><div className="mt-6 flex flex-wrap gap-3"><Link to="/settings-board" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline">Business settings</Link><Link to="/clients/new?first_setup=1" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">Add first client</Link><Link to="/dashboard" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">Command Board</Link></div></article><section className="grid gap-4 md:grid-cols-2"><SetupCard title="1. Business profile" copy="Add business name, trade type, GST, address and invoice details." /><SetupCard title="2. First client" copy="Create the first customer record and site details." /><SetupCard title="3. First job" copy="Create a real job and assign the correct worker." /><SetupCard title="4. First invoice or quote" copy="Review the admin Churvox prepared before sending anything." /></section></section></main>;
}

export function WorkerCommandPage() {
  return <WorkerSafeSettingsPage />;
}
