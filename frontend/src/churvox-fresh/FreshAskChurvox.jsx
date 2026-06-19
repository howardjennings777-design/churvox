import React from "react";

const examples = ["open jobs", "add client", "new job for Bob tomorrow lawn mowing $65", "show unpaid invoices", "open Xero", "follow up unpaid invoices", "open payroll", "import clients", "export invoices"];

export default function FreshAskChurvox() {
  return (
    <section className="freshAskPage tellChurvoxPage">
      <div className="freshAskHero tellHero"><div><span>Tell Churvox</span><h1>Type it. Churvox opens the right thing.</h1><p>Use the sticky command bar above on any page. Safe commands open areas. Create commands open the right form. Important business work goes to Command for owner approval.</p></div><div className="freshAskStats"><div><b>Safe navigation</b><small>mode</small></div><div><b>Command ready</b><small>approval</small></div><div><b>Fast</b><small>shortcut</small></div><div><b>Owner first</b><small>important work</small></div></div></div>
      <div className="freshAskGrid tellGrid"><article className="freshAskPanel"><header><span>How it works</span><h2>One bar across Churvox</h2><p>The same "What do you want to do?" bar now stays at the top of every page.</p></header><div className="freshAskResult"><section><b>Open</b><p>Type "open jobs" and Churvox goes straight to Jobs.</p></section><section><b>Create</b><p>Type "add client" or "new job" and Churvox opens the right form.</p></section><section><b>Approve</b><p>Type "follow up unpaid invoices" and Churvox sends it to Command for owner approval.</p></section></div></article><article className="freshAskPanel"><header><span>Examples</span><h2>Use normal words</h2><p>This should feel like talking to an office person, not searching menus.</p></header><div className="freshAskExamples tellExamples">{examples.map((example) => <button type="button" key={example}>{example}</button>)}</div></article></div>
    </section>
  );
}
