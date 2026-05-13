import { useState } from "react";
import "./PublicDemoPage.css";

export default function PublicDemoPage() {
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", help: "" });

  function update(key, value) { setForm((s) => ({ ...s, [key]: value })); }

  function submit(event) {
    event.preventDefault();
    const lines = [
      `Name: ${form.name}`,
      `Business: ${form.business}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone}`,
      "",
      "Help needed:",
      form.help,
    ];
    const href = `mailto:hello@churvox.com?subject=${encodeURIComponent("Churvox demo request")}&body=${encodeURIComponent(lines.join("\n"))}`;
    window.location.href = href;
  }

  return (
    <main className="public-demo-page">
      <section className="demo-copy">
        <a href="/" className="demo-brand"><img src="/brand/churvox-holo-c.svg" alt="" />CHURVOX</a>
        <p>BOOK A LIVE WALKTHROUGH</p>
        <h1>We help you launch calm operations fast.</h1>
        <ul>
          <li>Jobs and dispatch setup</li><li>Workers, photos and proof workflows</li><li>Invoices and Proof-to-Paid flow</li>
          <li>MYOB-ready workflow and payroll handoff</li><li>AI approval workflows for owners</li>
        </ul>
      </section>
      <form className="demo-form" onSubmit={submit}>
        <label>Name<input required value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
        <label>Business<input required value={form.business} onChange={(e) => update("business", e.target.value)} /></label>
        <label>Email<input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
        <label>Phone<input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></label>
        <label>What do you need help with?<textarea required value={form.help} onChange={(e) => update("help", e.target.value)} rows={5} /></label>
        <button type="submit">Send demo request</button>
      </form>
    </main>
  );
}
