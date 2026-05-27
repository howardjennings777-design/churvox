// CHURVOX_ACTIVE_PRESET_JOB_RUNTIME_PATCH_20260528
// Safe additive patch: shows the active trade preset on /jobs/new without editing the existing job form.

function readPreset() {
  try {
    return JSON.parse(localStorage.getItem("churvox_active_trade_preset") || "null");
  } catch {
    return null;
  }
}

function copyText(text) {
  if (!text) return;
  try {
    navigator.clipboard.writeText(text);
  } catch {}
}

function addStyle() {
  if (document.getElementById("cv-active-preset-job-style")) return;
  const style = document.createElement("style");
  style.id = "cv-active-preset-job-style";
  style.textContent = `
    .cv-active-preset-job-panel{margin:16px;border-radius:26px;padding:18px;background:linear-gradient(135deg,#111827,#0f172a);color:#fffdf7;box-shadow:0 28px 90px rgba(17,24,39,.25);border:1px solid rgba(255,255,255,.14)}.cv-active-preset-job-panel p{margin:0 0 8px;color:#bef264;font-size:12px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.cv-active-preset-job-panel h3{margin:0;font-size:26px;letter-spacing:-.05em}.cv-active-preset-job-panel small{display:block;margin-top:8px;color:rgba(255,253,247,.72);font-weight:750;line-height:1.45}.cv-active-preset-job-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.cv-active-preset-job-tags span{border-radius:999px;padding:8px 10px;background:rgba(255,255,255,.10);color:#fffdf7;font-size:12px;font-weight:900}.cv-active-preset-job-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.cv-active-preset-job-actions button,.cv-active-preset-job-actions a{border:0;border-radius:999px;padding:11px 13px;background:#bef264;color:#365314;font-weight:950;text-decoration:none;cursor:pointer}.cv-active-preset-job-actions a{background:rgba(255,255,255,.12);color:#fffdf7}@media(max-width:760px){.cv-active-preset-job-actions{display:grid}.cv-active-preset-job-actions button,.cv-active-preset-job-actions a{width:100%;text-align:center}}`;
  document.head.appendChild(style);
}

function addPanel() {
  if (window.location.pathname !== "/jobs/new") return;
  if (document.querySelector(".cv-active-preset-job-panel")) return;
  const preset = readPreset();
  if (!preset) return;

  const target = document.querySelector("main") || document.querySelector(".min-h-screen") || document.body;
  const panel = document.createElement("section");
  panel.className = "cv-active-preset-job-panel";
  const tags = Array.isArray(preset.job_types) ? preset.job_types : [];
  panel.innerHTML = `
    <p>Active trade preset</p>
    <h3>${preset.name || "Trade preset"}</h3>
    <small>${preset.invoice_line || "Churvox will use this preset to guide job wording and invoice descriptions."}</small>
    <div class="cv-active-preset-job-tags">${tags.map((tag) => `<span>${String(tag).replace(/</g, "&lt;")}</span>`).join("")}</div>
    <div class="cv-active-preset-job-actions">
      <button type="button" data-cv-copy-invoice-line>Copy invoice wording</button>
      <a href="/trade-presets">Change preset</a>
    </div>
  `;
  const copyBtn = panel.querySelector("[data-cv-copy-invoice-line]");
  copyBtn?.addEventListener("click", () => copyText(preset.invoice_line || ""));
  target.prepend(panel);
}

function tick() {
  addStyle();
  addPanel();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", tick);
  window.addEventListener("load", tick);
  setInterval(tick, 1200);
  const observer = new MutationObserver(tick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
