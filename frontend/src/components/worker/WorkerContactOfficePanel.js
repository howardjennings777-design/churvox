import React, { useEffect, useMemo, useState } from "react";
import { Building2, Mail, Phone, Copy, LifeBuoy, Send, X } from "lucide-react";
import { PremiumButton, PremiumCard } from "@/components/premium";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { sendFreshSlipToCommand } from "@/churvox-fresh/commandBridge";
import { useAuth } from "@/context/AuthContext";
import "./WorkerContactOfficePanel.css";

export default function WorkerContactOfficePanel({ open, onClose, defaultMessage = "I need help with my jobs", jobId = "", jobTitle = "" }) {
  const { get, post } = useApi();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("Your Office");
  const [contacts, setContacts] = useState([]);
  const [officeMessage, setOfficeMessage] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);

  useEffect(() => { setMessage(defaultMessage || "I need help with my jobs"); }, [defaultMessage]);

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
    if (!cleanMessage) return;

    setSending(true);

    let officeOk = false;
    let commandOk = false;
    let officeError = "";

    try {
      const res = await post("/worker/contact-office", {
        message: cleanMessage,
        job_id: jobId || undefined,
        job_title: jobTitle || undefined,
      });

      officeOk = !!res?.success;
      officeError = res?.error || "Could not send office request";

      try {
        await sendFreshSlipToCommand({
          id: `worker-help-${jobId || "general"}-${Date.now()}`,
          group: "Worker messages",
          title: jobTitle ? `Worker needs help: ${jobTitle}` : "Worker needs help",
          info: jobTitle || "General worker help request",
          urgency: "High",
          found: `${user?.name || user?.email || "A worker"} sent a help request from the worker app.`,
          prepared: cleanMessage,
          why: "The owner needs to see worker blockers quickly so jobs do not stall in the field.",
          owner: "Open the job if linked, contact the worker, then mark this handled.",
          area: "Workers",
          page: jobId ? "jobs" : "team",
          sourceType: "worker_help",
          sourceId: jobId || "",
          actionType: "worker_help_request",
          payload: {
            message: cleanMessage,
            job_id: jobId || "",
            job_title: jobTitle || "",
            worker_id: user?.id || user?._id || user?.worker_id || "",
            worker_name: user?.name || user?.full_name || "",
            worker_email: user?.email || "",
          },
        }, { type: "worker-contact-office" });
        commandOk = true;
      } catch (_) {
        commandOk = false;
      }

      if (officeOk || commandOk) {
        toast.success(commandOk ? "Help request sent to Command" : "Help request sent");
        onClose?.();
      } else {
        toast.error(officeError);
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
              <p className="text-sm text-[var(--cx-muted)]">Ask your manager to add office contact details.</p>
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
