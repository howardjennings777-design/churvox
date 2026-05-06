import React from "react";
import Layout from "../components/Layout";
import { MessageSquare, Clock3, ShieldCheck, Mail, Bell, Sparkles } from "lucide-react";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumBadge, PremiumAIBox, PremiumActionCard,
} from "../components/premium";
import { useNavigate } from "react-router-dom";

export default function SMSPage() {
  const navigate = useNavigate();
  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<MessageSquare className="h-7 w-7" />}
          eyebrow={<><Bell className="h-3 w-3" /> Communications</>}
          title="Communications"
          subtitle="Email reminders and in-app notifications are running. SMS reminders are coming soon — we’re polishing the provider, message history and audit log."
        />

        <PremiumAIBox
          title="AI Communication Assistant"
          subtitle="Drafts polite reminders for invoices, quotes and job updates — review and approve before sending"
          chip="Approval-first"
          notice="Auto-send is OFF. AI prepared this for review."
          suggestions={[
            { icon: <Mail className="h-4 w-4" />, title: "Email reminders are live", description: "Use Invoices and Quotes to draft polite reminders." },
            { icon: <Bell className="h-4 w-4" />, title: "In-app notifications", description: "Workers and admins get instant alerts on assigned jobs." },
            { icon: <MessageSquare className="h-4 w-4" />, title: "SMS reminders — coming soon", description: "We’re finalising provider billing and message history." },
          ]}
        />

        <div className="px-grid px-grid--3">
          <PremiumCard
            title="Email reminders"
            icon={<Mail className="h-4 w-4" />}
            subtitle="Live"
            actions={<PremiumBadge tone="green" icon={<ShieldCheck className="h-3 w-3" />}>Active</PremiumBadge>}
          >
            <p className="text-[13px] text-[#5b6c87]">Send polite payment reminders, quote follow-ups and job confirmations directly from invoice and quote pages.</p>
          </PremiumCard>

          <PremiumCard
            title="In-app notifications"
            icon={<Bell className="h-4 w-4" />}
            subtitle="Live"
            actions={<PremiumBadge tone="green" icon={<ShieldCheck className="h-3 w-3" />}>Active</PremiumBadge>}
          >
            <p className="text-[13px] text-[#5b6c87]">Workers and admins get real-time notifications for job assignments, status changes and customer activity.</p>
          </PremiumCard>

          <PremiumCard
            title="SMS reminders"
            icon={<MessageSquare className="h-4 w-4" />}
            subtitle="Coming soon"
            actions={<PremiumBadge tone="amber" icon={<Clock3 className="h-3 w-3" />}>Coming soon</PremiumBadge>}
          >
            <p className="text-[13px] text-[#5b6c87]">We’ve intentionally disabled SMS sending until provider billing, audit logs and message history are production-grade. We’ll notify you when it goes live.</p>
          </PremiumCard>
        </div>

        <div className="px-grid px-grid--3">
          <PremiumActionCard tone="blue"   icon={<Sparkles className="h-5 w-5" />} title="Open AI assistant" description="Draft messages on Smart Hub" onClick={() => navigate("/dashboard")} />
          <PremiumActionCard tone="amber"  icon={<MessageSquare className="h-5 w-5" />} title="Invoice reminders" description="Draft a polite payment reminder" onClick={() => navigate("/invoices")} />
          <PremiumActionCard tone="violet" icon={<MessageSquare className="h-5 w-5" />} title="Quote follow-ups" description="Nudge stale quotes" onClick={() => navigate("/quotes")} />
        </div>
      </PremiumPage>
    </Layout>
  );
}
