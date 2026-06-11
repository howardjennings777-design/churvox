import React from "react";
import FreshNewUserGuide from "./FreshNewUserGuide";

export default function FreshFirstRunWizard({ onNavigate }) {
  return (
    <section className="freshFirstRunPage">
      <FreshNewUserGuide onNavigate={onNavigate} mode="full" />
    </section>
  );
}
