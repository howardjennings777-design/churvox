import React from "react";

export default function FreshPortal({ onNavigate }) {
  return (
    <section className="freshSmartPage">
      <header className="freshHero">
        <span>Portal</span>
        <h1>Customer portal</h1>
        <p>Portal area.</p>
      </header>
      <section className="freshCard">
        <h2>Open related areas</h2>
        <div className="freshActions">
          <button className="freshPrimary" type="button" onClick={() => onNavigate?.("customerportal")}>Open portal requests</button>
          <button className="freshGhost" type="button" onClick={() => onNavigate?.("clients")}>Open clients</button>
        </div>
      </section>
    </section>
  );
}
