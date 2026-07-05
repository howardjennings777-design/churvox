const PUBLIC_BUSINESS_PAGES = {
  "/contact": {
    title: "Contact Churvox",
    kicker: "Contact",
    heading: "Need help with Churvox? Talk to us.",
    intro: "Use this page for setup help, billing questions, product support, partnership questions or anything that needs a human reply.",
    body: `
      <section class="cvStaticGrid">
        <article><b>Email</b><span><a href="mailto:hello@churvox.com">hello@churvox.com</a></span><small>Best for support, billing, setup and partnership messages.</small></article>
        <article><b>Based in</b><span>New Zealand</span><small>Made for tradies and service businesses that need cleaner admin.</small></article>
        <article><b>Support topics</b><span>Setup, billing, jobs, workers, invoices, accounting sync and account help.</span></article>
      </section>
      <section class="cvStaticCard">
        <h2>Send a support email</h2>
        <form id="cvStaticContactForm" class="cvStaticForm">
          <label>Name <input name="name" autocomplete="name" placeholder="Your name" /></label>
          <label>Email <input name="email" type="email" autocomplete="email" placeholder="you@business.co.nz" /></label>
          <label>What do you need help with? <select name="type"><option>Setup help</option><option>Billing or plan</option><option>Something is broken</option><option>Before I sign up</option><option>Partnership or business question</option></select></label>
          <label>Message <textarea name="message" placeholder="Tell us what you need help with."></textarea></label>
          <button type="submit">Open email to Churvox</button>
        </form>
      </section>
    `,
  },
  "/support": {
    title: "Churvox Support",
    kicker: "Support",
    heading: "Get help setting up or running Churvox.",
    intro: "Support starts with a clear message. Tell us the page you are on, what you expected, and what happened.",
    body: `
      <section class="cvStaticGrid">
        <article><b>Setup help</b><span>Business details, plans, workers, clients, jobs, imports and first invoices.</span></article>
        <article><b>Account help</b><span>Login, password reset, billing, cancellation and account deletion questions.</span></article>
        <article><b>Product help</b><span>Jobs, Command, quotes, invoices, Xero/MYOB handoff and worker flow.</span></article>
      </section>
      <section class="cvStaticCard"><h2>Email support</h2><p>Send your message to <a href="mailto:hello@churvox.com">hello@churvox.com</a>. Include screenshots if that helps explain the issue.</p><p><a class="cvStaticButton" href="/contact">Open contact form</a></p></section>
    `,
  },
  "/about": {
    title: "About Churvox",
    kicker: "About",
    heading: "Churvox is made to take admin pressure off service businesses.",
    intro: "The product direction is simple: Churvox does the admin. You approve. Owners stay in control, workers stay simple, and important decisions go to Command.",
    body: `
      <section class="cvStaticGrid">
        <article><b>Who it is for</b><span>Tradies, lawn care, cleaning, landscaping, handyman, pest control, mobile teams and other service businesses.</span></article>
        <article><b>What it handles</b><span>Jobs, clients, workers, quotes, invoices, messages, worker notes, photos and safe accounting handoff.</span></article>
        <article><b>How it is different</b><span>Churvox is centred around owner approval. It prepares the work, but the owner approves the important steps.</span></article>
      </section>
      <section class="cvStaticCard"><h2>Plain business promise</h2><p>Less chasing. Less guessing. Cleaner records. Better handover. One place for the owner to approve what matters.</p></section>
    `,
  },
  "/security": {
    title: "Churvox Security and Trust",
    kicker: "Security and trust",
    heading: "Owner control, safer workflows and clear data rules.",
    intro: "Churvox handles important business records, so the public site needs to explain what is protected, who controls it, and what Churvox does not do automatically.",
    body: `
      <section class="cvStaticGrid">
        <article><b>Owner approval</b><span>Important actions stay owner-approved in Command. Churvox prepares admin, but it should not hide decisions.</span></article>
        <article><b>Worker access</b><span>Workers should only see the job information, messages, directions and finish flow they need to do the work.</span></article>
        <article><b>Payments</b><span>Stripe handles card data. Churvox does not store customer card numbers.</span></article>
        <article><b>Accounting guardrails</b><span>Draft sync only where available. No automatic invoice sending, no tax filing and no bank payout files.</span></article>
        <article><b>Data providers</b><span>Churvox may use trusted providers for hosting, database, email, payments and accounting connections.</span></article>
        <article><b>Support</b><span>Security or account concerns can be sent to hello@churvox.com.</span></article>
      </section>
      <section class="cvStaticCard"><h2>Trust checklist</h2><ul><li>Secure login required for business data.</li><li>Business records are kept within the business workspace.</li><li>Billing and card processing are handled by Stripe.</li><li>Email notifications may be sent through an email provider.</li><li>Connected accounting actions stay owner-controlled.</li></ul></section>
    `,
  },
  "/trust": null,
  "/refunds-cancellations": {
    title: "Refunds and Cancellations",
    kicker: "Billing policy",
    heading: "Clear trial, cancellation and refund expectations.",
    intro: "This page gives customers a plain-English billing policy before they commit to Churvox.",
    body: `
      <section class="cvStaticGrid">
        <article><b>Trial</b><span>Churvox offers a 14-day trial path. Paid subscription terms are shown before activation.</span></article>
        <article><b>Cancellation</b><span>You can request cancellation from support or billing. Access normally continues until the end of the paid billing period.</span></article>
        <article><b>Refunds</b><span>Refunds are reviewed case by case, especially duplicate charges, clear billing mistakes or accidental renewals reported quickly.</span></article>
        <article><b>Taxes</b><span>Prices may show GST, VAT or other tax depending on your selected billing region.</span></article>
      </section>
      <section class="cvStaticCard"><h2>Need billing help?</h2><p>Email <a href="mailto:hello@churvox.com">hello@churvox.com</a> with the account email, business name and what happened.</p></section>
    `,
  },
  "/refund-policy": null,
  "/cancellation-policy": null,
};

PUBLIC_BUSINESS_PAGES["/trust"] = PUBLIC_BUSINESS_PAGES["/security"];
PUBLIC_BUSINESS_PAGES["/refund-policy"] = PUBLIC_BUSINESS_PAGES["/refunds-cancellations"];
PUBLIC_BUSINESS_PAGES["/cancellation-policy"] = PUBLIC_BUSINESS_PAGES["/refunds-cancellations"];

function cleanPath() {
  return String(window.location.pathname || "/").replace(/\/+$/, "") || "/";
}

function pageStyles() {
  return `
    <style>
      body{margin:0;background:#f7f3ea;color:#111827;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
      .cvStaticSite{min-height:100vh;background:radial-gradient(circle at top left,rgba(249,115,22,.16),transparent 32rem),#f7f3ea;color:#111827;}
      .cvStaticNav{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px clamp(18px,5vw,58px);border-bottom:1px solid rgba(15,23,42,.08);background:rgba(255,250,240,.86);backdrop-filter:blur(16px);position:sticky;top:0;z-index:5;}
      .cvStaticBrand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#111827;font-weight:1000;letter-spacing:-.04em;font-size:24px;}
      .cvStaticBrand i{display:grid;place-items:center;width:38px;height:38px;border-radius:14px;background:#111827;color:#fb923c;font-style:normal;box-shadow:0 12px 26px rgba(15,23,42,.18);}
      .cvStaticLinks{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:13px;font-weight:900;}
      .cvStaticLinks a{color:#334155;text-decoration:none;}
      .cvStaticLinks .primary{background:#111827;color:white;padding:10px 16px;border-radius:999px;}
      .cvStaticHero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.7fr);gap:28px;padding:clamp(38px,7vw,88px) clamp(18px,5vw,58px);align-items:start;}
      .cvStaticKicker{display:inline-flex;border-radius:999px;background:#ffedd5;color:#c2410c;padding:8px 12px;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.14em;}
      .cvStaticHero h1{font-size:clamp(42px,7vw,82px);line-height:.9;letter-spacing:-.08em;margin:16px 0 18px;max-width:950px;}
      .cvStaticHero p{font-size:clamp(17px,2vw,22px);line-height:1.55;color:#475569;font-weight:760;max-width:820px;}
      .cvStaticPanel,.cvStaticCard,.cvStaticGrid article{background:rgba(255,255,255,.88);border:1px solid rgba(15,23,42,.10);box-shadow:0 24px 60px rgba(15,23,42,.08);border-radius:28px;padding:24px;}
      .cvStaticPanel b{display:block;font-size:24px;letter-spacing:-.04em;margin-bottom:8px;}
      .cvStaticPanel span,.cvStaticGrid span,.cvStaticGrid small,.cvStaticCard p,.cvStaticCard li{display:block;color:#475569;font-weight:760;line-height:1.55;}
      .cvStaticMain{padding:0 clamp(18px,5vw,58px) 64px;display:grid;gap:24px;}
      .cvStaticGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
      .cvStaticGrid article b{display:block;font-size:20px;letter-spacing:-.04em;margin-bottom:8px;}
      .cvStaticCard h2{font-size:32px;letter-spacing:-.06em;margin:0 0 12px;}
      .cvStaticCard a{color:#ea580c;font-weight:1000;}
      .cvStaticForm{display:grid;gap:14px;max-width:720px;}
      .cvStaticForm label{display:grid;gap:6px;font-weight:900;color:#334155;}
      .cvStaticForm input,.cvStaticForm textarea,.cvStaticForm select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:16px;padding:13px 14px;font:inherit;font-weight:750;background:white;color:#111827;}
      .cvStaticForm textarea{min-height:130px;resize:vertical;}
      .cvStaticForm button,.cvStaticButton{border:0;background:#111827;color:white;text-decoration:none;border-radius:999px;padding:14px 20px;font-weight:1000;cursor:pointer;display:inline-flex;width:max-content;}
      .cvStaticFooter{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:28px clamp(18px,5vw,58px);border-top:1px solid rgba(15,23,42,.08);font-size:13px;font-weight:850;color:#64748b;}
      .cvStaticFooter a{color:#334155;text-decoration:none;margin-right:12px;}
      @media(max-width:900px){.cvStaticHero{grid-template-columns:1fr}.cvStaticGrid{grid-template-columns:1fr}.cvStaticLinks{justify-content:flex-end}.cvStaticNav{align-items:flex-start}.cvStaticHero h1{font-size:44px}}
    </style>`;
}

function layout(page) {
  return `
    ${pageStyles()}
    <main class="cvStaticSite">
      <nav class="cvStaticNav">
        <a class="cvStaticBrand" href="/"><i>C</i><span>Churvox</span></a>
        <div class="cvStaticLinks">
          <a href="/features">How it works</a>
          <a href="/pricing">Pricing</a>
          <a href="/about">About</a>
          <a href="/security">Security</a>
          <a href="/contact">Contact</a>
          <a class="primary" href="/signup">Start trial</a>
        </div>
      </nav>
      <section class="cvStaticHero">
        <div>
          <span class="cvStaticKicker">${page.kicker}</span>
          <h1>${page.heading}</h1>
          <p>${page.intro}</p>
        </div>
        <aside class="cvStaticPanel"><b>Churvox does the admin. You approve.</b><span>Owner approval stays clear, worker flow stays simple, and important business actions stay visible.</span></aside>
      </section>
      <section class="cvStaticMain">${page.body}</section>
      <footer class="cvStaticFooter">
        <span>© ${new Date().getFullYear()} Churvox. Made for service businesses.</span>
        <span><a href="/privacy-policy">Privacy</a><a href="/terms-of-service">Terms</a><a href="/refunds-cancellations">Refunds</a><a href="/contact">Contact</a></span>
      </footer>
    </main>`;
}

function setMeta(name, content) {
  try {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", name);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  } catch {}
}

function wireContactForm() {
  const form = document.getElementById("cvStaticContactForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = encodeURIComponent(`Churvox support: ${data.get("type") || "Website contact"}`);
    const body = encodeURIComponent(`Name: ${data.get("name") || ""}\nEmail: ${data.get("email") || ""}\nType: ${data.get("type") || ""}\nPage: ${window.location.href}\n\n${data.get("message") || ""}`);
    window.location.href = `mailto:hello@churvox.com?subject=${subject}&body=${body}`;
  });
}

function renderStaticBusinessPage() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const page = PUBLIC_BUSINESS_PAGES[cleanPath()];
  if (!page) return;
  const root = document.getElementById("root");
  if (!root) return;
  window.__CHURVOX_STATIC_PUBLIC_PAGE_RENDERED__ = true;
  document.title = `${page.title} — Churvox`;
  setMeta("description", `${page.heading} ${page.intro}`.slice(0, 250));
  root.innerHTML = layout(page);
  setTimeout(wireContactForm, 0);
}

renderStaticBusinessPage();