import React from "react";
import MarketingShell from "../../components/marketing/MarketingShell";

export default function FeaturesPage() {
  return <MarketingShell><main className="cm-marketing cm-page"><div className="cm-shell"><section className="cm-section"><p className="cm-kicker">Features</p><h1 className="cm-title">The office machine behind your trade business</h1></section><section className="cm-bands"><article className="cm-band"><h2>1. Capture work</h2><ul><li>Jobs</li><li>Clients</li><li>Quotes</li><li>Team</li><li>Worker App</li><li>Proof Photos</li></ul></article><article className="cm-band"><h2>2. Prepare admin</h2><ul><li>Invoices</li><li>Payroll</li><li>MYOB</li><li>SMS</li><li>AI Operator</li></ul></article><article className="cm-band"><h2>3. Approve and send</h2><p>Decision Slip:</p><ul><li>Reason: overdue quote follow-up</li><li>Source: Quote #Q-422</li><li>Prepared action: send drafted reminder</li><li>Owner decision: approve/edit/dismiss</li></ul></article></section></div></main></MarketingShell>;
}
