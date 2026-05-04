import React from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";

export default function ContactPage() {
  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
        <section className="mx-auto max-w-5xl rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
          <div className="mb-6 max-w-xs">
            <ChurvoxLogo size="hero" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300">Support</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Contact Churvox</h1>
          <p className="mt-4 max-w-2xl text-lg font-semibold text-slate-300">
            Need help with your account, plan, setup, billing, or the Command Hub? Use the options below.
          </p>
        </section>

        <section className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Email</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Support inbox</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">For billing, setup, account, and product help.</p>
            <a className="mt-5 inline-flex rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white" href="mailto:hello@churvox.com?subject=Churvox%20support%20request">Email hello@churvox.com</a>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Account</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Plans & billing</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">Change plans, check trial status, and manage plan access.</p>
            <a className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white" href="/plans">Open Plans</a>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Setup</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Business settings</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">Update business details, integrations, and app settings.</p>
            <a className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white" href="/settings">Open Settings</a>
          </article>
        </section>

        <section className="mx-auto mt-6 max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Useful links</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-800" href="/dashboard">Command Hub</a>
            <a className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-800" href="/privacy">Privacy</a>
            <a className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-800" href="/terms">Terms</a>
            <a className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-800" href="/account-deletion">Account deletion</a>
          </div>
        </section>
      </main>
    </Layout>
  );
}
