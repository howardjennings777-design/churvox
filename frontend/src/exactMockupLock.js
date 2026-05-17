import "./exactMockupLock.css";

// PHASE_200_EXACT_CODED_MOCKUP_DESIGN
// One clean design controller. No old stacked dashboard patches.
(function churvoxExactMockupLock() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const OLD_IDS = [
      "churvox-phase-189-owner-priority",
      "churvox-phase-192-hero-priority",
      "churvox-phase-193-ai-admin-radar",
      "churvox-phase-195-status-strip",
      "churvox-phase-196-front-strip",
      "churvox-phase-196-inline-note",
      "churvox-final-front-cards",
      "churvox-final-hero-note",
      "churvox-phase-197-front-cards",
      "churvox-phase-197-hero-metrics",
      "churvox-phase-198-front-cards",
      "churvox-phase-198-hero-metrics",
      "churvox-phase-198-hero-note",
      "churvox-design-lock-hero-metrics",
      "churvox-design-lock-note",
      "churvox-design-lock-front-cards"
    ];

    function clean(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    function numberFrom(value) {
      const match = clean(value).match(/\b\d+\b/);
      return match ? Number(match[0]) : 0;
    }

    function removeOldClasses() {
      [
        "cx-foundry-reset",
        "cx-midnight-clay",
        "cx-premium-approval-final",
        "cx-mockup-final",
        "cx-exact-mockup-final",
        "cx-churvox-locked"
      ].forEach((cls) => {
        document.documentElement.classList.remove(cls);
        if (document.body) document.body.classList.remove(cls);
      });

      document.documentElement.classList.add("cx-exact-coded");
      if (document.body) document.body.classList.add("cx-exact-coded");
    }

    function removeOldElements() {
      OLD_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
    }

    function approvalCount() {
      const headerCount = document.querySelector(".om-approval-desk-main > header b");
      const fromHeader = numberFrom(headerCount && headerCount.textContent);
      if (fromHeader > 0) return fromHeader;

      const slips = Array.from(document.querySelectorAll(".om-approval-ticket, button, article, section"))
        .filter((el) => clean(el.textContent).toLowerCase().includes("open approval slip")).length;

      return slips || 0;
    }

    function invoiceCount() {
      return Array.from(document.querySelectorAll(".om-approval-ticket, button, article, section"))
        .filter((el) => {
          const text = clean(el.textContent).toLowerCase();
          return text.includes("invoice") && text.includes("open approval slip");
        }).length;
    }

    function crewCount() {
      try {
        const ctx = window.__CHURVOX_LIVE_AI_CONTEXT__ || {};
        const jobs = Array.isArray(ctx.jobs) ? ctx.jobs : [];
        const active = jobs.filter((job) => {
          const status = clean(job.status || job.job_status || job.workflow_status).toLowerCase();
          return status.includes("active") || status.includes("progress") || status.includes("started") || status.includes("assigned");
        }).length;
        if (active > 0) return active;
      } catch {
        // safe fallback
      }

      return Array.from(document.querySelectorAll(".om-approval-ticket, button, article, section"))
        .filter((el) => {
          const text = clean(el.textContent).toLowerCase();
          return (text.includes("worker") || text.includes("crew")) && text.includes("open approval slip");
        }).length;
    }

    function planName() {
      const planGauge = Array.from(document.querySelectorAll(".om-gauges article, article")).find((el) =>
        clean(el.textContent).toLowerCase().includes("plan")
      );
      const text = clean(planGauge && planGauge.textContent).replace(/^plan/i, "").trim();
      return text || "Command";
    }

    function hero() {
      return document.querySelector(".om-hero");
    }

    function findApprovalDesk() {
      return Array.from(document.querySelectorAll("section, article, div")).find((el) => {
        const text = clean(el.textContent).toLowerCase();
        return text.includes("approval desk") && text.includes("open approval slip");
      });
    }

    function setHeroCopy() {
      const h = hero();
      if (!h) return;

      const label = h.querySelector("span");
      if (label) label.textContent = "CHURVOX APPROVAL DESK";

      const h1 = h.querySelector("h1");
      if (h1) {
        h1.innerHTML = "Churvox prepares<br />the admin.<br />You approve the<br />next move.";
      }

      const p = h.querySelector("p");
      if (p) {
        p.textContent = "Jobs, proof, quotes, invoices, reminders and worker updates are handled in the background. You only see what needs your approval.";
      }
    }

    function installHeroMetrics() {
      const h = hero();
      if (!h) return;

      let metrics = document.getElementById("churvox-exact-hero-metrics");
      if (!metrics) {
        metrics = document.createElement("section");
        metrics.id = "churvox-exact-hero-metrics";
        h.appendChild(metrics);
      }

      metrics.innerHTML = `
        <article>
          <i>✓</i>
          <span>Plan</span>
          <strong>${planName()}</strong>
        </article>
        <article>
          <i>▤</i>
          <span>Input</span>
          <strong>0</strong>
        </article>
        <article>
          <i>⚙</i>
          <span>Processing</span>
          <strong>0</strong>
        </article>
        <article>
          <i>◇</i>
          <span>Approval</span>
          <strong>${approvalCount()}</strong>
        </article>
      `;
    }

    function installHeroPill() {
      const h = hero();
      if (!h) return;

      let pill = document.getElementById("churvox-exact-hero-pill");
      if (!pill) {
        pill = document.createElement("section");
        pill.id = "churvox-exact-hero-pill";
        h.appendChild(pill);
      }

      pill.innerHTML = `
        <b>✦</b>
        <strong>Simple approval flow</strong>
        <span>Jobs, proof, quotes, invoices, reminders and worker updates are handled automatically in the background.</span>
      `;
    }

    function installFrontCards() {
      const h = hero();
      if (!h) return;

      let cards = document.getElementById("churvox-exact-front-cards");
      if (!cards) {
        cards = document.createElement("section");
        cards.id = "churvox-exact-front-cards";
        h.insertAdjacentElement("afterend", cards);
      }

      cards.innerHTML = `
        <article>
          <i>✓</i>
          <div>
            <span>Ready for approval</span>
            <strong>${approvalCount()}</strong>
            <p>Owner-ready slips waiting for review.</p>
            <em></em>
          </div>
        </article>
        <article>
          <i>▧</i>
          <div>
            <span>Ready to invoice</span>
            <strong>${invoiceCount()}</strong>
            <p>Completed work ready for draft invoice prep.</p>
            <em></em>
          </div>
        </article>
        <article>
          <i>◌</i>
          <div>
            <span>Crew active today</span>
            <strong>${crewCount()}</strong>
            <p>Worker updates, notes and proof flowing in.</p>
            <em></em>
          </div>
        </article>
      `;
    }

    function markApprovalDesk() {
      const desk = findApprovalDesk();
      if (!desk) return;

      desk.classList.add("cx-exact-coded-approval-desk");
      if (desk.parentElement) desk.parentElement.classList.add("cx-exact-coded-desk-wrap");
    }

    function run() {
      removeOldClasses();
      removeOldElements();
      setHeroCopy();
      installHeroMetrics();
      installHeroPill();
      installFrontCards();
      markApprovalDesk();
    }

    let timer = null;
    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 80);
    }

    window.__CHURVOX_EXACT_CODED_DESIGN__ = "PHASE_200_EXACT_CODED_MOCKUP_DESIGN";

    window.addEventListener("load", schedule);
    document.addEventListener("click", schedule, true);

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    schedule();
  } catch {
    // keep app boot safe
  }
})();
