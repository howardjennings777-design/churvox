from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        print(f"already patched: {label}")
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    file.write_text(text.replace(old, new, 1))
    print(f"patched: {label}")


jsx = "frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx"

replace_once(
    jsx,
    'const EMAIL_STORAGE_KEY = "churvox:billing-email";\n',
    'const EMAIL_STORAGE_KEY = "churvox:billing-email";\nconst GROWTH_PACK_CHECKOUT_MARKER = "churvox-growth-pack-checkout-20260713a";\n',
    "Growth Pack checkout deployment marker",
)

replace_once(
    jsx,
    '  const [billingError, setBillingError] = useState("");\n',
    '''  const [billingError, setBillingError] = useState("");
  const [packQuantity, setPackQuantity] = useState(1);
  const [growthPackBusy, setGrowthPackBusy] = useState(false);
  const [growthPackError, setGrowthPackError] = useState("");
  const [growthPackNotice, setGrowthPackNotice] = useState("");
  const [growthPackStatus, setGrowthPackStatus] = useState(() => ({ loading: true, currentPlan: readStoredPlan(), activePacks: 0 }));
''',
    "Growth Pack checkout state",
)

replace_once(
    jsx,
    '  const selectedPricing = priceParts(meta, plan.price);\n',
    '''  const selectedPricing = priceParts(meta, plan.price);
  const currentPlan = normalizePlanKey(growthPackStatus.currentPlan || readStoredPlan());
  const planKnown = Boolean(currentPlan);
  const commandActive = currentPlan === "command";
  const activePacks = Math.max(0, Number(growthPackStatus.activePacks || 0));
  const packAddsTeam = packQuantity * 50;
''',
    "Growth Pack current-plan facts",
)

replace_once(
    jsx,
    '  const countryOptions = useMemo(() => Object.entries(COUNTRIES), []);\n\n',
    '''  const countryOptions = useMemo(() => Object.entries(COUNTRIES), []);

  useEffect(() => {
    let cancelled = false;
    async function loadGrowthPackStatus() {
      const headers = { Accept: "application/json", ...tokenHeaders() };
      const [usageResult, addonResult] = await Promise.allSettled([
        fetch(apiUrl("/plan/usage"), { credentials: "include", headers }),
        fetch(apiUrl("/billing/addons"), { credentials: "include", headers }),
      ]);
      if (cancelled) return;
      let nextPlan = readStoredPlan();
      let nextPacks = 0;
      if (usageResult.status === "fulfilled") {
        const body = await usageResult.value.json().catch(() => ({}));
        if (usageResult.value.ok && body?.success !== false) nextPlan = normalizePlanKey(body?.plan || body?.current_plan || nextPlan);
      }
      if (addonResult.status === "fulfilled") {
        const body = await addonResult.value.json().catch(() => ({}));
        if (addonResult.value.ok && body?.success !== false) nextPacks = Number(body?.extra_user_blocks ?? body?.growth_packs ?? 0) || 0;
      }
      setGrowthPackStatus({ loading: false, currentPlan: nextPlan, activePacks: nextPacks });
    }
    loadGrowthPackStatus().catch(() => {
      if (!cancelled) setGrowthPackStatus((current) => ({ ...current, loading: false }));
    });
    return () => { cancelled = true; };
  }, []);

''',
    "Growth Pack status loader",
)

replace_once(
    jsx,
    '''    setBillingError(lastError?.message || "Secure billing could not open. No plan was changed and nothing was charged.");
    setBillingBusy(false);
  }

  return (
''',
    '''    setBillingError(lastError?.message || "Secure billing could not open. No plan was changed and nothing was charged.");
    setBillingBusy(false);
  }

  function chooseCommandForPacks() {
    setSelected("Command");
    setGrowthPackError("");
    setGrowthPackNotice("Growth Packs are only available with Command. Command is now selected—complete the Command checkout first, then return here to buy packs.");
    window.setTimeout(() => document.querySelector(".cvPlanBillingAction")?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
  }

  async function openGrowthPackCheckout() {
    if (growthPackBusy) return;
    if (planKnown && !commandActive) {
      chooseCommandForPacks();
      return;
    }
    setGrowthPackBusy(true);
    setGrowthPackError("");
    setGrowthPackNotice("");
    try {
      const response = await fetch(apiUrl("/billing/create-addon-checkout-session"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...tokenHeaders() },
        body: JSON.stringify({
          addon: "command_growth_pack",
          addon_key: "command_growth_pack",
          country,
          quantity: packQuantity,
          growth_packs: packQuantity,
          packs: packQuantity,
          source: "new_owner_plans_screen",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `Growth Pack checkout returned HTTP ${response.status}`);
      const checkoutUrl = body?.url || body?.checkout_url || body?.session_url || body?.data?.url;
      if (!checkoutUrl) throw new Error("Stripe did not return a Growth Pack checkout URL.");
      const secureUrl = new URL(checkoutUrl, window.location.origin);
      if (secureUrl.protocol !== "https:") throw new Error("Growth Pack checkout did not return a secure URL.");
      window.location.assign(secureUrl.toString());
    } catch (error) {
      const message = error?.message || "Growth Pack checkout could not open. Nothing was charged.";
      setGrowthPackError(message);
      if (/Command Growth Pack needs the Command plan|Command plan/i.test(message)) setGrowthPackNotice("Choose Command first, complete that plan checkout, then buy the Growth Pack here.");
      setGrowthPackBusy(false);
    }
  }

  return (
''',
    "Growth Pack checkout action",
)

replace_once(
    jsx,
    '''        <FeatureList title="Adds" items={growthPack.included} tone="included" />
        <FeatureList title="Locked rules" items={growthPack.locked} tone="locked" />
      </section>
''',
    '''        <FeatureList title="Adds" items={growthPack.included} tone="included" />
        <FeatureList title="Locked rules" items={growthPack.locked} tone="locked" />
        <aside className="cvGrowthPackBuy" data-growth-pack-checkout={GROWTH_PACK_CHECKOUT_MARKER}>
          <div>
            <span>Buy Growth Packs</span>
            <h4>{commandActive ? "Add more Command capacity now" : planKnown ? "Command plan required" : "Add more Command capacity"}</h4>
            <p>Each pack adds 50 active team members, 1,500 jobs per month and 1,000 AI actions. Active packs: <b>{growthPackStatus.loading ? "Checking…" : activePacks}</b>.</p>
          </div>
          <label>
            <span>Number of packs</span>
            <select value={packQuantity} onChange={(event) => setPackQuantity(Math.max(1, Number(event.target.value || 1)))} disabled={growthPackBusy}>
              {[1, 2, 3, 4, 5].map((quantity) => <option key={quantity} value={quantity}>{quantity} pack{quantity === 1 ? "" : "s"} · +{quantity * 50} team</option>)}
            </select>
          </label>
          <div className="cvGrowthPackBuyAction">
            <strong>{priceParts(meta, growthPack.price * packQuantity).ex}<small>/month ex {meta.taxName}</small></strong>
            <button type="button" onClick={openGrowthPackCheckout} disabled={growthPackBusy}>
              {growthPackBusy ? "Opening Stripe…" : planKnown && !commandActive ? "Select Command to buy packs" : `Buy ${packQuantity} Growth Pack${packQuantity === 1 ? "" : "s"}`}
            </button>
            <small>Adds {packAddsTeam} active team member spaces. Stripe opens before any charge.</small>
          </div>
          {growthPackNotice ? <p className="cvGrowthPackNotice" role="status">{growthPackNotice}</p> : null}
          {growthPackError ? <p className="cvGrowthPackError" role="alert">{growthPackError}</p> : null}
        </aside>
      </section>
''',
    "visible Growth Pack purchase block",
)

replace_once(
    jsx,
    '''function normalizeCountry(value) {
  const raw = String(value || "").trim().toUpperCase();
  const aliases = { NZ: "NZ", NZL: "NZ", "NEW ZEALAND": "NZ", AU: "AU", AUS: "AU", AUSTRALIA: "AU", US: "US", USA: "US", UK: "UK", GB: "UK", GBR: "UK" };
  return aliases[raw] || "NZ";
}

''',
    '''function normalizeCountry(value) {
  const raw = String(value || "").trim().toUpperCase();
  const aliases = { NZ: "NZ", NZL: "NZ", "NEW ZEALAND": "NZ", AU: "AU", AUS: "AU", AUSTRALIA: "AU", US: "US", USA: "US", UK: "UK", GB: "UK", GBR: "UK" };
  return aliases[raw] || "NZ";
}

function normalizePlanKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  return { solo: "start", start: "start", team: "crew", crew: "crew", pro: "operator", operator: "operator", enterprise: "command", command: "command" }[raw] || "";
}

function readStoredPlan() {
  try {
    const snapshot = JSON.parse(localStorage.getItem("churvox_auth_session_snapshot_v1") || "{}");
    const user = snapshot?.user || snapshot || {};
    const direct = user?.ui_plan || user?.current_plan || user?.plan || user?.subscription_plan || user?.billing_plan || user?.tier || localStorage.getItem("churvox:stable-current-plan:v1") || localStorage.getItem("churvox:selected-plan") || "";
    return normalizePlanKey(direct);
  } catch {
    return "";
  }
}

''',
    "Growth Pack plan normalization",
)

css_path = Path("frontend/src/churvox-office-lab/OfficeTeamPlansActions.css")
css = css_path.read_text()
addon_css = r'''

.cvGrowthPackBuy {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(190px, .42fr) minmax(250px, .58fr);
  gap: 14px;
  align-items: center;
  padding: 17px;
  border: 1px solid rgba(255,248,237,.18);
  border-radius: 22px;
  color: #fff8ed;
  background:
    radial-gradient(circle at 92% 0%, rgba(249,115,22,.38), transparent 34%),
    linear-gradient(135deg, #17120e, #33251c 58%, #7c2d12);
  box-shadow: 0 16px 38px rgba(23,18,14,.14);
}

.cvGrowthPackBuy > div:first-child,
.cvGrowthPackBuy label,
.cvGrowthPackBuyAction {
  min-width: 0;
}

.cvGrowthPackBuy > div:first-child > span,
.cvGrowthPackBuy label > span {
  display: block;
  color: #fed7aa;
  font-size: .65rem;
  font-weight: 1000;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.cvGrowthPackBuy h4 {
  margin: 6px 0;
  color: #fff8ed;
  font-size: 1.35rem;
  letter-spacing: -.04em;
}

.cvGrowthPackBuy p {
  margin: 0;
  color: rgba(255,248,237,.78);
  font-size: .82rem;
  font-weight: 780;
  line-height: 1.45;
}

.cvGrowthPackBuy label {
  display: grid;
  gap: 8px;
}

.cvGrowthPackBuy select {
  width: 100%;
  min-height: 48px;
  border: 1px solid rgba(255,248,237,.28);
  border-radius: 14px;
  padding: 0 12px;
  color: #17120e;
  background: #fff8ed;
  font: inherit;
  font-weight: 950;
}

.cvGrowthPackBuyAction {
  display: grid;
  gap: 8px;
}

.cvGrowthPackBuyAction > strong {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #fff8ed;
  font-size: 1.55rem;
  letter-spacing: -.045em;
}

.cvGrowthPackBuyAction > strong small,
.cvGrowthPackBuyAction > small {
  color: rgba(255,248,237,.7);
  font-size: .7rem;
  font-weight: 850;
  letter-spacing: 0;
}

.cvGrowthPackBuyAction button {
  min-height: 52px;
  border: 0;
  border-radius: 15px;
  padding: 0 17px;
  color: #17120e;
  background: linear-gradient(135deg, #fed7aa, #fb923c);
  font-weight: 1000;
  cursor: pointer;
}

.cvGrowthPackBuyAction button:disabled {
  cursor: wait;
  opacity: .7;
}

.cvGrowthPackNotice,
.cvGrowthPackError {
  grid-column: 1 / -1;
  padding: 10px 12px;
  border-radius: 13px;
}

.cvGrowthPackNotice {
  border: 1px solid rgba(251,191,36,.35);
  background: rgba(120,53,15,.42);
}

.cvGrowthPackError {
  border: 1px solid rgba(254,202,202,.35);
  background: rgba(127,29,29,.5);
}

@media (max-width: 900px) {
  .cvGrowthPackBuy {
    grid-template-columns: 1fr;
  }

  .cvGrowthPackBuyAction button {
    width: 100%;
  }
}
'''
if ".cvGrowthPackBuy {" not in css:
    css_path.write_text(css.rstrip() + addon_css)
    print("patched: Growth Pack checkout styling")
else:
    print("already patched: Growth Pack checkout styling")

contract = r'''#!/usr/bin/env node
const fs = require('fs');
const jsx = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx', 'utf8');
const css = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamPlansActions.css', 'utf8');
const checks = [
  ['Growth Pack purchase marker exists', jsx.includes('churvox-growth-pack-checkout-20260713a')],
  ['visible Buy Growth Packs block exists', jsx.includes('Buy Growth Packs') && jsx.includes('cvGrowthPackBuy')],
  ['Stripe add-on checkout is wired', jsx.includes('/billing/create-addon-checkout-session') && jsx.includes('command_growth_pack')],
  ['pack quantity is selectable', jsx.includes('packQuantity') && jsx.includes('[1, 2, 3, 4, 5]')],
  ['active pack count is displayed', jsx.includes('Active packs:') && jsx.includes('activePacks')],
  ['Command requirement is clear', jsx.includes('Select Command to buy packs') && jsx.includes('Growth Packs are only available with Command'))],
  ['checkout button has proper touch size', css.includes('.cvGrowthPackBuyAction button') && css.includes('min-height: 52px')],
  ['purchase block is responsive', css.includes('@media (max-width: 900px)') && css.includes('grid-template-columns: 1fr'))],
];
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}`);
  if (!pass) process.exitCode = 1;
}
'''
Path("scripts/churvox-growth-pack-checkout-contract.cjs").write_text(contract)
print("wrote: Growth Pack checkout contract")
