import React from "react";
import FreshNewUserGuide from "./FreshNewUserGuide";

export default function FreshFirstRunWizard({ onNavigate }) {
  return (
    <section className="freshFirstRunPage">
      <header className="freshHero">
        <span>Start here</span>
        <h1>Set up Churvox with real data.</h1>
        <p>
          This guide gets a new owner from an empty account to their first useful workflow:
          business basics, first client, first job, first invoice, then one owner approval.
        </p>
      </header>

      <FreshNewUserGuide onNavigate={onNavigate} mode="full" />
    </section>
  );
}
