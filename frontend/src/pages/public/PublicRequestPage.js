import React from "react";
import { toast } from "sonner";
import "./PublicRequestPage.css";

const API_BASE = (process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

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

function clean(value) {
  return String(value || "").trim();
}

function requestOwnerEmail() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return clean(params.get("owner") || params.get("owner_email") || "");
  } catch {
    return "";
  }
}

function apiUrl(path) {
  const base = API_BASE || window.location.origin;
  return `${base.replace(/\/$/, "")}/api/${String(path || "").replace(/^\/+/, "")}`;
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
      if (file.size > 2.5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Use photos under 2.5MB.`);
        continue;
      }

      converted.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data_url: await fileToDataUrl(file),
      });
    }

    setPhotos((current) => [...current, ...converted].slice(0, 3));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      if (!clean(form.customer_name)) throw new Error("Please add your name.");
      if (!clean(form.customer_phone) && !clean(form.customer_email)) throw new Error("Please add a phone or email.");
      if (!clean(form.service_needed)) throw new Error("Please tell us what work you need.");

      const payload = {
        ...form,
        owner_email: ownerEmail,
        photos,
        source: "Public request form",
        page_url: window.location.href,
      };

      const res = await fetch(apiUrl("/public/customer-request"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.error || "Could not send request.");

      setSent(true);
      toast.success("Request sent.");
    } catch (err) {
      toast.error(err?.message || "Could not send request.");
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <main className="crqShell">
        <section className="crqDone">
          <span>Request sent</span>
          <h1>Thanks — your request is with the business.</h1>
          <p>The owner will review it before creating a quote or job. Nothing is booked automatically.</p>
          <button type="button" onClick={() => { setSent(false); setForm(initialForm); setPhotos([]); }}>Send another request</button>
        </section>
      </main>
    );
  }

  return (
    <main className="crqShell">
      <form className="crqCard" onSubmit={submit}>
        <header>
          <span>Request work</span>
          <h1>Tell us what you need done.</h1>
          <p>This creates a request for the owner to review. It does not automatically book a job or send a quote.</p>
        </header>

        <div className="crqGrid">
          <label>
            <span>Name</span>
            <input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} placeholder="Your name" />
          </label>

          <label>
            <span>Phone</span>
            <input value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} placeholder="Phone number" inputMode="tel" />
          </label>

          <label>
            <span>Email</span>
            <input value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} placeholder="Email address" type="email" />
          </label>

          <label>
            <span>Address</span>
            <input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Job address" />
          </label>

          <label className="wide">
            <span>Work needed</span>
            <input value={form.service_needed} onChange={(e) => update("service_needed", e.target.value)} placeholder="Lawn mowing, garden tidy, cleaning, repairs..." />
          </label>

          <label>
            <span>Preferred day</span>
            <input value={form.preferred_day} onChange={(e) => update("preferred_day", e.target.value)} placeholder="Any day, Friday, next week..." />
          </label>

          <label>
            <span>Urgency</span>
            <select value={form.urgency} onChange={(e) => update("urgency", e.target.value)}>
              <option>Normal</option>
              <option>Soon</option>
              <option>Urgent</option>
              <option>Quote first</option>
            </select>
          </label>

          <label className="wide">
            <span>More detail</span>
            <textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us access details, size, photos needed, or anything important." />
          </label>

          <label className="wide crqPhotoInput">
            <span>Photos</span>
            <input type="file" accept="image/*" multiple onChange={addPhotos} />
            <small>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} attached` : "Optional — add up to 3 photos."}</small>
          </label>
        </div>

        <section className="crqSafety">
          <b>Owner reviews first</b>
          <span>Your request goes to the business owner. They decide whether to quote, book, or ask for more info.</span>
        </section>

        <button className="crqSubmit" type="submit" disabled={saving}>{saving ? "Sending..." : "Send request"}</button>
      </form>
    </main>
  );
}
