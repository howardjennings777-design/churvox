import React from "react";

export default function FreshAskChurvox() {
  return (
    <section className="freshAskPage tellChurvoxPage">
      <div className="freshAskHero tellHero">
        <div>
          <span>Tell Churvox</span>
          <h1>Type it. Churvox opens the right thing.</h1>
          <p>Use the command bar above to open areas or create work from normal words.</p>
        </div>
        <div className="freshAskStats">
          <div><b>Safe navigation</b><small>mode</small></div>
          <div><b>Command ready</b><small>ready</small></div>
          <div><b>Fast</b><small>shortcut</small></div>
          <div><b>Owner first</b><small>work</small></div>
        </div>
      </div>

      <section className="freshAskPanel tellGuideBox">
        <header>
          <span>Quick guide</span>
          <h2>How to use Tell Churvox</h2>
          <p>Write the task like you would say it to someone in the office. Churvox works out the right place to go and carries the useful details with it.</p>
        </header>
        <div className="tellGuideSteps">
          <div><b>Say the outcome</b><span>Start with what you want done, like add a job, add a client, open invoices, or check payments.</span></div>
          <div><b>Add the details you know</b><span>For jobs, include the client, address, time, price, worker, phone, email, and repeat pattern if you have them.</span></div>
          <div><b>Check before saving</b><span>Churvox can pre-fill the form, but you stay in control. Edit anything before you save.</span></div>
        </div>
        <div className="tellGuideExample">
          <b>Example</b>
          <span>Add a lawn mowing job for John Smith at 12 Main Road Lower Hutt tomorrow 3pm, phone 021 123 4567, $85, fortnightly, assign Mike.</span>
        </div>
      </section>
    </section>
  );
}
