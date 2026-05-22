import React from "react";
import MarketingShell from "../../components/marketing/MarketingShell";

const plans=[['Start','$39 + GST'],['Crew','$89 + GST'],['Operator','$149 + GST'],['Command','$299 + GST']];
export default function PricingPage(){return <MarketingShell><main className="cm-page"><div className="cm-shell"><section className="cm-section"><p className="cm-kicker">Pricing</p><h1 className="cm-title">Choose how hard Churvox runs the office.</h1><p className="cm-sub">Operator is where Churvox starts preparing the admin before you touch it.</p></section><section className="cm-price-grid">{plans.map((p)=> <article key={p[0]} className={p[0]==='Operator'?'cm-price main':'cm-price'}><h2>{p[0]}</h2><p>{p[1]}</p>{p[0]==='Operator'&&<p>MYOB add-on $39</p>}{p[0]==='Command'&&<><p>MYOB included</p><p>Command Growth Pack $99</p></>}<p>SMS credits separate</p></article>)}</section></div></main></MarketingShell>}
