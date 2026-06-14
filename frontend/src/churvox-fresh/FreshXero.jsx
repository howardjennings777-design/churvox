import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshXero.css";

function unwrap(result) {
  return result?.data ?? result;
}

export default function FreshXero({ onNavigate }) {
  const { get, post } = useApi();
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function loadStatus() {
    setLoading(true);
    setMessage("");
    try {
      const data = unwrap(await get("/xero/status"));
      setStatus(data);
    } catch (err) {
      setMessage(err?.message || "Could not load Xero status.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadStatus();
  }, []);

  async function connectXero() {
    setBusy(true);
    setMessage("");
    try {
      const data = unwrap(await post("/xero/connect/start", {}));
      if (!data?.url) throw new Error("Xero did not return a connect URL.");
      window.location.href = data.url;
    } catch (err) {
      setMessage(err?.message || "Xero connection could not start.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectXero() {
    setBusy(true);
    setMessage("");
    try {
      await post("/xero/disconnect", {});
      await loadStatus();
      setMessage("Xero disconnected.");
    } catch (err) {
      setMessage(err?.message || "Could not disconnect Xero.");
    } finally {
      setBusy(false);
    }
  }

  const configured = Boolean(status?.configured);
  const connected = Boolean(status?.connected);
  const addonActive = Boolean(status?.addon_active);
  const connection = status?.connection || {};
  const settings = status?.settings || {};

  return (
    <section className="freshXeroPage">
      <div className="freshXeroHero">
        <div>
          <span>Xero connection</span>
          <h1>Connect Xero when the business is ready for approved accounting sync</h1>
          <p>
            Phase one connects the Xero organisation, stores the connection securely,
            and keeps sync settings owner-approved before invoice/payment syncing is used.
          </p>
        </div>

        <div className="freshXeroStats">
          <div><b>{loading ? "..." : configured ? "Yes" : "No"}</b><small>env ready</small></div>
          <div><b>{loading ? "..." : addonActive ? "Yes" : "No"}</b><small>add-on active</small></div>
          <div><b>{loading ? "..." : connected ? "Yes" : "No"}</b><small>connected</small></div>
          <div><b>{connection?.tenant_name || "—"}</b><small>organisation</small></div>
        </div>
      </div>

      {message && (
        <div className="freshXeroNotice need">
          <b>Xero notice</b>
          <span>{message}</span>
        </div>
      )}

      <div className={`freshXeroNotice ${connected ? "proper" : "need"}`}>
        <b>{connected ? "Xero connected" : "Xero not connected yet"}</b>
        <span>
          {connected
            ? `Connected to ${connection?.tenant_name || "a Xero organisation"}. Keep invoice sync owner-approved.`
            : "Connect is blocked until Render env vars are ready and the Xero add-on is active for this business."}
        </span>
      </div>

      <div className="freshXeroLayout">
        <aside className="freshXeroList">
          <header>
            <div>
              <b>Readiness checks</b>
              <span>Live backend status</span>
            </div>
            <button type="button" onClick={loadStatus} disabled={loading || busy}>Reload</button>
          </header>

          <button type="button" className={configured ? "active" : ""}>
            <b>Render credentials</b>
            <span>XERO_CLIENT_ID / SECRET / REDIRECT_URI</span>
            <small>{configured ? "Configured" : "Missing"}</small>
          </button>

          <button type="button" className={addonActive ? "active" : ""}>
            <b>Xero add-on</b>
            <span>Business must have Xero add-on active</span>
            <small>{addonActive ? "Active" : "Not active"}</small>
          </button>

          <button type="button" className={connected ? "active" : ""}>
            <b>Xero organisation</b>
            <span>{connection?.tenant_name || "No tenant connected"}</span>
            <small>{connected ? "Connected" : "Not connected"}</small>
          </button>
        </aside>

        <article className="freshXeroDetail">
          <div className="freshXeroHead">
            <div>
              <span>{connected ? "Connected" : "Setup required"}</span>
              <h2>{connected ? connection?.tenant_name || "Xero connected" : "Connect Xero"}</h2>
              <p>
                {connected
                  ? "Your Xero organisation is connected. Next step is controlled draft invoice sync."
                  : "Start the Xero OAuth connection once credentials and add-on are ready."}
              </p>
            </div>

            <div className="freshXeroHeadActions">
              {!connected && (
                <button type="button" onClick={connectXero} disabled={busy || loading || !configured || !addonActive}>
                  {busy ? "Opening Xero..." : "Connect to Xero"}
                </button>
              )}
              {connected && (
                <button type="button" onClick={disconnectXero} disabled={busy}>
                  Disconnect Xero
                </button>
              )}
              <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
              <button type="button" onClick={() => onNavigate?.("plans")}>Open Plans</button>
            </div>
          </div>

          <div className="freshXeroCards">
            <section>
              <span>Connection</span>
              <b>{connected ? "Live" : "Not connected"}</b>
              <p>{connected ? "Tenant ID stored. Tokens are hidden from the app UI." : "No Xero tenant is connected yet."}</p>
            </section>

            <section>
              <span>Invoice sync</span>
              <b>{settings.invoice_sync_enabled ? "Enabled" : "Approval first"}</b>
              <p>Keep sync disabled until a draft invoice sync proof passes.</p>
            </section>

            <section>
              <span>Payment status</span>
              <b>{settings.payment_sync_enabled ? "Enabled" : "Later"}</b>
              <p>Payment read-back should be tested after invoice draft sync is proven.</p>
            </section>
          </div>

          <div className="freshXeroForm">
            <label>
              <span>Configured</span>
              <input readOnly value={configured ? "Yes" : "No"} />
            </label>
            <label>
              <span>Add-on active</span>
              <input readOnly value={addonActive ? "Yes" : "No"} />
            </label>
            <label>
              <span>Connected</span>
              <input readOnly value={connected ? "Yes" : "No"} />
            </label>
            <label>
              <span>Organisation</span>
              <input readOnly value={connection?.tenant_name || ""} />
            </label>
            <label className="wide">
              <span>Required env</span>
              <textarea readOnly value={(status?.required_env || []).join("\\n")} />
            </label>
          </div>

          <div className="freshXeroActions">
            <button type="button" onClick={loadStatus}>Reload status</button>
            <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
            <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
          </div>
        </article>
      </div>
    </section>
  );
}
