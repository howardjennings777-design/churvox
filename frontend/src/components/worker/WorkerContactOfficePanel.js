import React, { useEffect, useMemo, useState } from "react";
import { Building2, Mail, Phone, Copy, LifeBuoy, Send, X } from "lucide-react";
import { PremiumButton, PremiumCard } from "@/components/premium";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import "./WorkerContactOfficePanel.css";

function requestId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {}
  return `worker-help-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function WorkerContactOfficePanel({ open, onClose, defaultMessage = "", jobId = "", jobTitle = "" }) {
  const { get, post } = useApi();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("Your Office");
  const [contacts, setContacts] = useState([]);
  const [officeMessage, setOfficeMessage] = useState("");
  const [message, setMessage] = useState(defaultMessage || "");
  const [sending, setSending] = useState(false);

  useEffect(() => { setMessage(defaultMessage || ""); }, [defaultMessage]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const res = await get("/worker/office-contact");
      if (res?.success) {
        const payload = res.data || {};
        setBusinessName(payload.business_name || "Your Office");
        setContacts(Array.isArray(payload.contacts) ? payload.contacts : []);
        setOfficeMessage(payload.message || "");
      }
      setLoading(false);
    };
    load();
  }, [open, get]);

  const hasContacts = useMemo(() => contacts.length > 0, [contacts]);

  const sendHelpRequest = async () => {
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage || sending) return;

    setSending(true);
    const clientRequestId = requestId();
    const workerContext = {
      request_id: clientRequestId,
      source_id: clientRequestId,
      message: cleanMessage,
      update: cleanMessage,
      update_type: "worker_help_request",
      status: "Top priority",
      job_id: jobId || "",
      job_title: jobTitle || "",
      worker_id: user?.id || user?._id || user?.worker_id || "",
      worker_name: user?.name || user?.full_name || "",
      worker_email: user?.email || "",
    };

    let officeOk = false;
    let commandOk = false;
    let officeError = "";
    let commandError = "";

    try {
      const officeRes = await post("/worker/contact-office", workerContext);
      officeOk = !!officeRes?.success;
      officeError = officeRes?.error || "Could not save the office request";

      const commandRes = await post("/command/worker-update-request", workerContext);
      commandOk = !!commandRes?.success;
      commandError = commandRes?.error || "Could not place the request in Command";

      if (officeOk && commandOk) {
        toast.success("Help request sent to the office and Command");
        setMessage("");
        onClose?.();
      } else if (officeOk) {
        toast.success("Help request reached the office");
        setMessage("");
        onClose?.();
      } else if (commandOk) {
        toast.success("Help request sent to Command");
        setMessage("");
        onClose?.();
      } else {
        toast.error(commandError || officeError || "Could not send the help request");
      }
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="workerContactOfficeBackdrop fixed inset-0 z-50 bg-[rgba(0,0,0,0.65)] backdrop-blur-[1px] p-3 sm:p-6 flex items-end sm:items-center justify-center" onClick={onClose}>
      <PremiumCard className="workerContactOfficeCard w-full max-w-lg max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="workerContactOfficeBody px-card__body space-y-3">
          <div className="workerContactOfficeHead flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cx-accent)]">Contact office</p>
              <p className="font-bold text-[var(--cx-text)] flex items-center gap-2"><Building2 className="h-4 w-4" />{businessName}</p>
            </div>
            <button className="workerContactOfficeClose px-btn px-btn--ghost px-btn--sm" onClick={onClose} aria-label="Close contact panel"><X className="h-4 w-4" /></button>
          </div>

          {loading ? <p className="text-sm text-[var(--cx-muted)]">Loading office contacts…</p> : null}

          {!loading && !hasContacts ? (
            <div className="workerContactOfficeNotice rounded-xl border border-[var(--cx-border)] bg-[var(--cx-surface-2)] p-3">
              <p className="text-sm font-semibold text-[var(--cx-text)]">{officeMessage || "No office contact has been set yet."}</p>
              <p className="text-sm text-[var(--cx-muted)]">You can still send a message. It will be saved for the office and placed in Command for the owner to review.</p>
            </div>
          ) : null}

          {hasContacts ? <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cx-accent)]">Primary office contact</p> : null}
          {contacts.map((contact, idx) => (
            <div key={`${contact.email || contact.phone || contact.name}-${idx}`} className="workerContactOfficeContact rounded-xl border border-[var(--cx-border)] p-3 space-y-2">
              <p className="font-semibold text-[var(--cx-text)]">{contact.name}</p>
              <p className="text-xs text-[var(--cx-muted)]">{contact.role || "Office"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {contact.phone ? <a href={`tel:${contact.phone}`}><PremiumButton className="w-full" variant="secondary" iconLeft={<Phone className="h-4 w-4" />}>Call</PremiumButton></a> : null}
                {contact.email ? <a href={`mailto:${contact.email}`}><PremiumButton className="w-full" variant="secondary" iconLeft={<Mail className="h-4 w-4" />}>Email</PremiumButton></a> : null}
                {contact.email ? <PremiumButton className="w-full" variant="secondary" iconLeft={<Copy className="h-4 w-4" />} onClick={async () => { await navigator.clipboard.writeText(contact.email); toast.success("Email copied"); }}>Copy email</PremiumButton> : null}
              </div>
            </div>
          ))}

          <div className="workerContactOfficeHelp rounded-xl border border-[var(--cx-border)] p-3 space-y-2">
            <p className="text-sm font-semibold text-[var(--cx-text)] flex items-center gap-1"><LifeBuoy className="h-4 w-4" />Need help now?</p>
            <textarea rows={4} className="workerContactOfficeTextarea px-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell the office what you need help with" />
            <PremiumButton className="workerContactOfficeSend w-full" onClick={sendHelpRequest} disabled={sending || !message.trim()} iconLeft={<Send className="h-4 w-4" />}>
              {sending ? "Sending..." : "Send help request"}
            </PremiumButton>
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}
