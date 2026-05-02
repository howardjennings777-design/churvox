import React, { useEffect, useMemo, useState } from "react";
import { Building2, Mail, Phone, Copy, LifeBuoy, Send, X } from "lucide-react";
import { PremiumButton, PremiumCard } from "@/components/premium";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

export default function WorkerContactOfficePanel({ open, onClose, defaultMessage = "I need help with my jobs", jobId = "", jobTitle = "" }) {
  const { get, post } = useApi();
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1b34]/45 backdrop-blur-[1px] p-3 sm:p-6 flex items-end sm:items-center justify-center" onClick={onClose}>
      <PremiumCard className="w-full max-w-lg max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-card__body space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2563eb]">Contact office</p>
              <p className="font-bold text-[#0d1b34] flex items-center gap-2"><Building2 className="h-4 w-4" />{businessName}</p>
            </div>
            <button className="px-btn px-btn--ghost px-btn--sm" onClick={onClose} aria-label="Close contact panel"><X className="h-4 w-4" /></button>
          </div>

          {loading ? <p className="text-sm text-[#5b6c87]">Loading office contacts…</p> : null}

          {!loading && !hasContacts ? (
            <div className="rounded-xl border border-[#dbe6f5] bg-[#f8fbff] p-3">
              <p className="text-sm font-semibold text-[#0d1b34]">{officeMessage || "No office contact has been set yet."}</p>
              <p className="text-sm text-[#5b6c87]">Ask your manager to add office contact details.</p>
            </div>
          ) : null}

          {hasContacts ? <p className="text-xs font-semibold uppercase tracking-wide text-[#2563eb]">Primary office contact</p> : null}
          {contacts.map((contact, idx) => (
            <div key={`${contact.email || contact.phone || contact.name}-${idx}`} className="rounded-xl border border-[#dbe6f5] p-3 space-y-2">
              <p className="font-semibold text-[#0d1b34]">{contact.name}</p>
              <p className="text-xs text-[#5b6c87]">{contact.role || "Office"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {contact.phone ? <a href={`tel:${contact.phone}`}><PremiumButton className="w-full" variant="secondary" iconLeft={<Phone className="h-4 w-4" />}>Call</PremiumButton></a> : null}
                {contact.email ? <a href={`mailto:${contact.email}`}><PremiumButton className="w-full" variant="secondary" iconLeft={<Mail className="h-4 w-4" />}>Email</PremiumButton></a> : null}
                {contact.email ? <PremiumButton className="w-full" variant="secondary" iconLeft={<Copy className="h-4 w-4" />} onClick={async () => { await navigator.clipboard.writeText(contact.email); toast.success("Email copied"); }}>Copy email</PremiumButton> : null}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-[#dbe6f5] p-3 space-y-2">
            <p className="text-sm font-semibold text-[#0d1b34] flex items-center gap-1"><LifeBuoy className="h-4 w-4" />Need help now?</p>
            <textarea rows={3} className="px-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell the office what you need help with" />
            <PremiumButton className="w-full" onClick={async () => {
              setSending(true);
              const res = await post("/worker/contact-office", { message, job_id: jobId || undefined, job_title: jobTitle || undefined });
              if (res?.success) toast.success(res.data?.message || "Help request sent");
              else toast.error(res?.error || "Could not send help request");
              setSending(false);
            }} disabled={sending || !message.trim()} iconLeft={<Send className="h-4 w-4" />}>
              {sending ? "Sending..." : "Send help request"}
            </PremiumButton>
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}
