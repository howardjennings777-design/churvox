import React from "react";

export default function SMSPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          Coming soon
        </div>

        <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-6xl">
          SMS reminders are being finished properly.
        </h1>

        <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600">
          SMS buying and sending is disabled for launch until the provider, billing, delivery status,
          phone validation, and customer reminder flow are fully production-ready.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Safe launch</span>
            <h2 className="mt-3 text-xl font-black text-slate-950">No fake sending</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Customers will not see mocked SMS delivery or placeholder payment messaging.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Next</span>
            <h2 className="mt-3 text-xl font-black text-slate-950">Credit packs</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Credit buying will be enabled only when payment handling and balance updates are reliable.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">AI Operator</span>
            <h2 className="mt-3 text-xl font-black text-slate-950">Approval first</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              AI can still prepare customer reminder wording, but owners approve before anything sends.
            </p>
          </article>
        </div>

        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900">
          SMS is intentionally disabled for now. Use email, phone, or copied reminder text until the production SMS flow is finished.
        </div>
      </section>
    </main>
  );
}
