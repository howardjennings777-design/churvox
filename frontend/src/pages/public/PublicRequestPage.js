import React from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import API_BASE from "../../lib/apiBase";
import { Nav, Footer } from "../marketing/ExecutiveHomePage";
import "../marketing/SimplePublic.css";
import "./PublicRequestPage.css";

const initialForm = {
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  address: "",
  service_needed: "",
  preferred_day: "",
  urgency: "Normal",
  message: "",
};

const requestSteps = [
  ["1", "Send the details", "Tell the business what you need, where it is, and when it suits."],
  ["2", "Owner reviews it", "The request waits for the owner to quote, reply, or schedule."],
  ["3", "Nothing moves by itself", "No quote is accepted and no job is booked automatically."],
];

const quickTips = ["Add photos if the job is hard to explain", "Include access notes, pets, gates or parking", "Use Quote first if you want a price before booking"];

function clean(value) {
  return String(value || "").trim();
}

function validEmail(value) {
  const email = clean(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function requestOwnerEmail() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return validEmail(params.get("owner") || params.get("owner_email") || "");
  } catch {
    return "";
  }
}

function apiUrl(path) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  return `${base}/api/${String(path || "").replace(/^\/+/, "")}`;
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PublicRequestPage() {
  const [form, setForm] = React.useState(initialForm);
  const [photos, setPhotos] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const ownerEmail = requestOwnerEmail();

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function addPhotos(event) {
    const files = Array.from(event.target.files || []).slice(0, 3);
    if (!files.length) return;

    const converted = [];
    for (const file of files) {
      if (!String(file.type || "").toLowerCase().startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > 2.5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Use photos under 2.5MB.`);
        continue;
      }

      converted.push({
        name: clean(file.name).slice(0, 160),
        type: clean(file.type).slice(0, 100),
        size: file.size,
        data_url: await fileToDataUrl(file),
      });
    }

    setPhotos((current) => [...current, ...converted].slice(0, 3));
    event.target.value = "";
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;

    try {
      if (!ownerEmail) throw new Error("This request link is not connected to a business. Ask the business to resend its Churvox request link.");
      if (!clean(form.customer_name)) throw new Error("Please add your name.");
      if (!clean(form.customer_phone) && !validEmail(form.customer_email)) throw new Error("Please add a valid phone or email.");
      if (!clean(form.service_needed)) throw new Error("Please tell us what work you need.");

      setSaving(true);
      const payload = {
        customer_name: clean(form.customer_name).slice(0, 200),
        customer_email: validEmail(form.customer_email),
        customer_phone: clean(form.customer_phone).slice(0, 100),
        address: clean(form.address).slice(0, 700),
        service_needed: clean(form.service_needed).slice(0, 1000),
        preferred_day: clean(form.preferred_day).slice(0, 300),
        urgency: clean(form.urgency).slice(0, 60),
        message: clean(form.message).slice(0, 4000),
        owner_email: ownerEmail,
        photos,
        source: "public_customer_request",
        page_path: `${window.location.pathname}${window.location.search}`.slice(0, 1500),
      };

      const res = await fetch(apiUrl("public/customer-request"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.error || data?.message || "Could not send request.");

      setSent(true);
      toast.success("Request sent to the business for review.");
    } catch (err) {
      toast.error(err?.message || "Could not send request.");
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <main className="publicSite crqShell crqPage cvCustomerRoom" data-version="CHURVOX_REQUEST_QUOTE_SENT_PAID_LAUNCH_20260712">
        <Nav />
        <section className="crqDone">
          <span>Request sent</span>
          <h1>Done — the business has your request.</h1>
          <p>The owner can review the details, then quote, reply, or schedule the work. Nothing was booked automatically.</p>
          <div className="crqDoneActions">
            <button type="button" onClick={() => { setSent(false); setForm(initialForm); setPhotos([]); }}>Send another request</button>
            <Link to="/">Back to Churvox</Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="publicSite crqShell crqPage cvCustomerRoom" data-version="CHURVOX_REQUEST_QUOTE_PAID_LAUNCH_20260712">
      <Nav />

      <section className="crqHero publicHeroCompact">
        <div className="crqHeroCopy">
          <span className="publicKicker">Request a quote</span>
          <h1>Send the job details properly.</h1>
          <p>Add the work, address, timing, photos and notes. Churvox turns it into a clear request for the business owner to review.</p>
          <div className="crqHeroChips">
            <span>Owner reviewed</span>
            <span>No auto booking</span>
            <span>Photos supported</span>
          </div>
        </div>

        <aside className="crqHeroPanel">
          <small>{ownerEmail ? "Connected request link" : "Business link required"}</small>
          <b>{ownerEmail ? "Tell them what, where and when." : "Ask the business to resend its link."}</b>
          <span>{ownerEmail ? "Photos, access notes and preferred timing help the business price or book the work without chasing details." : "This form only sends to a verified Churvox business when the business owner is included in the request link."}</span>
        </aside>
      </section>

      <section className="crqPageGrid">
        <form className="crqCard" onSubmit={submit}>
          <header>
            <span>Job details</span>
            <h2>What do you need done?</h2>
            <p>Keep it simple, but include anything the owner needs to quote, reply or schedule the job.</p>
          </header>

          {!ownerEmail ? <section className="crqSafety"><b>Request link incomplete</b><span>Ask the business for its Churvox request link. This prevents your details being saved without a verified business destination.</span></section> : null}

          <div className="crqGrid">
            <label><span>Name</span><input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} placeholder="Your name" autoComplete="name" /></label>
            <label><span>Phone</span><input value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} placeholder="Phone number" inputMode="tel" autoComplete="tel" /></label>
            <label><span>Email</span><input value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} placeholder="Email address" type="email" autoComplete="email" /></label>
            <label><span>Address</span><input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Where is the work?" autoComplete="street-address" /></label>
            <label className="wide"><span>Work needed</span><input value={form.service_needed} onChange={(e) => update("service_needed", e.target.value)} placeholder="Lawn mowing, garden tidy, cleaning, repairs..." /></label>
            <label><span>Preferred timing</span><input value={form.preferred_day} onChange={(e) => update("preferred_day", e.target.value)} placeholder="Friday, next week, mornings..." /></label>
            <label><span>Urgency</span><select value={form.urgency} onChange={(e) => update("urgency", e.target.value)}><option>Normal</option><option>Soon</option><option>Urgent</option><option>Quote first</option></select></label>
            <label className="wide"><span>Details</span><textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Access notes, size, problem areas, dogs on site, photos needed, or anything the owner should know." /></label>
            <label className="wide crqPhotoInput"><span>Photos</span><input type="file" accept="image/*" multiple onChange={addPhotos} /><small>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} attached` : "Optional — add up to 3 photos."}</small></label>
          </div>

          <section className="crqSafety"><b>Owner reviews it</b><span>The request is checked before the business quotes, replies or schedules the job.</span></section>
          <button className="crqSubmit" type="submit" disabled={saving || !ownerEmail}>{saving ? "Sending..." : ownerEmail ? "Send request" : "Business link required"}</button>
        </form>

        <aside className="crqSideRail">
          <section className="crqSideCard dark"><small>What happens next</small><h2>The owner gets a clean request.</h2><p>Churvox does not book the job by itself. It gives the business owner the details they need to make the next call.</p></section>
          <section className="crqSideCard steps">{requestSteps.map(([number, title, itemText]) => <article key={title}><i>{number}</i><div><b>{title}</b><span>{itemText}</span></div></article>)}</section>
          <section className="crqSideCard tips"><small>Quick tips</small><ul>{quickTips.map((tip) => <li key={tip}>{tip}</li>)}</ul></section>
        </aside>
      </section>

      <Footer />
    </main>
  );
}
