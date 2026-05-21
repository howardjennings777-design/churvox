// Churvox plan catalogue — SINGLE SOURCE OF TRUTH for the public site.
// Note: backend may use older plan ids internally; this file is for marketing display only.

export const CHURVOX_PLANS = [
  {
    id: "start",
    name: "Start",
    priceMonthly: 39,
    tagline: "For solo operators getting set up.",
    activeTeam: "1 active team member",
    features: [
      "Jobs, clients, quotes, invoices",
      "Photos & proof from the field",
      "Public invoice & quote links",
      "AI Operator Front Desk — approval-first",
      "Mobile worker app",
    ],
    cta: "Start free trial",
    highlight: false,
  },
  {
    id: "crew",
    name: "Crew",
    priceMonthly: 89,
    tagline: "For small crews running a daily run sheet.",
    activeTeam: "Up to 5 active team members",
    features: [
      "Everything in Start",
      "Dispatch & worker assignment",
      "Job conflict warnings",
      "Time tracking + simple timesheets",
      "Owner approval queue for AI actions",
    ],
    cta: "Start free trial",
    highlight: false,
  },
  {
    id: "operator",
    name: "Operator",
    priceMonthly: 149,
    tagline: "AI Operator does the admin. You approve.",
    activeTeam: "Up to 12 active team members",
    features: [
      "Everything in Crew",
      "AI invoice / quote / follow-up drafting",
      "Smart dispatch suggestions",
      "Payroll workspace (export & handoff)",
      "Reports & owner-only money desk",
      "MYOB optional add-on (+$39/mo)",
    ],
    cta: "Start free trial",
    highlight: true,
    badge: "Most popular",
  },
  {
    id: "command",
    name: "Command",
    priceMonthly: 299,
    tagline: "Full Front Desk for growing operators.",
    activeTeam: "Up to 25 active team members",
    features: [
      "Everything in Operator",
      "MYOB sync included (approval-first)",
      "Auto-send categories (advanced)",
      "Office Admin + Payroll role separation",
      "Priority Churvox support",
      "Audit log + safety rails",
    ],
    cta: "Start free trial",
    highlight: false,
  },
];

export const CHURVOX_ADDONS = [
  {
    id: "growth-pack",
    title: "Command Growth Pack",
    price: 99,
    description:
      "Add capacity to Command for larger crews — more active team members and extended AI Operator volume.",
    appliesTo: "Command",
  },
  {
    id: "myob",
    title: "MYOB add-on",
    price: 39,
    description:
      "Approval-first MYOB sync for Operator. Push approved invoices & contacts — nothing auto-syncs without you.",
    appliesTo: "Operator (included free in Command)",
  },
  {
    id: "sms",
    title: "SMS credits",
    price: null,
    priceLabel: "From $10",
    description:
      "Optional SMS reminders & client updates. Pay for what you use, top up any time. No active sends without owner approval.",
    appliesTo: "All plans",
  },
];

export const GST_NOTE = "All prices in NZD per month, ex GST. Cancel any time.";
