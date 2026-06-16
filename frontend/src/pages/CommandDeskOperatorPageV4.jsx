import React from "react";

export default function CommandDeskOperatorPageV4() {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/dashboard#command");
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f3ea] p-6 text-slate-950">
      <section className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center">
        <div className="w-full rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="mb-3 inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-800">Owner Review</div>
          <h1 className="text-4xl font-black tracking-[-0.06em]">Opening the fresh Review screen…</h1>
          <p className="mt-3 text-sm font-bold text-slate-600">The old Command Board layout has been retired. Review now lives inside the main Churvox workspace.</p>
          <a className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline" href="/dashboard#command">Open Review</a>
        </div>
      </section>
    </main>
  );
}
