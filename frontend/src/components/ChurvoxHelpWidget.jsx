import React from "react";
import { useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "./ChurvoxHelpWidget.css";

const HELP_TYPES = [
  "Setup help",
  "Something is broken",
  "Jobs or dispatch",
  "Invoices or quotes",
  "Team or worker app",
  "Billing or plan",
  "Before I sign up",
];

function shouldShow() {
  return true;
}

function saveLocalTicket(ticket) {
  try {
    const key = "churvox_support_tickets";
    const current = JSON.parse(localStorage.getItem(key) || "[]");
    current.unshift(ticket);
    localStorage.setItem(key, JSON.stringify(current.slice(0, 50)));
  } catch (err) {
    // Local backup is best effort only.
  }
}

export default function ChurvoxHelpWidget() {
  const { pathname } = useLocation();
  const { post } = useApi();
  const [open, setOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [type, setType] = React.useState(HELP_TYPES[0]);
  const [message, setMessage] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  if (!shouldShow(pathname)) return null;

  const submit = async (event) => {
    event.preventDefault();
    const cleanMessage = message.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    if (!cleanMessage) {
      toast.error("Add a short message first");
      return;
    }
    if (!cleanEmail && !cleanPhone) {
      toast.error("Add an email or phone so we can reply");
      return;
    }

    const ticket = {
      help_type: type,
      type,
      message: cleanMessage,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      page: pathname,
      page_url: typeof window !== "undefined" ? window.location.href : pathname,
      created_at: new Date().toISOString(),
      source: "churvox_help_widget_public",
    };

    setSending(true);
    const res = await post("/support/contact", ticket, { timeout: 12000 });
    setSending(false);

    saveLocalTicket({ ...ticket, server_saved: Boolean(res?.success) });

    if (res?.success) {
      toast.success("Message sent. We’ll help you get sorted.");
    } else {
      const subject = encodeURIComponent(`Churvox help: ${type}`);
      const body = encodeURIComponent(`Name: ${ticket.name || "Not supplied"}\nEmail: ${ticket.email || "Not supplied"}\nPhone: ${ticket.phone || "Not supplied"}\nPage: ${ticket.page_url || pathname}\n\n${cleanMessage}`);
      window.location.href = `mailto:hello@churvox.com?subject=${subject}&body=${body}`;
      toast.success("Opened email as backup. Please send it from your email app.");
    }

    setMessage("");
    setName("");
    setEmail("");
    setPhone("");
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="cv-help-fab" onClick={() => setOpen(true)}>
        <span>Need help?</span>
        <b>Setup / Support</b>
      </button>

      {open ? (
        <div className="cv-help-overlay" role="dialog" aria-modal="true" aria-label="Churvox help">
          <section className="cv-help-panel">
            <header>
              <div>
                <p>Churvox Support</p>
                <h2>Stuck? Send a message and we’ll help you get moving.</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}>Close</button>
            </header>

            <form onSubmit={submit}>
              <label>
                What do you need help with?
                <select value={type} onChange={(event) => setType(event.target.value)}>
                  {HELP_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label>
                Message
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what page you’re on and what you need help with." />
              </label>

              <label>
                Name optional
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
              </label>

              <label>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="So we can reply" />
              </label>

              <label>
                Phone optional
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" />
              </label>

              <div className="cv-help-actions">
                <button type="submit" disabled={sending}>{sending ? "Sending…" : "Send help request"}</button>
                <Link to="/support" onClick={() => setOpen(false)}>Open help centre</Link>
              </div>
            </form>

            <div className="cv-help-strip">
              <span>Email backup: hello@churvox.com</span>
              <span>Visitors can message before logging in.</span>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
